# React Surface ↔ Backend Contract Mapping

_Date: 2025-09-19_

This note captures how the shipped Shopify extension screens interact with the backend today, based on the remaining source (hooks, auth helpers, Firebase bootstrap) plus the compiled bundle. It highlights where behavior matches the tech spec and where gaps remain.

## Upload front door ("HeroUploader")
- Dependencies in `package.json` (`@uppy/*`, `firebase`) and the compiled bundle confirm the uploader is an Uppy-powered flow. It requests a signed URL from `/apps/moodclip-uploader-v4/proxy/uploads`, then streams the file directly to GCS—aligning with the technical spec’s upload sequence.
- Auth: `installAuthFetch()` injects the `X-MC-Token` header on `/proxy/*` calls, matching the spec’s requirement to pass claim tokens/session proof to the App Proxy.
- Deviations: We do not see any code persisting or replaying the `claimToken` returned for anonymous uploads. That handshake is likely still missing, so anonymous → logged-in project claiming remains unimplemented.

## Project roster & status surfaces (sidebars, HUD)
- `hooks/useProjects.ts` polls `/proxy/projects` every 30s, stops once all items are terminal, and exposes pagination. This matches the App Proxy contract in the spec (shop/customer-scoped listing ordered by `createdAt`).
- `hooks/useStatusPolling.ts` polls `/proxy/status/:videoId` with a session token fallback to the public Cloud Run URL, exactly matching the documented status contract (`project`, `clipStatuses`, `aiSuggestions`).
- Deviations: the status hook still fans out to the public Cloud Run domain when the proxy fails. The target state in the spec (all client reads through the proxy, no direct origin hits) is not yet enforced.

## Transcript editor & AI suggestions
- `src/firebase.ts` boots the Firebase web SDK with Firestore persistence + long polling so the iframe can subscribe directly to `projects/{videoId}`. This matches the “Current (dev)” note in the spec but conflicts with the “Target (prod)” goal of disabling client-side Firestore reads.
- The compiled bundle still contains Firestore onSnapshot logic (confirmed by token strings and Firebase imports). The AI highlight UX therefore depends on realtime Firestore reads instead of proxy polling alone.
- Deviations: need a build flag or alternate data path to honor the FIRESTORE_DIRECT=false plan.

## Clip queue controls (clips list, toolbar)
- Clip creation flows route through `/proxy/clip/:videoId` (present in bundled strings and required for render queueing). Download buttons open the signed URLs returned in `clipStatuses`, consistent with the spec’s 202 Accepted enqueue flow and 7-day signed download URLs.
- Deviations: there’s no evidence of the server-side claim flow or logged-in checks before enqueuing clips (UI-only gating).

## Auth guards & session handling
- `lib/auth-gate.ts` matches the documented dual-path auth: `/proxy/ping` health checks, Shopify login redirect with `#pid` preservation, optional Google OAuth start, and `X-MC-Token` propagation. `lib/session.ts` uses App Bridge session tokens, aligning with the spec’s allowed auth methods.
- Deviations: the guard cache is short (4s) and there is no optimistic UI for claimToken promotion; otherwise it matches spec expectations.

## Summary of gaps vs spec
1. Anonymous upload claimToken persistence / replay is still absent.
2. Firestore direct reads remain hardwired; no `FIRESTORE_DIRECT` guard exists in the bundle.
3. Status polling still falls back to the public Cloud Run base URL instead of staying proxy-only.
4. No evidence of UI enforcing owner checks before clip creation; spec calls out server-side gating as future work.

These mismatches should be addressed (or deliberately re-specified) before we swap in the Lovable.dev UI to avoid regression during the wiring rewrite.
