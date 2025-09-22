# Lovable UI Wiring Blueprint

_Date: 2025-09-19_

## 2a. Full-Bleed Layout Plan
1. **Single SPA shell** – Keep `src/index.jsx` as the mount point inside `.mc-editor-host`. Replace the HeroUploader/TranscriptEditor conditional with a router-style view manager that renders:
   - `PipelineView` (Lovable `PipelineContainer`) when no `projectId` is selected.
   - `ClipBuilderView` (Lovable `ClipBuilder`) when a project is active.
   State continues to live in `index.jsx` so the existing hash sync (`#pid`) and `window.__mc_project` remain valid.
2. **Full-bleed styling** – Extend `.mc-editor-host` styles to host Tailwind primitives by:
   - Importing the Lovable base stylesheet (Tailwind preflight + CSS variables) at the top of the bundle.
   - Wrapping Lovable content in a `<div className="mc-full-bleed">` that sets `min-height: 100svh`, `width: 100%`, and inherits the full-width offsets already defined in `assets/app-block.css`.
   - Ensuring Shopify theme padding/typography is neutralized via a reset scoped to `.mc-editor-host` to avoid double styling.
3. **View structure** – Each view hosts the Lovable component plus integration scaffolding:
   - `PipelineView` combines the Lovable pipeline UI with the existing projects sidebar (or a mapped replacement) at the left edge, using CSS grid to keep the stage animation centered while the list floats.
   - `ClipBuilderView` composes Lovable `BuildClipSection`, `TranscriptSection`, and `VideoPlayerSection`, plus the projects list / status HUD docked via CSS grid. Reuse the historic two-column layout (`left = 360px sidebar, right = main editor`) to satisfy the full-bleed editor expectation.
4. **Modal & overlay support** – Add a root-level `div` immediately under `.mc-editor-host` for portal mounts so Lovable dialogs/toasts can render without Shopify z-index collisions. Tailwind’s body classes should be mirrored by toggling `.mc-locked` on the host during modal open states.
5. **Asset loading** – Host Lovable static assets (Rive `.riv`, icons) under `src/assets/` in the extension and expose them through Vite’s asset pipeline. Update the Shopify asset manifest to bundle them into `app-block.css/js` without introducing new Liquid tags.

## 2b. Data Contracts by UI Region
| Region | Lovable component(s) | Required data | Backend source | Wiring notes |
| --- | --- | --- | --- | --- |
| Project list / selection | `PipelineContainer` (stage summaries), auxiliary project picker | `[{ id, fileName, status, progress, updatedAt, aiReady, aiError, durationSec }]` | `GET /proxy/projects?limit=30[&cursor][&q]` | Reuse `useProjects` hook, but normalize into Lovable stage model. When selecting a project, update `projectId` and trigger status polling; persist in hash for deep linking. |
| Upload CTA + progress | `StagePanel` Upload stage, Rive animation | Signed upload payload `{ url, videoId, claimToken? }`, upload progress stats, ETA | `GET /proxy/uploads?name=&type=` + direct GCS PUT | Wrap existing Uppy instance with Lovable UI callbacks. Map Uppy progress events to StagePanel `progress` and status fields. Store claimToken in `sessionStorage` for future claim flow. |
| Pipeline stage statuses | `PipelineContainer`, `StagePanel` | Stage statuses (`initializing`, `transcribing`, `ai`, `rendering`, `completed`), progress per stage | Combination of `/proxy/projects` summary + `/proxy/status/:videoId` polling | Define a mapper that converts status payload (`project.status`, `project.aiReady`, `clipStatuses`) into stage progress percentages and CTA states. |
| Transcript + AI suggestions | `TranscriptSection` | Transcript words (`{ w, s, e, speaker }[]`), AI suggestions (`start`, `end`, `summary`, `idea`), skip state | Primary: `projects/{videoId}` Firestore doc via new proxy endpoint; fallback: existing Firestore direct path if `FIRESTORE_DIRECT=true` | Introduce a server-driven transcript fetch (either extend `/proxy/status` or add `/proxy/project/:id`). Until that exists, gate Firestore subscriptions behind a feature flag while implementing a REST pull for production. |
| Clip lane & queue | `BuildClipSection`, `VideoPlayerSection` | Clips `{ id, start, end, status, url, progress }`, active selection | `/proxy/status/:videoId` for current clips, `POST /proxy/clip/:videoId` to enqueue | Adapt Lovable lane state to read from backend clip statuses; disable drag reordering that would conflict with backend order. Clip creation posts to the proxy and injects optimistic `pending` entries. |
| Video playback | `VideoPlayerSection` | Signed stream URL, playback metadata | `GET /proxy/stream/:videoId` | Fetch once per project selection, memoize in state, and refresh when project status flips back to `rendering` (indicating new transcoding underway). |
| Downloads & post-login resume | Lovable download buttons | Download URLs, retry hooks | `clipStatuses[].url`, existing sessionStorage resume logic | Keep the `mc_after_login` pattern; when Lovable download button is clicked while logged out, set the resume context and redirect via `ensureAuthed`. |

## 2c. Dependency & Tooling Adjustments
1. **Tailwind & shadcn assets** – Bring the Lovable Tailwind setup into the extension:
   - Add `tailwindcss`, `postcss`, and `autoprefixer` as dev dependencies, mirror Lovable’s `tailwind.config.ts`, and configure Vite to process Tailwind classes.
   - Import Lovable’s `src/index.css` (or an extracted token file) into the extension entry, scoping selectors under `.mc-editor-host` to reduce bleed.
2. **Component library port** – Copy only the Lovable components actually rendered (`pipeline/`, `clip-builder/`, subset of `components/ui/`). Avoid introducing unused UI primitives per the “no new components” rule; ensure exports stay consistent.
3. **State/query tooling** – Decide between:
   - Integrating TanStack Query (already a Lovable dependency) for network calls with stale-time control, or
   - Reusing existing bespoke hooks. If adopting TanStack, add it to `package.json`, configure a query client in `index.jsx`, and wrap the app in `QueryClientProvider`.
4. **TypeScript support** – Lovable components are TSX; the extension is currently JS. Enable TypeScript in the extension build:
   - Add `tsconfig.json`, update Vite config to handle `.tsx`, and introduce a gradual migration strategy (allow JS + TS). Ensure Shopify build still outputs UMD bundle.
5. **Asset pipeline** – Update `vite.ext.config.ts` to understand Tailwind/PostCSS, handle SVG/PNG from Lovable, and generate hashed filenames that match the `shopify.extension.toml` expectations (or update the TOML to align).
6. **Lint/test footnotes** – If pulling over Lovable ESLint/prettier settings, verify they don’t conflict with the existing build. Given “no local testing” policy, keep scripts minimal (build only) but document how to run lint/build locally if needed.
7. **Auth utilities reuse** – Keep `installAuthFetch`, `ensureAuthed`, and `getShopifySessionToken` untouched. Adapt Lovable data fetch helpers to call `authFetch` so proxy headers stay intact.

These steps set the stage for swapping in the Lovable screens without introducing new UI primitives, while ensuring the Shopify extension continues to operate full-bleed and fully wired to backend contracts.
