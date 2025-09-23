// app/routes/proxy.claim.ts
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { db, FieldValue } from "../firebase.server";
import { Storage } from "@google-cloud/storage";
import crypto from "node:crypto";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};
const ok   = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: CORS });
const fail = (status: number, message: string) => new Response(JSON.stringify({ error: message }), { status, headers: CORS });

function getCookieSecret(): string {
  const s = process.env.SHOPIFY_API_SECRET || process.env.SHOPIFY_APP_SECRET || "";
  if (!s) throw new Error("Missing SHOPIFY_API_SECRET for cookie signing.");
  return s;
}
function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie") || "";
  for (const p of raw.split(/;\s*/)) {
    const [k, ...rest] = p.split("=");
    if (k === name) return rest.join("=");
  }
  return null;
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
  } catch { return null; }
}

const hashClaimToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

async function clearCustomTime(videoId: string) {
  const bucket = process.env.GCS_BUCKET;
  if (!bucket) throw new Error("Missing env GCS_BUCKET");
  const storage = new Storage();
  await storage.bucket(bucket).file(`${videoId}/source`).setMetadata({ customTime: null }).catch(() => {});
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  try { await authenticate.public.appProxy(request); } catch { return fail(401, "Unauthorized"); }
  return fail(405, "Method Not Allowed");
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  try { await authenticate.public.appProxy(request); } catch { return fail(401, "Unauthorized"); }
  const cust = verifyMcCust(request);
  if (!cust) return fail(401, "Not signed in.");

  let body: any = {};
  try { body = await request.json(); } catch { return fail(400, "Invalid JSON"); }
  const videoId = (body?.videoId || "").toString().trim();
  if (!videoId) return fail(400, "Missing videoId");

  const claimToken = (body?.claimToken || "").toString().trim();
  if (!claimToken) return fail(400, "missing_claim_token");
  const claimHash = hashClaimToken(claimToken);

  try {
    let cleared = false;
    await db.runTransaction(async (tx) => {
      const ref = db.collection("projects").doc(videoId);
      const snap = await tx.get(ref);
      if (!snap.exists) throw new Error("not_found");
      const data = snap.data() || {};

      const existingOwner: string | null = data.ownerCustomerId || data.owner || null;
      const storedHash: string | null = data.claimTokenHash || null;
      if (existingOwner && existingOwner !== cust.id) throw new Error("already_owned");
      if (!storedHash) throw new Error("claim_token_missing");
      if (storedHash !== claimHash) throw new Error("claim_token_invalid");

      tx.update(ref, {
        ownerCustomerId: cust.id,
        owner: cust.id,
        ownerEmail: cust.email,
        claimTokenHash: FieldValue.delete(),
        claimTokenIssuedAt: FieldValue.delete(),
        claimTokenLastSeen: FieldValue.delete(),
        claimTokenConsumedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        status: data.status || "uploaded",
      });
      cleared = true;
    });

    if (cleared) await clearCustomTime(videoId);

    console.log("[proxy.claim] ok videoId=%s owner=%s", videoId, cust.id);
    return ok({ ok: true });
  } catch (e: any) {
    const code = String(e?.message || "claim_failed");
    const status =
      code === "not_found"
        ? 404
        : code === "claim_token_invalid"
        ? 403
        : code === "already_owned"
        ? 409
        : 400;
    console.error("[proxy.claim] error", code, { videoId, cust: cust?.id });
    return fail(status, code);
  }
};
