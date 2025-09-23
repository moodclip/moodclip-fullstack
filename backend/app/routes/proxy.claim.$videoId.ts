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

const hashClaimToken = (token: string) =>
  crypto.createHash("sha256").update(token).digest("hex");

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

  const cust = verifyMcCust(request);
  if (!cust) return fail(401, "Not signed in.");

  let claimToken: string | null = null;
  let rawBody = "";
  try { rawBody = await request.text(); } catch {/* ignore */}
  if (rawBody) {
    try {
      const parsed = JSON.parse(rawBody);
      const candidate = (parsed?.claimToken || parsed?.token || "").toString().trim();
      if (candidate) claimToken = candidate;
    } catch {/* ignore JSON parse errors */}
    if (!claimToken) {
      const params = new URLSearchParams(rawBody);
      claimToken = params.get("claimToken") || params.get("token") || claimToken;
    }
  }
  if (!claimToken) {
    const url = new URL(request.url);
    claimToken = url.searchParams.get("claimToken") || url.searchParams.get("token");
  }
  if (!claimToken) return fail(400, "missing_claim_token");
  const claimHash = hashClaimToken(claimToken);

  const GCS_BUCKET = process.env.GCS_BUCKET;
  if (!GCS_BUCKET) return fail(500, "Server missing GCS_BUCKET.");

  let clearedSource = false;
  let clearedAudio = false;

  try {
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
        claimedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
        status: data.status || "uploaded",
      });
    });

    const storage = new Storage();
    const bucket = storage.bucket(GCS_BUCKET);

    const src = bucket.file(`${videoId}/source`);
    const [exists] = await src.exists();
    if (!exists) return fail(404, "source_not_found");
    await src.setMetadata({ customTime: null });
    clearedSource = true;

    const audioFile = bucket.file(`${videoId}/audio/${videoId}.m4a`);
    const [audioExists] = await audioFile.exists();
    if (audioExists) {
      await audioFile.setMetadata({ customTime: null });
      clearedAudio = true;
    }

    console.log("[proxy.claim] ok", {
      videoId,
      owner: cust.id,
      clearedSource,
      clearedAudio,
    });
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
        : code === "claim_token_missing"
        ? 400
        : 500;
    console.error("[proxy.claim] error", code, {
      videoId,
      owner: cust.id,
      clearedSource,
      clearedAudio,
    });
    return fail(status, code);
  }
};
