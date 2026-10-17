# Running the complete local app

Use **http://localhost:3300**, not the fixture preview on3200. The3300 build has `NEXT_PUBLIC_FAKE=0`. Gemini voice, generated worlds, generated companion images and saved family data use the actual service implementations. Firebase Auth/Firestore and task delivery run locally in Docker; cloud account infrastructure can be connected later.

## Demo identities

- Parent email: `parent@justimagine.test`
- Password: `ImaginePlay!2026`
- Parent dashboard: http://localhost:3300/parent/dashboard
- Child experience: http://localhost:3300/play → **Ari**, with companion **Pip**.
- Children use a parent-owned explorer profile, not a child email/password account.
- This demo family has Family allowances and Labs enabled for testing. It has no Stripe subscription and creates no charge.

Sign in first, choose Ari, permit the microphone, and tell Pip what to make. **Build a game** starts a fresh idea; previous worlds stay in **My worlds**. Parent → Explorers contains the optional photo-to-chibi setup. A ready-made friend works without a photo.

## Key and commands

Put `GEMINI_API_KEY=your_key` in root `.env.local`. This file is gitignored, excluded from Docker builds, mode0600, and passed only to the API/builder/gateway containers. Never use a `NEXT_PUBLIC_` variable for it.

```sh
pnpm local:start       # build and start the stack
pnpm local:status
pnpm local:logs
pnpm local:reload-key  # after changing the key
pnpm local:stop        # preserve volumes and export emulator data
```

Without pnpm on PATH, `node scripts/local.mjs start` (or `status`, `logs`, `reload-key`, `stop`) works with Docker Desktop alone. Keep Docker Desktop running. Browser microphone access works on localhost. Generated games combine validated scene data with JavaScript isolated in a budgeted Game API worker. Independent acceptance plans exercise their actual controls in the real headless physics engine before publication.

Ports: web3300, API3301, builder/artwork3302, gateway8788, Auth9099, Firestore8080. All published ports bind to127.0.0.1. Docker volumes retain Firebase data and generic generated world artwork. Firebase imports/exports `/data/firebase/snapshot` inside its volume; full restart and fresh sign-in with the saved game have been verified. Original avatar photos are normalized in memory and not stored by the app; generated chibi art stays in the private child profile.

Local adapters require `LOCAL_DEV=1`, a `demo-` project, both Firebase emulator hosts, and no Cloud Run `K_SERVICE`. Production still uses Cloud Tasks and Cloud Storage. Local build jobs have persisted claims, renewals and bounded retries. Deletion removes queued payloads and fences running writers.

Game authoring now has its own server-only `GAME_MODEL` setting (default `gemini-4-argon`) and `GAME_MODEL_LOCATION` (default `global` for Vertex credentials). Local `SCENE_MODEL` also defaults to Argon; `FAST_MODEL`, image models and Live remain separate. The game author never silently changes model. A nested-schema400 can retry in JSON mode on the same model, followed by strict local validation. The existing scene model adapter retains its separate availability fallback. See [generated-game-quality-plan.md](generated-game-quality-plan.md) for the request-derived physics acceptance gate and visual-layer correction.

## Acceptance state

Parent signup, fresh sign-in, explorer creation, companion saving, Live speech/captions, browser PCM transcription, independent validated scene generation and independent companion-image generation/moderation have passed. The real browser voice→queued build→generated artwork→rendered world→new-game reset→gallery flow also passed with zero page errors. Parent upload→generated chibi→saved profile reload passed. All344 unit/integration tests and10 preview browser tests passed; see CHECKPOINT.md for logs. The image test used synthetic artwork, not a child's photo; likeness quality still needs a parent-supplied photo.

Stripe checkout requires separate Stripe TEST configuration. Cloud deployment, device usability/latency evaluation and release acceptance are distinct from local app operation.
