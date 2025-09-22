import type { LoaderFunctionArgs, ActionFunctionArgs } from "@remix-run/node";
import { authenticate } from "../shopify.server";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
      "Access-Control-Allow-Origin": "*",
    },
  });

async function handle(request: Request) {
  try {
    await authenticate.public.appProxy(request); // verify App Proxy HMAC
  } catch {
    return json({ ok: false, error: "unauthorized" }, 401);
  }

  // Many themes append logged_in_customer_id to proxied requests when a customer is signed in
  const url = new URL(request.url);
  const cid = url.searchParams.get("logged_in_customer_id");

  return json({ ok: true, loggedIn: !!cid, id: cid || null });
}

export const loader = async ({ request }: LoaderFunctionArgs) => handle(request);
export const action = async ({ request }: ActionFunctionArgs) => handle(request);
