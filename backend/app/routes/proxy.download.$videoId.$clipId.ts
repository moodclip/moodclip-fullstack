// app/routes/proxy.download.$videoId.$clipId.ts
import type { LoaderFunctionArgs } from '@remix-run/node';
import { redirect } from '@remix-run/node';
import { Storage } from '@google-cloud/storage';
import { db } from '~/firebase.server';
import shopify from '~/shopify.server';

const storage = new Storage();
const DEFAULT_CLIPS_BUCKET = process.env.CLIPS_BUCKET ?? 'mf-clips-prod';

export const loader = async ({ request, params }: LoaderFunctionArgs) => {
  // 1) App Proxy HMAC
  await shopify.authenticate.public.appProxy(request);

  const { videoId, clipId } = params;
  if (!videoId || !clipId) throw new Response('Missing ids', { status: 400 });

  // 2) Lookup clip doc
  const clipRef = db.doc(`projects/${videoId}/clips/${clipId}`);
  const clipSnap = await clipRef.get();
  if (!clipSnap.exists) throw new Response('Clip not found', { status: 404 });
  const clip = clipSnap.data() as any;

  // 3) Resolve bucket/object
  let bucket = DEFAULT_CLIPS_BUCKET;
  let object = `${videoId}/clips/${clipId}.mp4`;

  // Prefer explicit storagePath "gs://bucket/path/file.mp4"
  if (typeof clip.storagePath === 'string' && clip.storagePath.startsWith('gs://')) {
    const u = new URL(clip.storagePath);
    bucket = u.host;
    object = u.pathname.replace(/^\//, '');
  } else if (typeof clip.url === 'string' && clip.url.startsWith('https://storage.googleapis.com/')) {
    const u = new URL(clip.url);
    const parts = u.pathname.replace(/^\//, '').split('/');
    bucket = parts.shift() || DEFAULT_CLIPS_BUCKET;
    object = parts.join('/');
  }

  // 4) Sign a short‑lived URL that forces attachment
  const filename = `moodclip-${videoId}-${clipId}.mp4`;
  const [signedUrl] = await storage.bucket(bucket).file(object).getSignedUrl({
    version: 'v4',
    action: 'read',
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    responseDisposition: `attachment; filename="${filename}"`,
    responseType: 'video/mp4',
  });

  // 5) Redirect to GCS; browser initiates download
  return redirect(signedUrl, { status: 302 });
};
