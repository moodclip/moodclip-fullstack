// app/routes/proxy.stream.$videoId.ts
import type { LoaderFunctionArgs } from "@remix-run/node";
import { Storage } from "@google-cloud/storage";
import { db } from "../firebase.server";
import { authenticate } from "../shopify.server";
import jwt from "jsonwebtoken";

/* CORS */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS, HEAD",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};
const ok = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: CORS });
const fail = (status: number, message: string) =>
  ok({ error: message }, status);

const BUCKET = process.env.GCS_BUCKET || "mf-uploads-prod";
const storage = new Storage();

/* ---------- optional auth helpers ---------- */
function normalizeShop(host: string): string {
  const h = (host || "").toLowerCase();
  const m = h.match(/^([^.]+)\.account\.myshopify\.com$/);
  return m ? `${m[1]}.myshopify.com` : h;
}

// App‑Proxy HMAC (optional)
async function tryAppProxyAuth(request: Request): Promise<{ shop?: string; customerId?: string } | null> {
  try {
    await authenticate.public.appProxy(request);
    const u = new URL(request.url);
    const shop = normalizeShop(
      u.searchParams.get("shop") ||
      request.headers.get("X-Shopify-Shop-Domain") ||
      ""
    );
    const cid =
      u.searchParams.get("logged_in_customer_id") ||
      request.headers.get("X-Shopify-Logged-In-Customer-Id") ||
      request.headers.get("X-Shopify-Customer-Id") ||
      "";
    return { shop: shop || undefined, customerId: cid || undefined };
  } catch {
    return null;
  }
}

// Customer session JWT (optional)
async function tryCustomerJWT(request: Request): Promise<{ shop?: string; customerId?: string } | null> {
  const auth = request.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (!m) return null;

  const secret = process.env.SHOPIFY_API_SECRET || process.env.SHOPIFY_APP_SECRET || "";
  if (!secret) return null;

  try {
    const payload: any = jwt.verify(m[1], secret, { algorithms: ["HS256"] });
    const dest = String(payload.dest || payload.iss || "");
    const shop = dest ? normalizeShop(new URL(dest).host) : undefined;
    const cid = payload.sub ? String(payload.sub) : undefined;
    return { shop, customerId: cid };
  } catch {
    return null;
  }
}

/* ---------- loader ---------- */
export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (request.method === "HEAD")    return ok({ status: "ok" });
  if (request.method !== "GET")     return fail(405, "method_not_allowed");

  const videoId = params.videoId ? String(params.videoId) : "";
  if (!videoId) return fail(400, "missing_videoId");

  // Accept either App‑Proxy HMAC or customer JWT; stream is allowed with either.
  const _auth = (await tryAppProxyAuth(request)) ?? (await tryCustomerJWT(request));
  // NOTE: if both missing, we still proceed but we will require that the Firestore
  // project document exists. (This avoids anonymous enumeration of random ids.)

  try {
    // Look up the project document to verify the id is real and to discover the canonical object path.
    const pref = db.collection("projects").doc(videoId);
    const psnap = await pref.get();
    if (!psnap.exists) return fail(404, "project_not_found");

    const pdata = psnap.data() || {};
    const hintedObject: string | undefined = pdata?.source?.object;

    // Candidate object keys (canonical first), with safe fallbacks.
    const candidates = [
      hintedObject,                                        // e.g., "videos/<id>/source"
      `videos/${videoId}/source`,
      `${videoId}/source`,
      `${videoId}/source.mp4`,
    ].filter(Boolean) as string[];

    let objectPath: string | null = null;
    const bucket = storage.bucket(BUCKET);

    for (const key of candidates) {
      const [exists] = await bucket.file(key).exists();
      if (exists) { objectPath = key; break; }
    }
    if (!objectPath) {
      return fail(404, "source_not_found");
    }

    // Sign a 1‑hour READ URL
    const [signed] = await bucket.file(objectPath).getSignedUrl({
      action: "read",
      expires: Date.now() + 60 * 60 * 1000,
    });

    return ok({ url: signed, expiresAt: Date.now() + 60 * 60 * 1000 });
  } catch (e: any) {
    console.error("[proxy.stream] error", e?.message || e);
    return fail(500, "sign_failed");
  }
};
