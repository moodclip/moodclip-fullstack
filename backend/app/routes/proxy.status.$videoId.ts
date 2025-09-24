import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import jwt from "jsonwebtoken";
import { db } from "../firebase.server";
import { ensureFallbackAISuggestions } from "~/lib/ai-suggestions.server";
import { extractTranscriptCandidate } from "~/lib/transcript-utils.server";

const MAX_INLINE_TRANSCRIPT_BYTES = 250_000; // ~250 KB inline cap

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

const toIso = (value: any): string | null => {
  if (!value) return null;
  try {
    if (typeof value.toDate === "function") return value.toDate().toISOString();
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return null;
    return date.toISOString();
  } catch {
    return null;
  }
};

type AuthContext = { shop?: string; customerId?: string; via: 'app-proxy' | 'jwt' };

async function getAuth(request: Request): Promise<AuthContext | null> {
  try {
    await authenticate.public.appProxy(request);
    const u = new URL(request.url);
    const shop = normalizeShop(
      u.searchParams.get("shop") ||
        request.headers.get("X-Shopify-Shop-Domain") ||
        "",
    );
    const cid =
      u.searchParams.get("logged_in_customer_id") ||
      request.headers.get("X-Shopify-Logged-In-Customer-Id") ||
      request.headers.get("X-Shopify-Customer-Id") ||
      undefined;

    return {
      shop,
      customerId: cid ? String(cid) : undefined,
      via: 'app-proxy',
    };
  } catch (proxyError) {
    const auth = request.headers.get("authorization") || "";
    const m = auth.match(/^Bearer\s+(.+)$/i);
    if (!m) return null;

    const secret = process.env.SHOPIFY_API_SECRET || process.env.SHOPIFY_APP_SECRET || "";
    if (!secret) return null;

    try {
      const payload: any = jwt.verify(m[1], secret, { algorithms: ["HS256"] });
      const dest = String(payload.dest || payload.iss || "");
      const shop = dest ? normalizeShop(new URL(dest).host) : undefined;
      const cid = payload.sub ? String(payload.sub) : undefined;
      return { shop, customerId: cid, via: 'jwt' };
    } catch {
      return null;
    }
  }
}

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const url = new URL(request.url);
  const includeParams = new Set(url.searchParams.getAll("include").map((v) => v.toLowerCase()));
  const includeTranscript =
    includeParams.has("transcript") || url.searchParams.get("includeTranscript") === "true";

  const auth = await getAuth(request);

  const videoId = params.videoId ? String(params.videoId) : "";
  if (!videoId) return fail(400, "missing_videoId");

  try {
    const ref = db.collection("projects").doc(videoId);
    const snap = await ref.get();
    if (!snap.exists) return fail(404, "project_not_found");

    const p = snap.data() || {};
    const ownerCustomerId = String(p.ownerCustomerId || "");
    const ownerShop = String(p.owner || p.ownerShop || p.shop || p.shopDomain || "");
    const viewerCustomerId = auth?.customerId ? String(auth.customerId) : '';
    const viewerShop = auth?.shop ? String(auth.shop) : '';
    const ownedByYou =
      !!viewerCustomerId &&
      !!ownerCustomerId &&
      ownerCustomerId === viewerCustomerId &&
      (!ownerShop || !viewerShop || ownerShop === viewerShop);

    let aiReady = Boolean(p.aiReady);
    let aiSuggestions: any[] = Array.isArray(p.aiSuggestions) ? p.aiSuggestions : [];

    if (aiSuggestions.length === 0) {
      try {
        const fallback = await ensureFallbackAISuggestions(ref, p);
        if (Array.isArray(fallback) && fallback.length) {
          aiSuggestions = fallback;
          aiReady = true;
        }
      } catch (error) {
        console.warn('[proxy.status] fallback_ai_suggestions_failed', { videoId, error });
      }
    }

    const project = {
      status: p.status || null,
      stage: p.stage || null,
      progress: p.progress ?? null,
      aiReady,
      aiError: !!p.aiError,
      durationSec: p.durationSec ?? p.duration ?? null,
    };

    // Clips
    const clipStatuses: any[] = [];
    try {
      const clips = await ref.collection("clips").orderBy("createdAt", "desc").limit(50).get();
      clips.forEach((c) => {
        const d = c.data() || {};
        const downloadable = ownedByYou && !!d.url;
        clipStatuses.push({
          id: c.id,
          status: d.status || null,
          url: downloadable ? d.url || null : null,
          downloadable,
          progress: d.progress ?? null,
        });
      });
    } catch {}

    const transcriptCandidate = extractTranscriptCandidate(p);
    let transcript: unknown = undefined;
    const transcriptMeta: Record<string, unknown> = { available: false };

    if (transcriptCandidate !== null) {
      transcriptMeta.available = true;
      transcriptMeta.source = "project_doc";

      let serialized: string | null = null;
      try {
        serialized = JSON.stringify(transcriptCandidate);
      } catch {
        serialized = null;
      }

      if (serialized) {
        const size = Buffer.byteLength(serialized, "utf8");
        transcriptMeta.size = size;
        const inline = includeTranscript || size <= MAX_INLINE_TRANSCRIPT_BYTES;
        transcriptMeta.inline = inline;
        if (Array.isArray(p.transcriptParts)) {
          transcriptMeta.partCount = p.transcriptParts.length;
        }

        if (inline) {
          transcript = transcriptCandidate;
        } else {
          transcriptMeta.truncated = true;
          transcriptMeta.reason = "too_large";
        }
      } else {
        transcriptMeta.inline = false;
        transcriptMeta.truncated = true;
        transcriptMeta.reason = "serialization_error";
      }
    }
    if (transcriptMeta.available === false) {
      transcriptMeta.reason = "missing";
    }

    const transcriptUpdatedAt =
      toIso(p.transcriptUpdatedAt) ||
      toIso(p.transcriptUpdatedAtMs) ||
      toIso(p.transcriptUpdatedAtIso) ||
      toIso(p.updatedAt) ||
      null;

    return ok({
      project,
      clipStatuses,
      aiSuggestions,
      transcript,
      transcriptMeta,
      transcriptUpdatedAt,
      ownership: {
        ownedByYou,
        claimable: !ownerCustomerId,
        viewer: viewerCustomerId ? { customerId: viewerCustomerId, shop: viewerShop || null } : null,
      },
    });
  } catch (e) {
    console.error("[proxy.status] failed:", e);
    return fail(500, "internal_error");
  }
};
