// app/routes/proxy.clip.$videoId.ts
import type { ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { z } from 'zod';
import { PubSub } from '@google-cloud/pubsub';
import { db, FieldValue, Timestamp } from '~/firebase.server';
import shopify from '~/shopify.server';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const pubsub = new PubSub();

// Guardrails
const MIN_CLIP_SECONDS = Number(process.env.MIN_CLIP_SECONDS ?? 0.5);
const MAX_CLIP_SECONDS = Number(process.env.MAX_CLIP_SECONDS ?? 120);
const END_GUARD_SECONDS = 0.05;

const normalizeShop = (host: string | null | undefined): string => {
  const raw = (host || '').toLowerCase();
  const match = raw.match(/^([^.]+)\.account\.myshopify\.com$/);
  return match ? `${match[1]}.myshopify.com` : raw;
};

const normalizeCustomerIdStr = (value?: string | null): string | undefined => {
  if (!value) return undefined;
  const str = String(value);
  if (/^\d+$/.test(str)) return str;
  const match = str.match(/Customer\/(\d+)/i) || str.match(/(\d{5,})$/);
  return match ? match[1] : undefined;
};

const decodeJwtPayload = (token: string): any | null => {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(Buffer.from(payload || '', 'base64').toString('utf8'));
  } catch {
    return null;
  }
};

const decodeCustomerJWT = (token: string) => {
  const secret = process.env.SHOPIFY_API_SECRET || process.env.SHOPIFY_APP_SECRET || '';
  if (secret) {
    try {
      const payload: any = jwt.verify(token, secret, { algorithms: ['HS256'] });
      return {
        customerId: normalizeCustomerIdStr(payload.sub),
        via: 'jwt:hs256',
      };
    } catch {
      /* fall through */
    }
  }

  const payload: any = decodeJwtPayload(token);
  if (!payload) return null;

  const now = Math.floor(Date.now() / 1000);
  if (typeof payload.exp === 'number' && payload.exp < now) return null;
  if (typeof payload.iat === 'number' && Math.abs(now - payload.iat) > 10 * 60) return null;

  const customerId = normalizeCustomerIdStr(payload.sub);
  if (!customerId) return null;

  return { customerId, via: 'jwt:decoded' as const };
};

const resolveCustomerContext = async (request: Request) => {
  const url = new URL(request.url);
  const inlineId = normalizeCustomerIdStr(
    url.searchParams.get('logged_in_customer_id') ||
      request.headers.get('X-Shopify-Logged-In-Customer-Id') ||
      request.headers.get('X-Shopify-Customer-Id') ||
      null,
  );
  if (inlineId) {
    return { customerId: inlineId, via: 'app-proxy' as const };
  }

  const auth = request.headers.get('authorization') || request.headers.get('Authorization') || '';
  const match = auth.match(/^Bearer\s+(.+)$/i);
  const headerToken = match ? match[1] : null;
  const xSession = request.headers.get('x-session-token') || request.headers.get('X-Session-Token');
  const queryToken = url.searchParams.get('token');
  const token = headerToken || xSession || queryToken;
  if (token) {
    return decodeCustomerJWT(token);
  }

  return null;
};

class ForbiddenClipError extends Error {
  status = 403;
  slug = 'not_owner';
}

/* ---------- validation schema ---------- */
const ClipRequestSchema = z
  .object({
    start: z.number().min(0, { message: 'Start must be ≥ 0' }),
    end: z.number().gt(0, { message: 'End must be positive' }),
  })
  .refine((v) => v.end > v.start, {
    message: 'End must be after start',
    path: ['end'],
  });

/** Decide if the numbers are centiseconds by comparing against transcript duration. */
async function normalizeTimesToSeconds(
  videoId: string,
  start: number,
  end: number,
): Promise<{ start: number; end: number; units: 's' | 'cs' }> {
  let units: 's' | 'cs' = 's';
  let s = start;
  let e = end;

  try {
    const projectSnap = await db.doc(`projects/${videoId}`).get();
    const durationSec = Number(projectSnap.get('durationSec')) || null;

    if (durationSec && e > durationSec * 1.5) {
      units = 'cs';
    } else if (!durationSec) {
      if (Number.isInteger(s) && Number.isInteger(e) && (e > 600 || s > 600)) {
        units = 'cs';
      }
    }

    if (units === 'cs') {
      s = s / 100;
      e = e / 100;
    }
  } catch (_) {
    if (Number.isInteger(s) && Number.isInteger(e) && (e > 600 || s > 600)) {
      units = 'cs';
      s = s / 100;
      e = e / 100;
    }
  }

  return { start: s, end: e, units };
}

/* ---------- action handler ---------- */
export const action = async ({ request, params }: ActionFunctionArgs) => {
  let shopDomain: string | null = null;
  try {
    const { session } = await shopify.authenticate.public.appProxy(request);
    shopDomain = session?.shop ?? null;
  } catch (err) {
    console.error('[proxy.clip] App-proxy HMAC verification failed', err);
    throw err;
  }

  if (!shopDomain) {
    const qsShop = new URL(request.url).searchParams.get('shop');
    if (qsShop) shopDomain = qsShop;
  }
  if (!shopDomain) return json({ error: 'Cannot determine shop' }, { status: 400 });

  const customer = await resolveCustomerContext(request);
  const customerId = normalizeCustomerIdStr(customer?.customerId);
  if (!customerId) {
    return json({ error: 'auth_required' }, { status: 401 });
  }

  const normalizedShop = normalizeShop(shopDomain);

  const { videoId } = params;
  if (!videoId) return json({ error: 'Missing videoId' }, { status: 400 });

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed' }, { status: 405 });
  }

  let start: number | undefined;
  let end: number | undefined;

  const tryJson = async () => {
    try {
      const body = await request.clone().json();
      start = body.start;
      end = body.end;
    } catch (_) {}
  };

  const tryForm = async () => {
    try {
      const txt = await request.clone().text();
      const body = new URLSearchParams(txt);
      if (body.has('start')) start = Number(body.get('start'));
      if (body.has('end')) end = Number(body.get('end'));
    } catch (_) {}
  };

  await tryJson();
  if (start === undefined || end === undefined) await tryForm();

  const parsed = ClipRequestSchema.safeParse({ start, end });
  if (!parsed.success) {
    return json({ error: 'Invalid payload', details: parsed.error.flatten() }, { status: 400 });
  }

  ({ start, end } = parsed.data);

  const norm = await normalizeTimesToSeconds(videoId, start, end);
  let startSec = norm.start;
  let endSec = norm.end;

  const projectRef = db.doc(`projects/${videoId}`);
  const clipRef = projectRef.collection('clips').doc(crypto.randomUUID());

  try {
    await db.runTransaction(async (tx) => {
      const projectSnap = await tx.get(projectRef);
      if (!projectSnap.exists) throw new Error('Project not found');

      const data = projectSnap.data() || {};
      const ownerCustomerId = normalizeCustomerIdStr(data.ownerCustomerId ?? data.owner ?? null);
      const ownerShop = normalizeShop(data.ownerShop ?? data.shop ?? data.shopDomain ?? null);
      if (!ownerCustomerId || ownerCustomerId !== customerId) {
        const err = new ForbiddenClipError('You do not have permission to modify this project.');
        err.slug = 'not_owner';
        throw err;
      }
      if (ownerShop && ownerShop !== normalizedShop) {
        const err = new ForbiddenClipError('Project belongs to a different shop domain.');
        err.slug = 'shop_mismatch';
        throw err;
      }

      const duration = Number(data.durationSec);
      if (Number.isFinite(duration) && duration > 0) {
        const upper = Math.max(0, duration - END_GUARD_SECONDS);
        if (startSec >= upper) {
          startSec = Math.max(0, upper - MIN_CLIP_SECONDS);
        }
        endSec = Math.min(endSec, startSec + MAX_CLIP_SECONDS, upper);
        if (endSec - startSec < MIN_CLIP_SECONDS) {
          endSec = Math.min(startSec + MIN_CLIP_SECONDS, upper);
        }
      } else {
        endSec = Math.min(endSec, startSec + MAX_CLIP_SECONDS);
        if (endSec - startSec < MIN_CLIP_SECONDS) {
          endSec = startSec + MIN_CLIP_SECONDS;
        }
        endSec = Math.max(0, endSec - END_GUARD_SECONDS);
      }

      tx.set(clipRef, {
        start: startSec,
        end: endSec,
        status: 'queued',
        owner: ownerCustomerId,
        requestedUnits: norm.units,
        requestedRaw: { start, end },
        createdAt: Timestamp.now(),
      });

      const status = data?.status;
      if (status !== 'rendering' && status !== 'completed') {
        tx.update(projectRef, { status: 'rendering' });
      }
      tx.update(projectRef, { queuedClipCount: FieldValue.increment(1) });
    });

    await pubsub.topic('render-requests').publishMessage({
      json: { clipId: clipRef.id, videoId, start: startSec, end: endSec, owner: customerId },
      orderingKey: videoId,
    });

    return json({ clipId: clipRef.id }, { status: 202, headers: { 'Retry-After': '3' } });
  } catch (err: any) {
    if (err instanceof ForbiddenClipError) {
      return json({ error: err.message, slug: err.slug }, { status: err.status });
    }

    console.error(`[proxy.clip] Failed to queue clip for ${videoId}:`, err);
    await clipRef.delete().catch(() => {});
    if (err.message === 'Project not found') {
      return json({ error: 'Project not found' }, { status: 404 });
    }
    return json({ error: 'Clip queue failed', slug: 'pubsub_failed' }, { status: 500 });
  }
};
