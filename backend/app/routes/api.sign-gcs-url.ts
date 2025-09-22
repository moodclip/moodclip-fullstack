import { json } from "@remix-run/node";
import type { ActionFunction } from "@remix-run/node";
import { getGcsSignedUrl } from "../lib/gcs-logic";

export const action: ActionFunction = async ({ request }) => {
  console.log('✅ Received request to /api/sign-gcs-url');

  try {
    const body = await request.json();
    console.log('✅ Parsed request body:', body);

    const { fileName, contentType } = body;
    console.log(`📝 Attempting to get signed URL for: ${fileName}`);

    const url = await getGcsSignedUrl(fileName, contentType);
    console.log('✅ Successfully generated signed URL.');

    return json({ url });

  } catch (err: any) {
    console.error('❌ CRASH POINT!', err.stack || err);
    return new Response('Internal Server Error', { status: 500 });
  }
};