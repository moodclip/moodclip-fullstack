# Lovable Mock UI Bring-up Notes

_Date: 2025-09-19_

## What was wired
- Imported Lovable.dev source (components, data, hooks, assets) under `src/lovable/` and configured Vite/TypeScript aliases so `@/...` resolves correctly inside the Shopify extension build.
- Installed Tailwind + shadcn dependencies and copied the Lovable design tokens (`src/lovable/index.css`) so the mock screens render with the intended cinematic styling.
- Added `LovableMockApp` (`MemoryRouter` + React Query + tooltip/toaster providers) and mounted it from `src/index.jsx`, keeping the existing auth fetch shim and Shopify hydrate markers.
- Replaced the legacy HeroUploader/TranscriptEditor shell with a full-bleed container that simply renders the Lovable mock pipeline + clip builder using the bundled mock data.
- Updated the pipeline `StagePanel` to import the Rive animation asset via Vite so it resolves inside the Shopify asset bundle.
- Verified `npm run build` succeeds; the resulting bundle (app-block.umd.js) is ~5.6 MB (3.56 MB gzip), so we should plan a size pass once the wiring is complete.

## Outstanding visual checks to perform after deploy
- Confirm the `.mc-full-bleed` host plus Tailwind base keeps the section edge-to-edge without Shopify theme padding bleeding through.
- Validate the Rive upload animation loads (asset is now bundled via import); if it fails, double-check CSP or MIME handling in the extension.
- Ensure the MemoryRouter route swap (`Build clips` CTA → `/build-clip`) works when embedded in Shopify, and the “Back to Pipeline” control returns to `/`.
- Check for z-index overlaps between Shopify theme headers and Lovable toasts/tooltips (portals render inside the extension DOM now).
- Sanity-check that the Lovable background gradients don’t clash with the underlying theme background (we force `document.documentElement` into `dark` mode).

## Follow-up items before live wiring
- Replace the mock data sources (`initialPipelineData`, `mockClipBuilderData`) with real `/proxy` + Firestore-backed hooks per the integration blueprint.
- Restore project selection/hash handling once backend wiring comes online so deep links into `/build-clip` keep functioning.
- Audit bundle size after the Tailwind import and trim unused Lovable components if tree-shaking does not remove them automatically.
