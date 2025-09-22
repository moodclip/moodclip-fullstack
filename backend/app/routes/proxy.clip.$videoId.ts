// app/routes/proxy.clip.$videoId.ts
import type { ActionFunctionArgs } from '@remix-run/node';
import { json } from '@remix-run/node';
import { z } from 'zod';
import { PubSub } from '@google-cloud/pubsub';
import { db, FieldValue, Timestamp } from '~/firebase.server';
import shopify from '~/shopify.server';
import crypto from 'crypto';

const pubsub = new PubSub();

// Guardrails
const MIN_CLIP_SECONDS  = Number(process.env.MIN_CLIP_SECONDS ?? 0.5);   // keep at least a tiny length
const MAX_CLIP_SECONDS  = Number(process.env.MAX_CLIP_SECONDS ?? 120);   // hard cap per business rule
const END_GUARD_SECONDS = 0.05; // shave 50ms off the tail to avoid Transcoder off‑by‑frames

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
  // Default to seconds
  let units: 's' | 'cs' = 's';
  let s = start;
  let e = end;

  try {
    const projectSnap = await db.doc(`projects/${videoId}`).get();
    const durationSec = Number(projectSnap.get('durationSec')) || null;

    // Heuristic: AI suggestions may arrive in centiseconds.
    if (durationSec && e > durationSec * 1.5 /* >= 150% of seconds, likely cs */) {
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
  /* 1) Verify HMAC (Shopify App Proxy) */
  let shopDomain: string | null = null;
  try {
    const { session } = await shopify.authenticate.public.appProxy(request);
    shopDomain = session?.shop ?? null;
  } catch (err) {
    console.error('[proxy.clip] App-proxy HMAC verification failed', err);
    throw err; // Remix will 401/403
  }

  /* 2) Fallback shop from query string */
  if (!shopDomain) {
    const qsShop = new URL(request.url).searchParams.get('shop');
    if (qsShop) shopDomain = qsShop;
  }
  if (!shopDomain) return json({ error: 'Cannot determine shop' }, { status: 400 });

  /* 3) Validate videoId */
  const { videoId } = params;
  if (!videoId) return json({ error: 'Missing videoId' }, { status: 400 });

  /* 4) Accept only POST */
  if (request.method !== 'POST')
    return json({ error: 'Method not allowed' }, { status: 405 });

  /* 5) Parse JSON or form-encoded body */
  let start: number | undefined;
  let end: number | undefined;

  const tryJson = async () => {
    try {
      const b = await request.clone().json();
      start = b.start;
      end = b.end;
    } catch (_) {}
  };

  const tryForm = async () => {
    try {
      const txt = await request.clone().text();
      const params = new URLSearchParams(txt);
      if (params.has('start')) start = Number(params.get('start'));
      if (params.has('end')) end = Number(params.get('end'));
    } catch (_) {}
  };

  await tryJson();
  if (start === undefined || end === undefined) await tryForm();

  const parsed = ClipRequestSchema.safeParse({ start, end });
  if (!parsed.success)
    return json(
      { error: 'Invalid payload', details: parsed.error.flatten() },
      { status: 400 },
    );

  ({ start, end } = parsed.data);

  /* 6) Normalize units to seconds */
  const norm = await normalizeTimesToSeconds(videoId, start, end);

  // Clamp with a small tail guard so editList.endTimeOffset never exceeds input duration.
  let startSec = norm.start;
  let endSec = norm.end;

  try {
    const pSnap = await db.doc(`projects/${videoId}`).get();
    const d = Number(pSnap.get('durationSec'));
    if (Number.isFinite(d) && d > 0) {
      const upper = Math.max(0, d - END_GUARD_SECONDS);

      // Pull start back from tail if necessary
      if (startSec >= upper) {
        startSec = Math.max(0, upper - MIN_CLIP_SECONDS);
      }

      // hard cap length first
      endSec = Math.min(endSec, startSec + MAX_CLIP_SECONDS);
      // never exceed media duration (minus guard)
      endSec = Math.min(endSec, upper);

      // enforce minimal length
      if (endSec - startSec < MIN_CLIP_SECONDS) {
        endSec = Math.min(startSec + MIN_CLIP_SECONDS, upper);
      }
    } else {
      // Unknown duration: enforce cap and min with a conservative guard
      endSec = Math.min(endSec, startSec + MAX_CLIP_SECONDS);
      if (endSec - startSec < MIN_CLIP_SECONDS) {
        endSec = startSec + MIN_CLIP_SECONDS;
      }
      endSec = Math.max(0, endSec - END_GUARD_SECONDS);
    }
  } catch {
    endSec = Math.min(endSec, startSec + MAX_CLIP_SECONDS);
    if (endSec - startSec < MIN_CLIP_SECONDS) {
      endSec = startSec + MIN_CLIP_SECONDS;
    }
    endSec = Math.max(0, endSec - END_GUARD_SECONDS);
  }

  /* 7) Prepare Firestore refs / IDs */
  const clipId = crypto.randomUUID();
  const projectRef = db.doc(`projects/${videoId}`);
  const clipRef = projectRef.collection('clips').doc(clipId);

  try {
    /* 8) Transaction: write clip doc & bump counters */
    await db.runTransaction(async (tx) => {
      const projectSnap = await tx.get(projectRef);
      if (!projectSnap.exists) throw new Error('Project not found');

      tx.set(clipRef, {
        start: startSec,
        end: endSec,
        status: 'queued',
        owner: shopDomain,
        requestedUnits: norm.units,      // for debugging/traceability
        requestedRaw: { start, end },    // original values as received
        createdAt: Timestamp.now(),
      });

      const status = projectSnap.data()?.status;
      if (status !== 'rendering' && status !== 'completed') {
        tx.update(projectRef, { status: 'rendering' });
      }
      tx.update(projectRef, { queuedClipCount: FieldValue.increment(1) });
    });

    /* 9) Publish render job to Pub/Sub */
    await pubsub.topic('render-requests').publishMessage({
      json: { clipId, videoId, start: startSec, end: endSec, owner: shopDomain },
      orderingKey: videoId,
    });

    /* 10) Return 202 Accepted */
    return json({ clipId }, { status: 202, headers: { 'Retry-After': '3' } });
  } catch (err: any) {
    console.error(`[proxy.clip] Failed to queue clip for ${videoId}:`, err);
    await clipRef.delete().catch(() => {});
    if (err.message === 'Project not found')
      return json({ error: 'Project not found' }, { status: 404 });
    return json(
      { error: 'Clip queue failed', slug: 'pubsub_failed' },
      { status: 500 },
    );
  }
};

