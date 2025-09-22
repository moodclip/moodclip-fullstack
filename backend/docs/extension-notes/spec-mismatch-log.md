# Spec vs Implementation Gaps

_Date: 2025-09-19_

| Area | Spec expectation | Observed implementation | Impact |
| --- | --- | --- | --- |
| Theme asset wiring | `shopify.extension.toml` targets `app-block.v4.{css,js}` | Repo ships `assets/app-block.css` and `assets/app-block.umd.js`; no build artifact named `.v4.*` checked in. | Deploy pipeline must rename assets or Shopify will 404; needs confirmation before swapping bundles. |
| Anonymous upload claiming | Backend returns `claimToken` for anonymous uploads so they can claim projects post-login. | No persistence or replay of `claimToken` identified in source/bundle; auth guard only redirects. | Anonymous users cannot attach previous uploads after signing in. |
| Firestore access | Target prod behavior disables direct Firestore reads (`FIRESTORE_DIRECT=false`) and relies on proxy APIs. | Firebase SDK initialized with persistent cache + long polling; compiled bundle still issues onSnapshot subscriptions. | Violates target security posture; new UI must add a proxy-driven path or feature flag. |
| Status polling | All client reads should stay within Shopify App Proxy. | `useStatusPolling` falls back to hitting the public Cloud Run base when proxy fails. | Bypasses HMAC protections; inconsistent with prod hardening plan. |
| Project list pagination | Proxy supports cursor pagination (`cursor` param). | Hook only fetches first page (`loadMore` exists but no UI surfaces it). | Large project lists may be truncated; new UI must expose pagination or infinite scroll. |
| Clip creation gating | Future spec calls for server-side owner enforcement. | UI appears to allow clip POSTs without additional checks; no claim/owner validation visible. | Potential abuse if unauthorized user guesses videoId; remains TODO. |
| Transcript data normalization | Spec lists server-side normalization (centiseconds, non-overlap). | Legacy editor performs additional client normalization (per compiled bundle), risk of divergence once backend normalization tightened. | Need to align new UI with backend canonical data to avoid duplicate rules. |
| Styling system | Lovable UI expects Tailwind/shadcn tokens and CSS variables. | Current extension ships custom compiled CSS with prefab class names. | Requires a style reset/merge plan to avoid cascading conflicts when importing Lovable components. |
| Source transparency | Spec assumes modular React components (HeroUploader, TranscriptEditor, etc.) exist for reuse. | Only hooks/auth helpers remain in source; main components exist only in minified bundle. | Hard to reuse logic; may need to reimplement or recover history before wiring new UI. |
