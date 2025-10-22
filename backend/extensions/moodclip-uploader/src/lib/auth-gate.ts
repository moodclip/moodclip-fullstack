/**
 * Bridge-free guards supporting BOTH Shopify login and Google OAuth.
 * - Checks /apps/moodclip-uploader-v4/proxy/ping
 * - If not logged in, you can call navigateGoogleLogin() for Google,
 *   or we fall back to Shopify login (/account/login?return_url=...).
 * - Captures mc_token from OAuth callback URL (#mc_token=...) and
 *   automatically attaches it to all /proxy requests via X-MC-Token.
 * - Adds installGlobalGuards(): intercepts clicks on [data-auth="required"]
 *   and redirects to login when the visitor is unauthenticated.
 */

const PROXY_PREFIX = "/apps/moodclip-uploader-v4";
const PING = `${PROXY_PREFIX}/proxy/ping`;
const GOOGLE_START = `${PROXY_PREFIX}/auth/google/start`;
const AFTER_LOGIN_KEY = "mc_after_login";

let cache: { ts: number; logged: boolean } | null = null;

/** Prefer window.__mc_project then #pid */
export function getPid(): string | null {
  try {
    const w: any = window;
    if (w && w.__mc_project) return String(w.__mc_project);
    const h = new URLSearchParams(location.hash.slice(1));
    return h.get("pid");
  } catch { return null; }
}

/** Shopify login with return_url preserving #pid (if present) */
export function loginUrl(): string {
  const pid = getPid();
  const hash = pid ? `#pid=${encodeURIComponent(pid)}` : "";
  const returnUrl = `/${hash}`;
  return `/account/login?return_url=${encodeURIComponent(returnUrl)}`;
}

/** Read/consume mc_token from hash and stash in sessionStorage */
function consumeTokenFromHash(): string | null {
  try {
    const h = new URLSearchParams(location.hash.slice(1));
    const tok = h.get("mc_token");
    if (tok) {
      sessionStorage.setItem("mc_token", tok);
      h.delete("mc_token");
      const rest = h.toString();
      const clean = rest ? `#${rest}` : "";
      history.replaceState(history.state, document.title, location.pathname + location.search + clean);
      return tok;
    }
  } catch {}
  return null;
}

function currentMcToken(): string | null {
  try {
    return sessionStorage.getItem("mc_token");
  } catch { return null; }
}

/** Server-side login probe; cached briefly to avoid spam */
export async function isLoggedIn(): Promise<boolean> {
  consumeTokenFromHash();
  const now = Date.now();
  if (cache && now - cache.ts < 4000) return cache.logged;
  try {
    const headers: Record<string,string> = { Accept: "application/json" };
    const mc = currentMcToken();
    if (mc) headers["X-MC-Token"] = mc;
    const r = await fetch(PING, { headers, cache: "no-store" });
    const j = await r.json().catch(() => ({}));
    const logged = !!j?.loggedIn;
    cache = { ts: now, logged };
    return logged;
  } catch {
    return false;
  }
}

const rememberAfterLogin = (after: { action: "download" | "return_only"; href?: string }) => {
  try {
    sessionStorage.setItem(AFTER_LOGIN_KEY, JSON.stringify(after));
  } catch {
    // Ignore storage failures (e.g., private mode)
  }
};

/** Store an after-login action then go to Shopify login */
function goShopifyLogin(after: { action: "download" | "return_only"; href?: string }) {
  rememberAfterLogin(after);
  location.assign(loginUrl());
}

/**
 * Attempt to open the Shopify login flow in a popup window so the current page can
 * continue running background work (e.g., uploads). Returns the popup reference
 * when successful, or null if the browser blocked the window.
 */
export function openShopifyLoginWindow(
  after: { action: "download" | "return_only"; href?: string } = { action: "return_only" },
  features: string = "noopener,noreferrer,width=520,height=720",
): Window | null {
  rememberAfterLogin(after);
  try {
    const popup = window.open(loginUrl(), "mc-shopify-login", features);
    if (!popup) return null;
    popup.focus?.();
    return popup;
  } catch {
    return null;
  }
}

/** Start Google OAuth (top-level nav) */
export function navigateGoogleLogin(returnPath: string = "/") {
  const u = new URL(GOOGLE_START, location.origin);
  u.searchParams.set("return_url", returnPath);
  location.assign(u.toString());
}

/** Public API to ensure auth; prefer Shopify; caller may expose a Google button */
export async function ensureAuthed(_ctx?: { projectId?: string; action?: string }) {
  const ok = await isLoggedIn();
  if (ok) return;

  // If you want to show a UI choice, expose navigateGoogleLogin() to your UI.
  // Default behavior: go Shopify login.
  goShopifyLogin({ action: "return_only" });
}

/** For components that need the current user quickly */
export async function getMe(): Promise<{ id: string } | null> {
  const ok = await isLoggedIn();
  if (!ok) return null;
  // We don't fetch a profile here; the server gates protected actions itself.
  // Return a stub object so guards know we're authed.
  return { id: "authed" };
}

/** Install global fetch shim that adds X-MC-Token to /proxy calls */
export function installAuthFetch() {
  const w: any = window;
  if (w.__mcFetchPatched) return;
  w.__mcFetchPatched = true;

  const orig = window.fetch.bind(window);
  window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
    try {
      const url = typeof input === 'string'
        ? input
        : ((input as Request).url || String(input));
      if (url.includes(`${PROXY_PREFIX}/proxy/`)) {
        const mc = currentMcToken();
        if (mc) {
          init = init || {};
          const hdrs = new Headers(init.headers || {});
          hdrs.set('X-MC-Token', mc);
          init.headers = hdrs;
        }
      }
    } catch {}
    return orig(input as any, init as any);
  };
}

/**
 * Install a single document-level click handler that watches for elements
 * marked with `data-auth="required"`. If the visitor is unauthenticated,
 * we redirect to Shopify login (or you may call navigateGoogleLogin in your UI).
 */
export function installGlobalGuards(): void {
  const w: any = window;
  if (w.__mcAuthGuardsInstalled) return;
  w.__mcAuthGuardsInstalled = true;

  const onClick = async (ev: MouseEvent) => {
    const tgt = ev.target as Element | null;
    if (!tgt) return;

    const el = tgt.closest?.('[data-auth="required"]');
    if (!el) return;

    const ok = await isLoggedIn();
    if (ok) return;

    // Block the action and send to login
    ev.preventDefault();
    ev.stopPropagation();

    // If it's a link, remember it so we can resume
    const href =
      (el instanceof HTMLAnchorElement && el.href) ||
      (el.getAttribute && el.getAttribute('href')) ||
      '';

    goShopifyLogin(href ? { action: 'download', href } : { action: 'return_only' });
  };

  // capture phase to intercept before default handlers
  document.addEventListener('click', onClick, true);

  // Also patch fetch once so proxy requests carry mc token
  installAuthFetch();
}
