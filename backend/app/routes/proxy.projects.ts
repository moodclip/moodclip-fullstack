// app/routes/proxy.projects.ts
import type {LoaderFunctionArgs} from "@remix-run/node";
import { Firestore, FieldPath } from "@google-cloud/firestore";
import { authenticate } from "../shopify.server";
import jwt from "jsonwebtoken";

const db = new Firestore();

/* ---------------- CORS (permissive for CA sandbox/CDN) ---------------- */
function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? '*';
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-Token',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
    'Content-Type': 'application/json',
  };
}
const ok = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders(req) });
const fail = (req: Request, status: number, msg: string) => ok(req, { error: msg }, status);

/* ---------------- Auth helpers (hardened CA token parsing) ---------------- */

function normalizeCustomerIdStr(s?: string | null): string | undefined {
  if (!s) return undefined;
  const str = String(s);
  if (/^\d+$/.test(str)) return str;
  const m = str.match(/Customer\/(\d+)/i) || str.match(/(\d{5,})$/);
  return m ? m[1] : undefined;
}

function normalizeShopHost(h?: string | null): string | undefined {
  if (!h) return undefined;
  let host = String(h).toLowerCase();
  try { host = new URL(host).host; } catch { /* keep as-is if not a URL */ }
  if (host.endsWith(".account.myshopify.com")) {
    const store = host.split(".account.myshopify.com")[0];
    host = `${store}.myshopify.com`;
  }
  return host || undefined;
}

function decodeJwtPayload(token: string): any | null {
  try {
    const [, payload] = token.split('.');
    return JSON.parse(Buffer.from(payload || '', 'base64').toString('utf8'));
  } catch {
    return null;
  }
}

function decodeCustomerJWT(token: string) {
  const secret = process.env.SHOPIFY_API_SECRET || process.env.SHOPIFY_APP_SECRET || '';
  if (secret) {
    try {
      const payload: any = jwt.verify(token, secret, { algorithms: ['HS256'] });
      return {
        shop: normalizeShopHost(payload.dest || payload.iss),
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

  return {
    shop: normalizeShopHost(payload.dest || payload.iss),
    customerId,
    via: 'jwt:decoded',
  };
}

async function tryCustomerToken(request: Request) {
  const auth = request.headers.get('authorization') || request.headers.get('Authorization') || '';
  const m = auth.match(/^Bearer\s+(.+)$/i);
  const headerToken = m ? m[1] : null;
  const xSession = request.headers.get('x-session-token') || request.headers.get('X-Session-Token') || null;
  const qToken = new URL(request.url).searchParams.get('token');
  const token = headerToken || xSession || qToken;
  if (!token) return null;
  return decodeCustomerJWT(token);
}

async function tryAppProxyAuth(request: Request) {
  try {
    await authenticate.public.appProxy(request);
  } catch {
    return null;
  }
  const u = new URL(request.url);
  const raw =
    u.searchParams.get('logged_in_customer_id') ||
    request.headers.get('X-Shopify-Logged-In-Customer-Id') ||
    request.headers.get('X-Shopify-Customer-Id') ||
    '';
  const customerId = normalizeCustomerIdStr(raw);
  return customerId ? { customerId, via: 'app-proxy' as const } : null;
}

/* ---------------- Pagination helpers ---------------- */

const CURSOR_VERSION = 1;

interface CursorPayload {
  v: number;
  id: string;
  createdAt: string;
}

const encodeCursor = (cursor: CursorPayload): string =>
  Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');

const decodeCursor = (raw: string | null): CursorPayload | null => {
  if (!raw) return null;
  try {
    const decoded = JSON.parse(Buffer.from(raw, 'base64url').toString('utf8')) as CursorPayload;
    if (decoded && decoded.v === CURSOR_VERSION && decoded.id && decoded.createdAt) {
      return decoded;
    }
  } catch {
    return null;
  }
  return null;
};

const tsToIso = (value: any): string | null => {
  try {
    if (value?.toDate) return value.toDate().toISOString();
    if (value instanceof Date) return value.toISOString();
    if (typeof value === 'string') {
      const date = new Date(value);
      if (!Number.isNaN(date.getTime())) return date.toISOString();
    }
    if (typeof value === 'number' && Number.isFinite(value)) {
      return new Date(value).toISOString();
    }
    return null;
  } catch {
    return null;
  }
};

type ProjectRecord = {
  id: string;
  item: {
    id: string;
    title: string;
    status: string | null;
    createdAt: string | null;
  };
  sortKey: number;
  cursorCreatedAt: string;
};

const toRecord = (doc: FirebaseFirestore.QueryDocumentSnapshot): ProjectRecord => {
  const data = doc.data() as any;
  const createdAtSource = data?.createdAt ?? null;
  let createdAtTimestamp: FirebaseFirestore.Timestamp | null = null;

  if (createdAtSource?.toDate) {
    createdAtTimestamp = createdAtSource as FirebaseFirestore.Timestamp;
  } else if (createdAtSource instanceof Date) {
    createdAtTimestamp = Firestore.Timestamp.fromDate(createdAtSource);
  } else if (typeof createdAtSource === 'string') {
    const parsed = new Date(createdAtSource);
    if (!Number.isNaN(parsed.getTime())) {
      createdAtTimestamp = Firestore.Timestamp.fromDate(parsed);
    }
  } else if (typeof createdAtSource === 'number' && Number.isFinite(createdAtSource)) {
    createdAtTimestamp = Firestore.Timestamp.fromMillis(createdAtSource);
  }

  if (!createdAtTimestamp && doc.createTime) {
    createdAtTimestamp = doc.createTime;
  }

  const createdAtIso = createdAtTimestamp
    ? createdAtTimestamp.toDate().toISOString()
    : tsToIso(createdAtSource) ?? tsToIso(doc.createTime) ?? null;

  const item = {
    id: doc.id,
    title: data?.title || data?.fileName || doc.id,
    status: data?.status ?? null,
    createdAt: createdAtIso,
  };

  const sortKey = createdAtIso ? Date.parse(createdAtIso) : Date.now();
  const cursorCreatedAt = createdAtIso ?? new Date().toISOString();

  return {
    id: doc.id,
    item,
    sortKey,
    cursorCreatedAt,
  };
};

const mergeRecords = (records: ProjectRecord[]): ProjectRecord[] => {
  const map = new Map<string, ProjectRecord>();
  for (const record of records) {
    const existing = map.get(record.id);
    if (!existing || existing.sortKey < record.sortKey) {
      map.set(record.id, record);
    }
  }
  return Array.from(map.values()).sort((a, b) => {
    if (b.sortKey !== a.sortKey) return b.sortKey - a.sortKey;
    return b.id.localeCompare(a.id);
  });
};

const filterAfterCursor = (
  records: ProjectRecord[],
  cursorSortKey: number | null,
  cursorId: string | null,
): ProjectRecord[] => {
  if (cursorSortKey === null) return records;
  return records.filter((record) => {
    if (record.sortKey < cursorSortKey) return true;
    if (record.sortKey > cursorSortKey) return false;
    if (!cursorId) return false;
    // sort order is descending by id, so include only IDs that would come after the cursor
    return record.id.localeCompare(cursorId) < 0;
  });
};

const buildResponse = (req: Request, records: ProjectRecord[], limit: number) => {
  const limited = records.slice(0, limit);
  const hasMore = records.length > limit;
  const nextRecord = hasMore ? limited[limited.length - 1] : null;
  return ok(req, {
    projects: limited.map((record) => record.item),
    nextCursor: nextRecord
      ? encodeCursor({ v: CURSOR_VERSION, id: nextRecord.id, createdAt: nextRecord.cursorCreatedAt })
      : null,
  });
};

/* ---------------- Loader ---------------- */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if (request.method === 'HEAD') return ok(request, { status: 'ok' });
  if (request.method !== 'GET') return fail(request, 405, 'method_not_allowed');

  const bearer = await tryCustomerToken(request);
  const ap = bearer ? null : await tryAppProxyAuth(request);
  const auth = bearer || ap;
  if (!auth?.customerId) return fail(request, 401, 'auth_required');

  const u = new URL(request.url);
  const limit = Math.max(1, Math.min(Number(u.searchParams.get('limit') || '30'), 50));
  const cursorRaw = decodeCursor(u.searchParams.get('cursor'));
  const cursorId = cursorRaw?.id ?? null;
  const cursorTimestamp = cursorRaw?.createdAt ? new Date(cursorRaw.createdAt) : null;
  const cursorSortKey = cursorTimestamp && !Number.isNaN(cursorTimestamp.getTime()) ? cursorTimestamp.getTime() : null;
  const cursorTs = cursorSortKey !== null ? Firestore.Timestamp.fromMillis(cursorSortKey) : null;

  const col = db.collection('projects');
  const byOwner = col.where('owner', '==', auth.customerId);
  const byOwner2 = col.where('ownerCustomerId', '==', auth.customerId);

  const applyCursor = (
    query: FirebaseFirestore.Query<FirebaseFirestore.DocumentData>,
  ) => {
    let q = query.orderBy('createdAt', 'desc').orderBy(FieldPath.documentId(), 'desc');
    if (cursorTs && cursorId) {
      q = q.startAfter(cursorTs, cursorId);
    }
    return q;
  };

  try {
    const [snap1, snap2] = await Promise.all([
      applyCursor(byOwner).limit(limit + 1).get(),
      applyCursor(byOwner2).limit(limit + 1).get(),
    ]);

    const records = mergeRecords([
      ...snap1.docs.map(toRecord),
      ...snap2.docs.map(toRecord),
    ]);

    return buildResponse(request, records, limit);
  } catch (e: any) {
    const msg = String(e?.message || '');
    const needIndex = e?.code === 9 || /requires an index/i.test(msg);
    if (!needIndex) {
      return fail(request, 500, 'query_failed');
    }

    const [snap1, snap2] = await Promise.all([
      byOwner.limit(limit + 1).get(),
      byOwner2.limit(limit + 1).get(),
    ]);

    let records = mergeRecords([
      ...snap1.docs.map(toRecord),
      ...snap2.docs.map(toRecord),
    ]);

    records = filterAfterCursor(records, cursorSortKey, cursorId);

    return buildResponse(request, records, limit);
  }
};
