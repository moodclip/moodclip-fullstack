// app/routes/proxy.auth.ts
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";
import crypto from "node:crypto";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Content-Type": "application/json",
};

const ok = (data: unknown, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(data), { status: 200, headers: { ...CORS, ...headers } });

const fail = (status: number, message: string) =>
  new Response(JSON.stringify({ error: message }), { status, headers: CORS });

function cookieSecret(): string {
  const s = process.env.SHOPIFY_API_SECRET || process.env.SHOPIFY_APP_SECRET || "";
  if (!s) throw new Error("Missing SHOPIFY_API_SECRET for cookie signing.");
  return s;
}

function b64url(input: Buffer | string) {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function signPayload(payload: object) {
  const secret = cookieSecret();
  const body = JSON.stringify(payload);
  const body64 = b64url(body);
  const h = crypto.createHmac("sha256", secret).update(body).digest();
  const sig = b64url(h);
  return `${body64}.${sig}`;
}

function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.get("cookie") || "";
  const parts = raw.split(/;\s*/);
  for (const p of parts) {
    const [k, ...rest] = p.split("=");
    if (k === name) return rest.join("=");
  }
  return null;
}

function verifyCookie(req: Request) {
  const raw = readCookie(req, "mc_cust");
  if (!raw) return null;
  const [body64, sig] = raw.split(".");
  if (!body64 || !sig) return null;

  const body = Buffer.from(body64.replace(/-/g, "+").replace(/_/g, "/"), "base64").toString("utf8");
  const h = crypto.createHmac("sha256", cookieSecret()).update(body).digest();
  const expected = b64url(h);
  if (sig !== expected) return null;

  try {
    const payload = JSON.parse(body);
    if (!payload?.id || !payload?.email) return null;
    return payload as { id: string; email: string; ts: number };
  } catch { return null; }
}

const COOKIE_PATH = "Path=/apps/moodclip-uploader-v4/";
const BASE_COOKIE = `HttpOnly; Secure; SameSite=Lax; ${COOKIE_PATH}`;

async function handle(request: Request) {
  if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });

  // App‑Proxy HMAC
  try {
    await authenticate.public.appProxy(request);
  } catch (e) {
    console.error("[proxy.auth] unauthorized App Proxy", e);
    return fail(401, "Unauthorized");
  }

  // GET → return current cookie (if any)
  if (request.method === "GET") {
    const cust = verifyCookie(request);
    return ok({ ok: true, customer: cust });
  }

  // POST → login / signup / logout / stamp
  let body: any = {};
  try { body = await request.json(); } catch { body = {}; }
  const op = String(body.op || "");

  // New: trust the Liquid 'customer' via the bridge and stamp our cookie
  if (op === "stamp") {
    const id = String(body.id || "");
    const email = String(body.email || "");
    if (!id || !email) return fail(400, "Missing id/email");

    const token = signPayload({ id, email, ts: Date.now() });
    const cookie = [`mc_cust=${token}`, BASE_COOKIE, "Max-Age=7200"].join("; ");
    return ok({ ok: true, customer: { id, email } }, { "Set-Cookie": cookie });
  }

  if (op === "logout") {
    const cookie = [
      "mc_cust=;",
      BASE_COOKIE,
      "Max-Age=0",
      `Expires=${new Date(0).toUTCString()}`
    ].join("; ");
    return ok({ ok: true }, { "Set-Cookie": cookie });
  }

  // If you still want email/password flows later, keep them in another branch.
  return fail(400, "Unsupported op.");
}

export const loader = async ({ request }: LoaderFunctionArgs) => handle(request);
export const action  = async ({ request }: ActionFunctionArgs) => handle(request);
