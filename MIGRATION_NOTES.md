# Shopify Store Migration – ehwnpu-nk

## Repo layout checks
- Confirmed `backend/` houses the Remix + Shopify stack expected for `mf-backend-restore/`.
- `backend/shopify.app.toml` updated; serves as active Shopify CLI config.
- Admin UI extension lives at `backend/extensions/moodclip-uploader/` (maps to prior `moodclip-uploader-v3`).
- Customer Accounts UI extension already present at `backend/extensions/moodclip-projects/`.
- Proxy handlers (e.g., `backend/app/routes/proxy.uploads.ts`) and other Cloud Run routes present under `backend/app/routes/`.
- Session/auth handled in `backend/app/shopify.server.js`; runtime secrets still sourced from GCP.

## Shopify CLI context
- Authenticated as `alexyoonenquiry@gmail.com` (Partner org for the ehwnpu-nk store).
- Active config: `shopify.app.toml` linked to app `moodclipnewstore-2` (`client_id` 7e9a8625d8e0665ab092baff1aee8ab3).
- Store targeting: `backend/.shopify/project.json` now pinned to `ehwnpu-nk.myshopify.com`; CLI commands default to the new live store.

## Deployment record
- 2025-10-06 @ 12:02 UTC — `shopify app deploy --force` released version `moodclip-v2-4` (contains `moodclip-projects` + `moodclip-uploader-v2`).
  - Partner link: https://dev.shopify.com/dashboard/186372764/apps/286185455617/versions/752427040769

## Cloud Run revision
- 2025-10-06T13:47Z — Deployed revision `mf-backend-00304-wgp` with fresh secret versions (`SHOPIFY_API_KEY` v4, `SHOPIFY_API_SECRET` v4) after re-seeding trimmed Partner credentials.

## Install link for live store
- https://ehwnpu-nk.myshopify.com/admin/oauth/authorize?client_id=7e9a8625d8e0665ab092baff1aee8ab3&scope=read_products,write_products,write_script_tags&redirect_uri=https://mf-backend-270455452709.us-central1.run.app/auth/callback&state=install-check
- If Shopify shows “app and shop belong to different organizations,” ensure the app and store sit in the same Partner org before retrying.

## Manual verification checklist
1. Install the app in `ehwnpu-nk` using the link above; confirm OAuth completes without errors.
2. In Admin → Apps, open moodclipnewstore-2 and verify the Admin UI extension renders the uploader UI with proxy calls succeeding.
3. Visit Customer Accounts (new accounts experience) and confirm the `MoodClip Projects` extension renders without console errors.
4. Trigger an upload via the Admin UI and confirm Cloud Run logs show traffic to `/proxy/upload*` endpoints using the new store domain.
5. Verify script tag / product write operations still succeed (publish a sample project, ensure Shopify product updates succeed).
6. Check that the app proxy path `/apps/moodclip-uploader-v4/...` resolves correctly for the new store.
7. From GCP → Cloud Run → `mf-backend`, confirm revision `mf-backend-00303-4xc` is serving 100% traffic and health checks remain green.

## Rollback plan
- Secrets: revert `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET` to version `2` via `gcloud secrets versions access` / `add` as needed, then redeploy Cloud Run with those versions.
- Cloud Run: redeploy service `mf-backend` with revision `mf-backend-00302-gl8` (previous good) or rerun `gcloud run services update` after pointing env vars back to secret version 2.
- Disable/rotate the new app credentials in Partner Dashboard if reverting; confirm the old partner app remains active before revoking.
- Once rollback completes, uninstall moodclipnewstore-2 from `ehwnpu-nk` to avoid mixed credential usage.
