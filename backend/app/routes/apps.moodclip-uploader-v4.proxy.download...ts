import type { LoaderFunctionArgs } from "@remix-run/node";
import { db } from "../firebase.server";
import * as base from "./proxy.download.$videoId.$clipId";

function getCid(req: Request): string | null {
  const u = new URL(req.url);
  return u.searchParams.get("logged_in_customer_id")
      || req.headers.get("X-Shopify-Customer-Id")
      || req.headers.get("X-Shopify-Logged-In-Customer-Id");
}

export const loader = async (args: LoaderFunctionArgs) => {
  const videoId    = String(args.params.videoId || "");
  const customerId = getCid(args.request);

  if (videoId && customerId) {
    try {
      const ref = db.collection("projects").doc(videoId);
      const snap = await ref.get();
      const cur  = snap.exists ? snap.data() : undefined;
      if (cur && !cur.ownerCustomerId) {
        await ref.update({ ownerCustomerId: String(customerId) });
        console.log("⇨ [stamp][download-once]", { videoId, ownerCustomerId: String(customerId) });
      }
    } catch (e) {
      console.error("⇨ [stamp][download-once] failed", { videoId, error: String(e) });
    }
  }

  return base.loader(args);
};
