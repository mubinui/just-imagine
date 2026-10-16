# Personal companion implementation — 2026-10-16

User direction: a parent supplies a child's photo to create a chibi friend, powered by Gemini 3.8 Live, which accompanies the child and helps navigate. Confirmed: photo is optional; ready-made friends remain available. Preserve the approved cream/forest design.

Research: profiles currently contain a stock avatar only; child routes share a layout but Studio owns/disposes voice; Gemini provider uses Vertex; the tool set has no navigation. Existing ownership, deletion fences, microphone/audio client, quotas, authored cast and provider abstractions can be reused.

Implementation:

1. Extend protocol with an optional personal companion, bounded photo request and named child destinations; old profiles continue to work.
2. Add parent-owned photo generation: validate/normalize JPEG/PNG/WebP, explicitly consent, generate a chibi with the image model, retain only a bounded generated WebP in the private child profile. Serialize generation and check ownership/deletion fences before publication. Ready-made selection remains available if generation is unavailable.
3. Preserve one voice session across child routes, add validated navigation tools and screen acknowledgements, and personalize the Live prompt without treating profile strings as instructions. Keep Gemini 3.8 Live, with server-side API-key support alongside Vertex.
4. Add parent companion setup, profile artwork, and a child companion navigation surface using the incumbent design. Keep parent account/billing actions outside the voice destination set. Photo generation is honest about missing credentials in preview.
5. Test schema/auth/image bounds, concurrent/deletion behavior, navigation validation, voice lifecycle and browser route transitions. Update checkpoint and TODO.

Source photo exists only for the generation request; no raw photo is written to app storage. Provider-side retention remains governed by the selected Gemini service. Generated artwork is an animated portrait, not a rigged Rive character. Credentialed photo generation and real microphone/live verification require configured Gemini access. Docker orchestration is now implemented; see `docs/handoff/local-development.md`.

## Implemented source

- `packages/protocol`: backward-compatible optional preset/chibi profile; bounded photo/consent body; allowlisted child navigation and current-screen messages.
- `services/api/src/companion.ts`: metadata-stripping image normalization, Gemini image generation and output moderation, private bounded WebP stored in the owned child document. Three attempts per child/day, active-request serialization, stale-result cancellation and deletion fences. Replacing the friend retains attempt accounting. The source photo is never written to app storage. Child/account deletion removes generated artwork and request bookkeeping.
- `services/gateway`: Gemini 3.8 Live remains the default; `GEMINI_API_KEY` selects server-side Gemini API authentication, otherwise existing Vertex/ADC remains. Personal display name is untrusted context data. `navigate` accepts only `play`, `studio`, `gallery`; the browser confirms its new screen. `openWorld` verifies ownership before updating the session.
- `packages/characters`: credential-free session snapshot and multiple status subscribers. Shared child layout owns disposal; Studio/Gallery route changes preserve the voice connection. Profile changes, leaving the child layout and explicit stop/finish end it.
- `apps/web`: signup opens explorer setup; after saving a profile the parent can name/select a friend or upload a photo with permission. The companion appears in profile selection, active/inactive cast slots and the navigation menu. Adult screens stay outside the voice tool. Nonmodal menu has first-action focus, Escape/Close focus restoration and SVG navigation icons. Preview honestly disables photo drawing and voice capture; ready-made persistence/navigation works there.

## Configuration / acceptance

API service: `GEMINI_API_KEY` (or `COMPANION_VERTEX=1` with ADC/project), `COMPANION_IMAGE_MODEL=gemini-nano-banana-2.1`, `FAST_MODEL=gemini-3.8-flash`. Gateway: `GEMINI_API_KEY`, `LIVE_MODEL=gemini-3.8-live`, `FAST_MODEL=gemini-3.8-flash`; existing Firebase/project/builder/task configuration is still required. Keep secrets server-side. A key in a local file must be explicitly loaded into each service's environment; adding it does not turn `NEXT_PUBLIC_FAKE=1` into real mode.

Photo generation is synchronous with bounded provider timeouts and 120s request leases; use a request-capable hosting timeout for this endpoint. Upload limit: 4MiB encoded-source bytes / 16MP / one image; output: at most130KB WebP (512px). Stored profile art is excluded from Firestore indexing. Private profile art is small enough to return with the profile rather than expose a public child-photo asset URL.

Real Gemini Live speech, browser microphone transcription, tool-driven game creation and parent upload→generated chibi→save/reload are verified. The image test used synthetic artwork; likeness fidelity still needs a parent-supplied photo. Photo motion currently responds with a gentle speaking gesture; this is not a rigged face/lip-sync animation. Source provider data retention is outside the app's in-memory source-photo lifetime. The Docker3300 app uses real services and persistent demo identities, with the key in root `.env.local`.
