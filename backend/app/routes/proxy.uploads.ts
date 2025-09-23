// app/routes/proxy.uploads.ts
import type {LoaderFunctionArgs} from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { Storage } from "@google-cloud/storage";
import { Firestore, FieldValue } from "@google-cloud/firestore";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";

const db = new Firestore();

const CLAIM_TOKEN_BYTES = 24;

const hashClaimToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

const createClaimToken = () => {
  const token = crypto.randomBytes(CLAIM_TOKEN_BYTES).toString("base64url");
  return { token, hash: hashClaimToken(token) };
};

/* ---------------- CORS (permissive for CA sandbox/CDN) ---------------- */
// shared CORS helpers (inline in each route is fine)
function corsHeaders(req: Request) {
  const origin = req.headers.get('origin') ?? '*';
  return {
    'Access-Control-Allow-Origin': origin,           // echo caller
    'Access-Control-Allow-Methods': 'GET, OPTIONS, HEAD',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Session-Token',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
    'Content-Type': 'application/json',
  };
}
const ok = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: corsHeaders(req) });
const fail = (req: Request, status: number, msg: string) =>
  ok(req, { error: msg }, status);

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
  try { host = new URL(host).host; } catch {/* keep as-is if not a URL */}
  if (host.endsWith(".account.myshopify.com")) {
    const store = host.split(".account.myshopify.com")[0];
    host = `${store}.myshopify.com`;
  }
  return host || undefined;
}

function hostLooksLikeShopify(h: string): boolean {
  return !!h && (h.endsWith(".myshopify.com") || h === "admin.shopify.com");
}

function decodeJwtPayload(token: string): any | null {
  try {
    const [, payload] = token.split(".");
    return JSON.parse(Buffer.from(payload || "", "base64").toString("utf8"));
  } catch { return null; }
}

function decodeCustomerJWT(token: string) {
  // 1) Verify HS256 if applicable (legacy)
  const secret = process.env.SHOPIFY_API_SECRET || process.env.SHOPIFY_APP_SECRET || "";
  if (secret) {
    try {
      const p: any = jwt.verify(token, secret, { algorithms: ["HS256"] });
      // dest can be a bare host or URL – be tolerant
      let shop: string | undefined;
      try { shop = normalizeShopHost(p.dest || p.iss); } catch { shop = undefined; }
      return {
        shop,
        customerId: normalizeCustomerIdStr(p.sub),
        via: "jwt:hs256",
      };
    } catch {/* fall through */}
  }

  // 2) Safe decode RS256 CA tokens (time checks only)
  const p: any = decodeJwtPayload(token);
  if (!p) return null;

  let shop: string | undefined;
  try {
    const host = normalizeShopHost(p.dest || p.iss);
    if (host && hostLooksLikeShopify(host)) shop = host;
  } catch { shop = undefined; }

  const now = Math.floor(Date.now() / 1000);
  if (typeof p.exp === "number" && p.exp < now) return null;
  if (typeof p.iat === "number" && Math.abs(now - p.iat) > 10 * 60) return null;

  const customerId = normalizeCustomerIdStr(p.sub);
  if (!customerId) return null;

  return { shop, customerId, via: "jwt:decoded" };
}

async function tryCustomerToken(request: Request) {
  const auth = request.headers.get("authorization") || request.headers.get("Authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  const headerToken = m ? m[1] : null;
  const xSession = request.headers.get("x-session-token") || request.headers.get("X-Session-Token") || null;
  const qToken = new URL(request.url).searchParams.get("token");
  const token = headerToken || xSession || qToken;
  if (!token) return null;

  return decodeCustomerJWT(token);
}

async function tryAppProxyAuth(request: Request) {
  try {
    await authenticate.public.appProxy(request);
  } catch { return null; }

  const u = new URL(request.url);
  const shop = normalizeShopHost(
    u.searchParams.get("shop") || request.headers.get("X-Shopify-Shop-Domain") || ""
  );
  const rawCid =
    u.searchParams.get("logged_in_customer_id") ||
    request.headers.get("X-Shopify-Logged-In-Customer-Id") ||
    request.headers.get("X-Shopify-Customer-Id") ||
    "";
  const customerId = normalizeCustomerIdStr(rawCid);
  return customerId ? { shop, customerId, via: "app-proxy" } : null;
}

/* ---------------- Loader ---------------- */
export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") {
    // Always succeed preflight
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if (request.method === "HEAD") return ok(request, { status: "ok" });
  if (request.method !== "GET")  return fail(request, 405, "method_not_allowed");

  const url = new URL(request.url);
  const name = String(url.searchParams.get("name") || "video.mp4");
  const type = String(url.searchParams.get("type") || "video/mp4");
  const providedId = (url.searchParams.get("videoId") || "").toString().trim();

  const bucketName = process.env.GCS_BUCKET;
  if (!bucketName) return fail(request, 500, "missing_bucket");

  // Prefer direct Customer Accounts token; fall back to app-proxy HMAC if present
  const bearer = await tryCustomerToken(request);
  const ap = bearer ? null : await tryAppProxyAuth(request);
  const auth = bearer || ap;
  const isAuthed = Boolean(auth?.customerId);

  const videoId = providedId || crypto.randomUUID();
  const objectPath = `videos/${videoId}/source`;

  const claimToken = isAuthed ? null : createClaimToken();

  try {
    // 1) Create a V4 signed URL for direct upload (PUT)
    const storage = new Storage();
    const [signed] = await storage
      .bucket(bucketName)
      .file(objectPath)
      .getSignedUrl({
        version: "v4",
        action: "write",
        expires: Date.now() + 15 * 60 * 1000,
        contentType: type,
      });

    // 2) Index the project (owner → project mapping) so Projects page can read it immediately
    try {
      const ownerCustomerId = isAuthed && auth?.customerId ? String(auth.customerId) : null;
      const ownerShop = isAuthed ? auth?.shop || null : null;

      const payload: Record<string, any> = {
        fileName: name,
        type,
        status: "uploading", // your pipeline will advance this
        source: { bucket: bucketName, object: objectPath, contentType: type },
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      };

      if (isAuthed) {
        payload.ownerCustomerId = ownerCustomerId;
        payload.owner = ownerCustomerId;
        payload.ownerShop = ownerShop;
        payload.claimTokenHash = FieldValue.delete();
        payload.claimTokenIssuedAt = FieldValue.delete();
        payload.claimTokenLastSeen = FieldValue.delete();
      } else {
        payload.ownerCustomerId = null;
        payload.owner = null;
        payload.ownerShop = null;
        if (claimToken) {
          payload.claimTokenHash = claimToken.hash;
          payload.claimTokenIssuedAt = FieldValue.serverTimestamp();
          payload.claimTokenLastSeen = FieldValue.serverTimestamp();
        }
      }

      await db.collection("projects").doc(videoId).set(payload, { merge: true });
      const ownerLog = ownerCustomerId || "anonymous";
      console.log(`[proxy.uploads] indexed ${videoId} for owner ${ownerLog}`);
    } catch (e) {
      console.warn("[proxy.uploads] failed to index project in Firestore", e);
    }

    console.log("[proxy.uploads] ok", {
      videoId,
      owner: auth?.customerId || null,
      object: objectPath,
      type,
      via: auth?.via || (claimToken ? "claim-token" : "authed"),
    });

    return ok(request, {
      url: signed,
      videoId,
      claimToken: claimToken?.token ?? undefined,
    });
  } catch (e: any) {
    console.error("[proxy.uploads] error", e?.message || e);
    return fail(request, 500, "sign_failed");
  }
};
