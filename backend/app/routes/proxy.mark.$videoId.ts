// app/routes/proxy.mark.$videoId.ts
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import type { DocumentData, DocumentReference } from "firebase-admin/firestore";
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

const storage = new Storage();

type ProjectDoc = { ref: DocumentReference; data: DocumentData };

const resolveSource = async (videoId: string): Promise<{ project: ProjectDoc | null; source: any }> => {
  const snap = await db.collection("projects").doc(videoId).get();
  if (!snap.exists) return { project: null, source: null } as const;
  const project = snap.data() ?? {};
  const source = project?.source ?? null;
  return { project: { ref: snap.ref, data: project }, source } as const;
};

const logMark = (entry: Record<string, unknown>) => {
  console.info('[proxy.mark]', JSON.stringify(entry));
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
          sourceValidatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      logMark({
        phase: 'mark',
        videoId,
        object: objectPath,
        bucket: bucketName,
        previousObject: rawObject || null,
        previousBucket: rawBucket || null,
        outcome: 'source_normalized',
      });
    } catch (error) {
      console.warn('[proxy.mark] failed to normalize project.source', { videoId, error });
    }
  }

  return { objectPath, bucketName } as const;
};

const tryRecoverLegacySource = async (
  videoId: string,
  project: ProjectDoc,
  source: any,
  bucketName: string,
  objectPath: string,
) => {
  const bucket = storage.bucket(bucketName);
  const canonicalFile = bucket.file(objectPath);
  const [exists] = await canonicalFile.exists();
  if (exists) {
    return { file: canonicalFile, recovered: false } as const;
  }

  const canonicalObject = `videos/${videoId}/source`;
  const candidates = new Set<string>();
  candidates.add(canonicalObject);
  const legacyWithoutPrefix = canonicalObject.replace(/^videos\//, '');
  if (legacyWithoutPrefix) candidates.add(legacyWithoutPrefix);
  candidates.add(`${videoId}/source`);
  if (objectPath && objectPath !== canonicalObject) {
    candidates.add(objectPath);
    const withoutPrefix = objectPath.replace(/^videos\//, '');
    if (withoutPrefix) candidates.add(withoutPrefix);
  }

  for (const candidate of candidates) {
    const legacyFile = bucket.file(candidate);
    const [legacyExists] = await legacyFile.exists();
    if (!legacyExists) continue;

    try {
      await legacyFile.copy(canonicalFile);
      await legacyFile.delete({ ignoreNotFound: true });
      await project.ref.set(
        {
          source: {
            ...(typeof source === 'object' && source ? source : {}),
            object: canonicalObject,
            bucket: bucketName,
          },
          sourceValidatedAt: FieldValue.serverTimestamp(),
        },
        { merge: true },
      );
      logMark({
        phase: 'mark',
        videoId,
        object: canonicalObject,
        bucket: bucketName,
        recoveredFrom: candidate,
        outcome: 'source_recovered',
      });
      return { file: canonicalFile, recovered: true } as const;
    } catch (error) {
      console.error('[proxy.mark] failed to recover legacy source', { videoId, candidate, error });
    }
  }

  return { file: canonicalFile, recovered: false } as const;
};

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
  if (!videoId) return fail(400, "missing_videoId");

  const bucketFallback = process.env.GCS_BUCKET;
  if (!bucketFallback) return fail(500, "missing_bucket");

  try {
    const { project, source } = await resolveSource(videoId);
    if (!project) {
      logMark({ phase: 'mark', videoId, attempt: 1, outcome: 'project_missing' });
      return fail(404, "project_not_found");
    }

    const { objectPath, bucketName } = await ensureCanonicalSource(
      videoId,
      project,
      source,
      bucketFallback,
    );

    const { file, recovered } = await tryRecoverLegacySource(
      videoId,
      project,
      source,
      bucketName,
      objectPath,
    );
    const [exists] = await file.exists();
    logMark({ phase: 'mark', videoId, object: objectPath, bucket: bucketName, exists, recovered, attempt: 1, outcome: exists ? 'source_found' : 'source_missing' });

    if (!exists) return fail(409, "source_missing");

    try {
      await file.setMetadata({ customTime: new Date().toISOString() });
    } catch (error: any) {
      const message = error?.message ?? String(error);
      if (typeof message === 'string' && message.includes('No such object')) {
        logMark({ phase: 'mark', videoId, object: objectPath, bucket: bucketName, attempt: 1, recovered, outcome: 'source_missing_after_exists', error: message });
        return fail(409, "source_missing");
      }
      throw error;
    }

    await project.ref.set(
      {
        armed: true,
        status: "uploaded",
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    logMark({ phase: 'mark', videoId, object: objectPath, bucket: bucketName, exists: true, attempt: 1, outcome: 'updated' });
    return new Response(null, { status: 204, headers: CORS });
  } catch (e: any) {
    console.error('[proxy.mark] error', e?.message || e);
    return fail(500, 'mark_failed');
  }
};
