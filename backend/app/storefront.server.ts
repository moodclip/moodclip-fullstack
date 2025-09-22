import { env } from "node:process";

const SF_API_VERSION = "2024-07";

export async function storefrontFetch<T>(
  shop: string,
  query: string,
  variables?: Record<string, unknown>
): Promise<T> {
  const token = env.STOREFRONT_API_TOKEN;
  if (!token) throw new Error("STOREFRONT_API_TOKEN is not set.");

  const url = `https://${shop}/api/${SF_API_VERSION}/graphql.json`;
  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token,
    },
    body: JSON.stringify({ query, variables }),
  });

  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`Storefront fetch failed: HTTP ${resp.status} ${text.slice(0,240)}`);
  }
  let json: any;
  try { json = JSON.parse(text); } catch { throw new Error("Invalid Storefront JSON"); }
  if (json.errors) {
    throw new Error(`Storefront GraphQL errors: ${JSON.stringify(json.errors).slice(0,300)}`);
  }
  return json.data as T;
}
