# Spec vs Implementation Gaps

_Date first logged: 2025-09-19_
_Last updated: 2025-09-27_

## Resolved gaps

| Area | Spec expectation | Current implementation | Notes |
| --- | --- | --- | --- |
| Theme asset wiring | `shopify.extension.toml` exports `app-block.v4.{css,js}` | Vite build now emits `assets/app-block.v4.css` and `assets/app-block.v4.js`, matching the extension TOML. | Resolved – deploy pipeline no longer needs a rename shim. |
| Anonymous upload claiming | Anonymous uploads receive a `claimToken` that must persist until login. | `web-app/src/lib/api.ts` stores claim tokens in session storage and replays them via `/proxy/claim` once the user authenticates. | Resolved – anonymous uploads can be reclaimed post-login. |
| Firestore access | Production UI should rely on proxy APIs with `FIRESTORE_DIRECT=false`. | The Lovable UI calls the `/apps/moodclip-uploader-v4/proxy/*` REST layer; no Firebase SDK usage ships in the bundle. | Resolved – realtime Firestore reads have been removed from the shipped UI. |
| Status polling | All reads should stay within the Shopify App Proxy. | Pipeline status uses React Query + `fetchProjectStatus`, which only targets `/apps/moodclip-uploader-v4/proxy/status/:id`. | Resolved – no fallback to the public Cloud Run host remains. |
| Styling system | Align extension styling with Tailwind/shadcn token strategy. | `web-app/src/index.css` defines the shared design tokens and gradients used across the new UI. | Resolved – Lovable components can share the token set without conflicts. |
| Source transparency | Keep reusable React source (HeroUploader, TranscriptEditor, etc.) in-repo. | Both the extension shell (`src/`) and Lovable web app (`web-app/src/`) ship readable React components and hooks. | Resolved – no reliance on minified-only bundles. |
| Project list pagination | App proxy supports cursor pagination via `cursor` parameter. | `extensions/moodclip-projects/src/ProjectsView.tsx` now consumes `nextCursor` and renders a load-more button; `app/routes/proxy.projects.ts` issues ordered batches with stable cursors. | Resolved – customer account history paginates without truncation. |
| Clip creation gating | Server must validate clip requests against project ownership. | `app/routes/proxy.clip.$videoId.ts` derives the authenticated customer and enforces owner/shop checks before queuing Pub/Sub jobs. | Resolved – clip POSTs require ownership, eliminating blind `videoId` guesses. |
| Transcript data normalization | Backend should be the canonical normalization pass. | `web-app/src/pages/ClipBuilder.tsx` now trusts backend timestamps, only heuristically normalizing legacy fallbacks. | Resolved – UI stays aligned with canonical transcript timing. |

## Outstanding gaps

_None – all known spec mismatches are currently addressed._
