import type { LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import jwt from "jsonwebtoken";
import { db } from "../firebase.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

const ok = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: CORS });
const fail = (status: number, message: string) => ok({ error: message }, status);

const normalizeShop = (host: string): string => {
  const h = (host || "").toLowerCase();
  const m = h.match(/^([^.]+)\.account\.myshopify\.com$/);
  return m ? `${m[1]}.myshopify.com` : h;
};

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

const extractTranscriptCandidate = (data: any): unknown => {
  if (!data || typeof data !== "object") return null;
  const candidates = [
    data.transcriptNormalized,
    data.transcript,
    data.transcriptParagraphs,
    data.transcriptParts,
    data.transcriptData,
    data.fullTranscript,
  ];
  for (const candidate of candidates) {
    if (candidate !== undefined && candidate !== null) {
      return candidate;
    }
  }
  return null;
};

const getAuth = async (request: Request): Promise<{ shop: string; customerId: string } | null> => {
  try {
    await authenticate.public.appProxy(request);
    const u = new URL(request.url);
    const shop = normalizeShop(
      u.searchParams.get("shop") || request.headers.get("X-Shopify-Shop-Domain") || "",
    );
    const cid = u.searchParams.get("logged_in_customer_id");
    if (shop && cid) return { shop, customerId: String(cid) };
  } catch {}

  const authHeader = request.headers.get("authorization") || "";
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
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
};

const unwrapTranscript = (candidate: any) => {
  if (Array.isArray(candidate)) {
    return { rootKind: "array" as const, items: candidate, metadata: null, raw: candidate };
  }
  if (candidate && typeof candidate === "object") {
    if (Array.isArray(candidate.paragraphs)) {
      const { paragraphs, ...rest } = candidate;
      return { rootKind: "paragraphs" as const, items: paragraphs, metadata: rest, raw: candidate };
    }
    if (Array.isArray(candidate.segments)) {
      const { segments, ...rest } = candidate;
      return { rootKind: "segments" as const, items: segments, metadata: rest, raw: candidate };
    }
  }
  return { rootKind: "raw" as const, items: null, metadata: null, raw: candidate };
};

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(value, max));

export const loader = async ({ params, request }: LoaderFunctionArgs) => {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  const auth = await getAuth(request);
  if (!auth) return fail(401, "unauthorized");

  const videoId = params.videoId ? String(params.videoId) : "";
  if (!videoId) return fail(400, "missing_videoId");

  const url = new URL(request.url);
  const partParam = url.searchParams.get("part");
  const chunkSizeParam = url.searchParams.get("chunkSize");
  const format = (url.searchParams.get("format") || "raw").toLowerCase();

  let partIndex: number | null = null;
  if (partParam !== null) {
    const parsed = Number(partParam);
    if (Number.isNaN(parsed) || parsed < 0) {
      return fail(400, "invalid_part");
    }
    partIndex = parsed;
  }

  const chunkSize = clamp(chunkSizeParam ? Number(chunkSizeParam) : 500, 1, 5000);

  const ref = db.collection("projects").doc(videoId);
  const snap = await ref.get();
  if (!snap.exists) return fail(404, "project_not_found");

  const data = snap.data() || {};
  const transcriptCandidate = extractTranscriptCandidate(data);
  if (transcriptCandidate === null) return fail(404, "transcript_not_found");

  const transcriptUpdatedAt =
    toIso(data.transcriptUpdatedAt) ||
    toIso(data.transcriptUpdatedAtMs) ||
    toIso(data.transcriptUpdatedAtIso) ||
    toIso(data.updatedAt) ||
    null;

  const { rootKind, items, metadata, raw } = unwrapTranscript(transcriptCandidate);

  if (partIndex !== null) {
    if (!items) return fail(400, "partial_not_supported");
    const array = items as any[];
    const totalParts = Math.max(1, Math.ceil(array.length / chunkSize));
    if (partIndex >= totalParts) return fail(400, "part_out_of_range");
    const start = partIndex * chunkSize;
    const slice = array.slice(start, start + chunkSize);

    return ok({
      rootKind,
      part: partIndex,
      totalParts,
      chunkSize,
      count: slice.length,
      items: slice,
      metadata,
      transcriptUpdatedAt,
    });
  }

  if (format === "array" && items) {
    return ok({ rootKind, items, metadata, transcriptUpdatedAt });
  }

  if (rootKind === "paragraphs" && metadata) {
    return ok({ transcript: { ...metadata, paragraphs: items }, transcriptUpdatedAt });
  }
  if (rootKind === "segments" && metadata) {
    return ok({ transcript: { ...metadata, segments: items }, transcriptUpdatedAt });
  }

  return ok({ transcript: raw, transcriptUpdatedAt, rootKind });
};
