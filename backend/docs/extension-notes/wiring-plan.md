# MoodClip Wiring Plan

_Date: 2025-09-19_

1. Extension & Spec Audit *(completed)*
   - 1a. Catalog Shopify extension entrypoints and document their responsibilities.
   - 1b. Map existing React feature modules to backend tech spec.
   - 1c. Compare Lovable frontend components to current extension surfaces.
   - 1d. Log mismatches and gaps between spec and implementation.

2. Integration Blueprint *(completed)*
   - 2a. Define the full-bleed layout structure for the Lovable UI inside the Shopify host.
   - 2b. Enumerate data contracts for each UI region and align them with backend endpoints.
   - 2c. Outline dependency/tooling adjustments required to host the Lovable stack.

3. Lovable Mock UI Bring-up *(completed)*
   - 3a. Select the minimal Lovable components (pipeline, clip builder, shared UI) to port with mock data only.
   - 3b. Establish temporary styling import (Tailwind tokens, CSS reset) and mount the mock UI inside `.mc-editor-host` without backend wiring.
   - 3c. Verify the mocked screens render full-bleed in the Shopify extension build and document screenshots/notes for reference.
   - 3d. Record any layout or asset issues discovered during mock integration so they can be addressed before live wiring.

4. Backend Contract Validation & Prep
   - 4a. Inspect App Proxy routes and confirm response shapes and auth behavior match frontend requirements.
   - 4b. Review Firestore document structures and downstream workers to ensure Lovable UI has the data it needs.
   - 4c. List backend tweaks or flags required to support the new UI without introducing new features.

5. Frontend Integration Execution
   - 5a. Land the Lovable UI foundation in the extension repo while preserving existing auth/install hooks.
   - 5b. Wire the pipeline/upload flow to `/proxy/uploads` and `/proxy/projects` with real progress and claimToken handling.
   - 5c. Connect the clip builder to status polling, AI suggestions, clip queueing, and download actions.
   - 5d. Remove legacy components once parity is achieved and ensure full-bleed/responsive behavior.

6. Stabilization & Rollout
   - 6a. Update configuration, docs, and collaborators’ notes so the new wiring approach is clear.
   - 6b. Prepare deployment steps for backend tweaks (if any) and extension publish flow.
   - 6c. Compile a post-deploy verification checklist focused on remote validation (Shopify Admin smoke tests).
