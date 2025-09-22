import { Storage } from "@google-cloud/storage";
import { json } from "@remix-run/node";
import type { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  console.log("[DEBUG] HIT /debug/uploads");

  const { GCS_BUCKET } = process.env;
  if (!GCS_BUCKET) {
    return json({ error: "Missing GCS_BUCKET" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const fileName = searchParams.get("name");
  const contentType = searchParams.get("type");

  if (!fileName || !contentType) {
    return json({ error: "Missing name or type" }, { status: 400 });
  }

  try {
    const [signedUrl] = await new Storage()
      .bucket(GCS_BUCKET)
      .file(fileName)
      .getSignedUrl({
        version: "v4",
        action: "write",
        expires: Date.now() + 15 * 60 * 1000,
        contentType,
      });

    return json({ signedUrl });
  } catch (e) {
    console.error("[DEBUG] Signed URL error", e);
    return json({ error: "Failed to generate URL" }, { status: 500 });
  }
};
