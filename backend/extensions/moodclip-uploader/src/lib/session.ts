import createApp from '@shopify/app-bridge';
import {getSessionToken} from '@shopify/app-bridge-utils';

// Public app key (client_id in shopify.app.toml)
const API_KEY = 'bc4a14e184b8697b63929e67246d1871';

function getHost(): string | null {
  try {
    const params = new URLSearchParams(location.search);
    return params.get('host');
  } catch { return null; }
}

export async function getShopifySessionToken(): Promise<string | null> {
  try {
    const host = getHost();
    if (!host) return null;
    const app = createApp({apiKey: API_KEY, host, forceRedirect: false});
    return await getSessionToken(app);
  } catch (e) {
    console.warn('[session] failed to get session token', e);
    return null;
  }
}
