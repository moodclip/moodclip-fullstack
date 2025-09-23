// app/routes/proxy.stream.$videoId.ts
import type { LoaderFunctionArgs } from "@remix-run/node";
import type { DocumentData, DocumentReference } from "firebase-admin/firestore";
import { Storage } from "@google-cloud/storage";
import { db } from "../firebase.server";

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

type ProjectDoc = { ref: DocumentReference; data: DocumentData };

const resolveProject = async (videoId: string): Promise<{ project: ProjectDoc | null; source: any }> => {
  const snap = await db.collection("projects").doc(videoId).get();
  if (!snap.exists) return { project: null, source: null };
  const data = snap.data() ?? {};
  return { project: { ref: snap.ref, data }, source: data.source ?? null };
};

const ensureCanonicalSource = async (
  videoId: string,
  project: ProjectDoc,
  source: any,
  bucketFallback: string,
) => {
  const canonicalObject = `videos/${videoId}/source`;
  const rawObject = typeof source?.object === 'string' ? source.object.trim() : '';
  const needsCanonicalObject = !rawObject || !rawObject.startsWith('videos/');
  const objectPath = needsCanonicalObject ? canonicalObject : rawObject;

  const rawBucket = typeof source?.bucket === 'string' ? source.bucket.trim() : '';
  const bucketName = rawBucket || bucketFallback;

  if (needsCanonicalObject || bucketName !== rawBucket) {
    try {
      await project.ref.set(
        {
          source: {
            ...(typeof source === 'object' && source ? source : {}),
            object: objectPath,
            bucket: bucketName,
          },
        },
        { merge: true },
      );
    } catch (error) {
      console.warn('[proxy.stream] failed to normalize project.source', { videoId, error });
    }
  }

  return { objectPath, bucketName } as const;
};

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (request.method === "HEAD")    return ok({ status: "ok" });
  if (request.method !== "GET")     return fail(405, "method_not_allowed");

  const videoId = params.videoId ? String(params.videoId) : "";
  if (!videoId) return fail(400, "missing_videoId");

  try {
    const { project, source } = await resolveProject(videoId);
    if (!project) return fail(404, "project_not_found");

    const { objectPath, bucketName } = await ensureCanonicalSource(
      videoId,
      project,
      source,
      BUCKET,
    );

    const bucket = storage.bucket(bucketName);
    const file = bucket.file(objectPath);
    const [exists] = await file.exists();
    if (!exists) {
      return fail(404, "source_not_found");
    }

    // Sign a 1‑hour READ URL
    const expiresAt = Date.now() + 60 * 60 * 1000;
    const [signed] = await file.getSignedUrl({
      action: "read",
      expires: expiresAt,
    });

    return ok({ url: signed, expiresAt });
  } catch (e: any) {
    console.error("[proxy.stream] error", e?.message || e);
    return fail(500, "sign_failed");
  }
};
