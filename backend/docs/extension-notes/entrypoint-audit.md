# Theme App Extension Entry Point Audit (Moodclip Uploader v3)

_Date: 2025-09-19_

## Host surface
- `blocks/app-block.liquid` mounts a bare `<div id="root">` inside the theme section and defers loading `app-block.umd.js`. The script tag injects the section title via a `data-title` attribute but otherwise leaves layout to the React bundle. No additional HTML wrappers are present, so full-bleed behavior must be driven by CSS/JS.
- The liquid schema exposes a single `title` setting with default copy "Upload Your Video". No alternate blocks or presets exist, so this is the lone entrypoint currently shipped to Shopify merchants.

## Compiled assets delivered to Shopify
- `assets/app-block.css` inlines the compiled stylesheet for the uploader/editor experience. It establishes the `.mc-editor-host` full-bleed container (position offsets to -50vw), styles the HUD, transcript list, clip rail, and video player, and includes the color variables used by today’s hero/editor UI. This CSS is the production output of the extension build; no Tailwind or shadcn tokens are currently present.
- `assets/app-block.umd.js` is the Vite-generated UMD bundle containing the React app. It bootstraps the `App` component exported from `src/index.jsx`, registers event listeners, and hydrates the `#root` element. (The source is minified; logic lives in `src/`.)

## Runtime bootstrap & layout helpers
- `src/index.jsx` is the top-level React entrypoint. It installs the custom `fetch` wrapper via `installAuthFetch`, restores deep links from `#pid`, syncs the current project to `window.__mc_project`, and conditionally renders either `<HeroUploader>` or `<TranscriptEditor>` based on whether a `projectId` is active. It also handles post-login resume actions (e.g., download redirects) from `sessionStorage`.
- `src/components/EditorHost.css` defines the same `.mc-editor-host` full-bleed rules used by the compiled CSS, ensuring that during local dev the layout matches the compiled asset behavior.

## Build & configuration wiring
- `shopify.extension.toml` declares the theme app extension (`type = "theme"`) and maps the deployed asset filenames to `app-block.v4.css`/`app-block.v4.js`. The current repo assets are named `app-block.css`/`app-block.umd.js`, so the build step or deploy process must rewrite filenames (worth double-checking before the Lovable UI lands).
- `package.json` uses Vite (`vite.ext.config.ts`) to build the bundle and lists runtime dependencies such as `@shopify/app-bridge`, Polaris, Firebase, and Uppy—the stack that powers the existing uploader/editor screens.

## Key observations for upcoming wiring work
- The only HTML anchor is `#root` inside `.mc-editor-host`; any Lovable.dev UI must hydrate into this same container to preserve Shopify section compatibility.
- Full-bleed behavior depends entirely on the compiled CSS. When we swap in the Lovable UI we will need to update both the source styles and the generated asset to maintain margin resets.
- Asset naming drift between the TOML (`app-block.v4.*`) and checked-in files needs confirmation so we do not break Shopify when replacing bundles.
- Because `installAuthFetch` is applied globally at bootstrap, any new data-fetching strategy must continue to route through that wrapper (or intentionally replace it) to maintain App Proxy HMAC handling.
