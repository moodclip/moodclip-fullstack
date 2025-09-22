// app/routes/proxy.mark.ts
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import { Storage } from "@google-cloud/storage";
import { db, FieldValue } from "../firebase.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};
const ok   = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: CORS });
const fail = (status: number, message: string) => new Response(JSON.stringify({ error: message }), { status, headers: CORS });

async function setCustomTime(videoId: string) {
  const bucket = process.env.GCS_BUCKET;
  if (!bucket) throw new Error("Missing env GCS_BUCKET");
  const storage = new Storage();
  const file = storage.bucket(bucket).file(`${videoId}/source`);
  await file.setMetadata({ customTime: new Date().toISOString() });
}

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  try { await authenticate.public.appProxy(request); } catch { return fail(401, "Unauthorized"); }
  return fail(405, "Method Not Allowed"); // proves route is mounted if you curl it
};

export const action = async ({ request }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  try { await authenticate.public.appProxy(request); } catch { return fail(401, "Unauthorized"); }

  let body: any = {};
  try { body = await request.json(); } catch { return fail(400, "Invalid JSON"); }
  const videoId = (body?.videoId || "").toString().trim();
  if (!videoId) return fail(400, "Missing videoId");

  try { await setCustomTime(videoId); }
  catch (e) { console.error("[proxy.mark] setCustomTime failed", e); return fail(500, "Failed to mark object"); }

  try {
    await db.collection("projects").doc(videoId).set(
      { status: "uploaded", updatedAt: FieldValue.serverTimestamp() },
      { merge: true }
    );
  } catch (e) { console.warn("[proxy.mark] firestore update skipped:", e); }

  console.log("[proxy.mark] ok videoId=%s", videoId);
  return ok({ ok: true });
};
