// app/routes/proxy.mark.$videoId.ts
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
const ok = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: CORS });
const fail = (status: number, message: string) =>
  ok({ error: message }, status);

export const loader = async ({ request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  return fail(405, "Method Not Allowed");
};

export const action = async ({ request, params }: ActionFunctionArgs) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  // Verify Shopify App Proxy signature
  try {
    await authenticate.public.appProxy(request);
  } catch (e) {
    console.error("[proxy.mark] unauthorized App Proxy", e);
    return fail(401, "Unauthorized");
  }

  const videoId = (params.videoId || "").toString();
  if (!videoId) return fail(400, "Missing videoId.");

  const GCS_BUCKET = process.env.GCS_BUCKET;
  if (!GCS_BUCKET) return fail(500, "Server missing GCS_BUCKET.");

  try {
    const storage = new Storage();
    const bucket = storage.bucket(GCS_BUCKET);

    // **Canonical source path** (no extension)
    const srcPath = `videos/${videoId}/source`;
    const src = bucket.file(srcPath);

    const [exists] = await src.exists();
    if (!exists) return fail(404, "source_not_found");

    const nowIso = new Date().toISOString();
    await src.setMetadata({ customTime: nowIso });

    // Also "arm" the project so finalize workers can check it if you use that pattern
    await db.collection("projects").doc(videoId).set(
      {
        armed: true,
        status: "processing",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log("[proxy.mark] ok", { videoId, source: srcPath });
    return ok({ ok: true });
  } catch (e: any) {
    console.error("[proxy.mark] error", e?.message || e);
    return fail(500, e?.message || "mark_failed");
  }
};
