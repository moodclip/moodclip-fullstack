// app/routes/proxy.claim.$videoId.ts
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { Storage } from "@google-cloud/storage";
import { db, FieldValue } from "../firebase.server";
import crypto from "node:crypto";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};
const ok = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: CORS });
const fail = (status: number, message: string) =>
  ok({ error: message }, status);

function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie") || "";
  const parts = raw.split(/;\s*/);
  for (const p of parts) {
    const [k, ...rest] = p.split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}
function getCookieSecret(): string {
  const s = process.env.SHOPIFY_API_SECRET || process.env.SHOPIFY_APP_SECRET || "";
  if (!s) throw new Error("Missing SHOPIFY_API_SECRET for cookie signing.");
  return s;
}
function b64urlDecode(str: string) {
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
}
function verifyMcCust(req: Request) {
  const raw = readCookie(req, "mc_cust");
  if (!raw) return null;
  const [body64, sig] = raw.split(".");
  if (!body64 || !sig) return null;
  const body = b64urlDecode(body64);
  const h = crypto.createHmac("sha256", getCookieSecret()).update(body).digest("base64")
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  if (sig !== h) return null;
  try {
    const payload = JSON.parse(body);
    if (!payload?.id || !payload?.email) return null;
    return payload as { id: string; email: string; ts: number };
  } catch {
    return null;
  }
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  return fail(405, "Method Not Allowed");
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  try {
    await authenticate.public.appProxy(request);
  } catch (e) {
    console.error("[proxy.claim] unauthorized App Proxy", e);
    return fail(401, "Unauthorized");
  }

  const videoId = (params.videoId || "").toString();
  if (!videoId) return fail(400, "Missing videoId.");

  const GCS_BUCKET = process.env.GCS_BUCKET;
  if (!GCS_BUCKET) return fail(500, "Server missing GCS_BUCKET.");

  const cust = verifyMcCust(request);
  if (!cust) return fail(401, "Not signed in.");

  try {
    const storage = new Storage();
    const bucket = storage.bucket(GCS_BUCKET);

    // Clear Custom-Time on source (and audio if present)
    const src = bucket.file(`${videoId}/source`);
    const [exists] = await src.exists();
    if (!exists) return fail(404, "source_not_found");
    await src.setMetadata({ customTime: null });

    const audio = bucket.file(`${videoId}/audio/${videoId}.m4a`);
    const [aExists] = await audio.exists();
    if (aExists) await audio.setMetadata({ customTime: null });

    // Stamp ownership (no ownerShop)
    await db.collection("projects").doc(videoId).set({
      ownerCustomerId: cust.id,
      ownerEmail: cust.email,
      claimedAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    }, { merge: true });

    console.log("[proxy.claim] ok", { videoId, owner: cust.id });
    return ok({ ok: true });
  } catch (e: any) {
    console.error("[proxy.claim] error", e?.message || e);
    return fail(500, e?.message || "claim_failed");
  }
};
