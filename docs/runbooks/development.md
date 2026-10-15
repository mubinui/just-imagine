# Local development and handoff

Start with [the checkpoint](../../CHECKPOINT.md) and current review reports in `docs/handoff/`. Source is on `feat/full-development` and has not been pushed.

## Install and verify

Node22.12+ and pnpm10.34.7; Java21 for emulators. `pnpm install --frozen-lockfile`, then `pnpm format:check`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`.

If pnpm is absent, prefix commands with `npm exec --yes --cache .npm-cache --package pnpm@10.34.7 -- pnpm`. This workstation has local Java21 at `.tools/amazon-corretto-21.jdk/Contents/Home`; export `JAVA_HOME` to that path. Tool caches are ignored. CI uses Node22/Java21.

`pnpm test:emulator` starts Auth and Firestore once and runs the backend packages sequentially to avoid port collisions. Use the demo project only. Tests never need Vertex credentials or Stripe secrets. Do not run the production startup entrypoints for unit tests.

## Preview

Run the fake gateway with `pnpm --filter @just-imagine/fixtures dev` (port8787), and the web app with its `dev:fake` script. Demo mode is explicitly separate from real accounts and live generation. See `apps/web/.env.example` for configuration.

Production adapters: api8081; builder8082; gateway8788. They require their documented environment variables and ADC. The builder and deletion worker verify OIDC audience plus the configured task service account. Child worlds arrive over Firestore, never over WebSocket.

## Data lifecycle

All browser writes go through authenticated API endpoints or the web session route. Firestore client rules permit only owned reads. Deletion records are durable in `deletionJobs`, with account/profile fences in `deletionLocks`; CloudTasks and the five-minute Scheduler retry worker finish cleanup. Gateway/builder publication must check the same fences. Do not delete fences before in-flight jobs have stopped.

Only synthetic PCM appears in tests. Real PCM is relayed in bounded memory buffers, never persisted. Transcripts are bounded session memory and discarded on end. Logs must not include transcript/audio/token/Stripe payloads.

## Reviews

Do not equate package tests with release readiness. Check the current engine and backend review reports for unresolved findings. Browser/device performance, real Rive files, external credentials, model availability, production data retention and load/evaluation gates need explicit evidence.
