import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import jwt from "jsonwebtoken";
import { db } from "../firebase.server";

/** CORS */
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};
const ok = (data: unknown, status = 200) => new Response(JSON.stringify(data), { status, headers: CORS });
const fail = (status: number, message: string) =>
  new Response(JSON.stringify({ error: message }), { status, headers: CORS });

function normalizeShop(host: string): string {
  const h = (host || "").toLowerCase();
  const m = h.match(/^([^.]+)\.account\.myshopify\.com$/);
  return m ? `${m[1]}.myshopify.com` : h;
}

async function getAuth(request: Request): Promise<{ shop: string; customerId: string } | null> {
  // App‑Proxy first
  try {
    await authenticate.public.appProxy(request);
    const u = new URL(request.url);
    const shop = normalizeShop(u.searchParams.get("shop") || request.headers.get("X-Shopify-Shop-Domain") || "");
    const cid = u.searchParams.get("logged_in_customer_id");
    if (shop && cid) return { shop, customerId: String(cid) };
  } catch {}

  // Session token fallback
  const auth = request.headers.get("authorization") || "";
  const m = auth.match(/^Bearer\s+(.+)$/i);
  if (m) {
    try {
      const secret = process.env.SHOPIFY_API_SECRET || process.env.SHOPIFY_APP_SECRET || "";
      if (!secret) return null;
      const payload: any = jwt.verify(m[1], secret, { algorithms: ["HS256"] });
      const dest = String(payload.dest || payload.iss || "");
      const shop = normalizeShop(new URL(dest).host);
      const cid = String(payload.sub || "");
      if (shop && cid) return { shop, customerId: cid };
    } catch {}
  }
  return null;
}

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const auth = await getAuth(request);
  if (!auth) return fail(401, "unauthorized");

  const videoId = params.videoId ? String(params.videoId) : "";
  if (!videoId) return fail(400, "missing_videoId");

  try {
    const ref = db.collection("projects").doc(videoId);
    const snap = await ref.get();
    if (!snap.exists) return fail(404, "project_not_found");

    const p = snap.data() || {};
    const ownerCustomerId = String(p.ownerCustomerId || "");
    const ownerShop = String(p.owner || p.ownerShop || p.shop || p.shopDomain || "");
    const ownedByYou =
      !!ownerCustomerId &&
      ownerCustomerId === auth.customerId &&
      (!ownerShop || ownerShop === auth.shop);

    const project = {
      status: p.status || null,
      progress: p.progress ?? null,
      aiReady: !!p.aiReady,
      aiError: !!p.aiError,
      durationSec: p.durationSec ?? p.duration ?? null,
    };

    // Clips
    const clipStatuses: any[] = [];
    try {
      const clips = await ref.collection("clips").orderBy("createdAt", "desc").limit(50).get();
      clips.forEach((c) => {
        const d = c.data() || {};
        clipStatuses.push({
          id: c.id,
          status: d.status || null,
          url: d.url || null,
          progress: d.progress ?? null,
        });
      });
    } catch {}

    const aiSuggestions = Array.isArray(p.aiSuggestions) ? p.aiSuggestions : [];

    return ok({
      project,
      clipStatuses,
      aiSuggestions,
      ownership: { ownedByYou, claimable: !ownerCustomerId },
    });
  } catch (e) {
    console.error("[proxy.status] failed:", e);
    return fail(500, "internal_error");
  }
};
