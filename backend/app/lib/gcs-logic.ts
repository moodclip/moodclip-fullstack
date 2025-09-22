import { Storage } from "@google-cloud/storage";

export async function getGcsSignedUrl(fileName: string, contentType: string) {
  // This is your actual GCS bucket name
  const bucketName = 'mf-uploads-prod';

  // Initialize the Google Cloud Storage client
  const storage = new Storage({
    keyFilename: 'google-credentials.json',
  });

  const bucket = storage.bucket(bucketName);

  const options = {
    version: 'v4' as const,
    action: 'write' as const,
    expires: Date.now() + 15 * 60 * 1000, // 15 minutes
    contentType,
  };

  const [url] = await bucket.file(fileName).getSignedUrl(options);

  return url;
}
