# Development checkpoint

Updated: 2026-10-15. Owner: Codex. Status: active implementation.

## Resume here

Read this file, TODO.md, and the master plan before editing. The user authorized completing development and requested this persistent handoff. Work is on `feat/full-development`; initial foundation files were already uncommitted. Preserve existing work and the A3 web plan. No push, deployment, or production credentials have been used.

Current step: all application/service packages now exist. Web passed production builds, 12 unit tests and 4 browser flows. Engine review fixes are active; backend race fixes are undergoing regression tests. Next: finish review fixes, close remaining operations/evaluation gaps, run full workspace verification and update this handoff. Credentialed cloud and real-device checks remain separate external gates.

## Baseline

- Config, scene-schema, protocol, fixtures implemented.
- 164 tests passed in the preceding session; lint/typecheck/format and browser bundle checks passed.
- Four fixture worlds and a real loopback fake WebSocket gateway are available.
- Runtime Node 25.8.0; target Node >=22.12; pnpm 10.34.7.
- pnpm runner if pnpm is absent: `npm exec --yes --offline --cache .npm-cache --package pnpm@10.34.7 -- pnpm`.

## Milestones

- [x] Shared contracts and fixtures (Plan 0 tasks 1–13, 17–18).
- [x] Firebase server-core, quota integration tests, CI source (remote CI not activated).
- [ ] A1 simulation engine and renderer.
- [ ] A2 browser audio, voice client, character presentation.
- [ ] A3 marketing, auth, child Studio/gallery, parent management.
- [ ] B1 authenticated conversation gateway and Live adapter.
- [ ] B2 world/patch builder and asset pipeline.
- [ ] B3 account/profile/world/billing API and security rules.
- [ ] B4 infrastructure, deployment configuration, operations.
- [ ] Workspace integration, browser tests, security review.
- [ ] Credentialed staging verification and performance/evaluation gates.

## Decisions and review ledger

- Ruling: Continue local source development on a feature branch, retaining existing uncommitted files; publishing remains a separate action.
- Ruling: The design spec and current shared contracts govern missing A1/A2/B1–B4 detailed plans. Write scoped implementation briefs before their implementation.
- Ruling: Specified future model IDs and vendor versions must be verified before live use. Keep adapters configurable and report availability honestly.
- Ruling: Use repository-native Next.js/Firebase hosting, as explicitly established by the spec, rather than registering a separate Sites-hosted copy.
- Plan 0 review: plain ULID generation does not guarantee sorting in the same millisecond; use monotonic IDs. Reject nonfinite quota increments and malformed stored usage. Treat invalid kill-switch configuration/read failures conservatively.
- Integration boundaries: engine consumes SceneDoc; web consumes protocol/WorldSource; gateway sends control+PCM only; builder publishes worlds through Firestore; API owns parent writes. Shared schema changes require teammate review.

## External prerequisites / unverified gates

Firebase/Google Cloud projects, ADC, model availability, Stripe test credentials and price, final Rive/art assets, deployment IAM, real-device performance, child usability sessions, load test, and production release remain unverified. These do not prevent local implementation.

## Latest verification

Baseline only; new work verification will be appended here and in docs/handoff reports.

### Foundation milestone

36 tests pass against actual Firestore/Auth emulators, including ten consecutive quota races. Scoped lint/typecheck/format pass. See docs/handoff/foundation-report.md. Java21 is in `.tools/amazon-corretto-21.jdk/Contents/Home`; export JAVA_HOME for emulator commands.

### API and audio progress

API: 11 emulator-backed tests pass, including profile races, ownership, deletion, Stripe signature/idempotency, and Firestore rules. See docs/handoff/api-report.md; durable deletion and production billing still need review.

Characters/audio: 7 tests pass for PCM conversion, bounded playback/flush, reconnect identity, terminal cleanup, audio unlock gating. Real microphone/Safari and Rive asset verification pending. Engine implementation is underway with headless Rapier tests.

### Engine milestone and review follow-up

Engine source: 7 headless Rapier tests, typecheck/lint pass; browser bundle 820,517 bytes gzip. Web implementation started against stable API. Review found important physics/lifecycle issues; see docs/handoff/engine-review.md. Engine is NOT release-complete until those fixes pass regression tests.

API review found deletion durability and billing ordering/concurrency defects. Current fixes add persistent deletion jobs/tombstones, retryable Auth cleanup, per-account billing leases, reused pending checkout and authoritative subscription reconciliation. Regression and re-review pending. Builder source underway; initial pipeline tests failed missingmodule before implementation.

### Integration checkpoint

All three backend bundles build successfully. Gateway:5 tests (real localWebSockets), builder:6 tests including emulator progressivepublish/idempotency/deletionfence, API:12 emulator-backed tests, foundation36 emulator tests. Root `pnpm test:emulator` now runs sharedemulators sequentially across core/API/builder and passed. `pnpm test` combines packageunit tests with this gate.

Infrastructure source now includes Terraform CloudRun/IAM/Firestore/GCS/Tasks/Secrets/deletionretryScheduler, Dockerfile, CloudBuild imagebuild andk6scaffold. Terraformformatpassed; providerinit/validatepending. No cloudchanges. Webfirstpasscomplete, build/browserchecks inprogress. API/backend rereview inprogress. Enginecriticalreviewfixes remain priority next.

### Hardening checkpoint

Web first pass: real and fake optimized builds, typecheck/lint, 12 unit tests and 4 Playwright flows pass. Actual WebGL/audio unlock/voice, parent CRUD, mobile layouts, predictions/dials/keypad checked. Read-only web/audio review active. See docs/handoff/web-report.md.

Backend review fixes now implemented: individual-world deletion tombstones; atomic patch/version/job completion; bounded gateway control queue and independent shutdown/metering; finish attempted on metering failure; account-fenced daily usage; serialized billing portal/customer persistence; atomic monotonic session/daily metering; failed world/job notifications. New emulator regressions underway. Seven gateway unit/WebSocket tests pass. Terraform provider initialization and validation passed locally; no deployment.

Engine implementer is addressing all ten findings from docs/handoff/engine-review.md. Do not mark the engine release-ready until scoped re-review. Remaining source work includes observability/evaluation setup and fuller sprite collision post-processing.

### Review closure progress

Backend emulator regressions passed: server-core37, API14, builder7, gateway8 (66 total across shared emulator run). Characters now8 tests including delayed microphone permission cancellation. Sprite processing now performs alpha despeckling, traced outline simplification and convex decomposition bounded to40 points/12 parts, with concavity regression. Engine25 tests plus real WebGL lifecycle smoke passed; scoped re-review identified a few remaining collider/body-patch edge cases to fix next.

Web review fixes implemented for saved-world voice identity, microphone cancellation, slider coalescing, keyboard entity actions, progressive control-state preservation/reset, challenge feedback, parent Labs controls and weekly activity. Scoped review surfaced timer/world identity cleanup follow-ups, now being corrected. Telemetry source includes privacy-limited JSON events and opt-in Cloud Trace export; Terraform adds metrics, alert policies, uptime checks, dashboard and optional HTTPS CDN. Terraform validate passes. Builder evaluation/prompt/extra Labs fixtures work active. Whole-workspace verification still pending after these changes.

## Parallel session notes (Claude Code, 2026-10-15 23:55)

- Added the brand mark ("Dream Launch": a thought cloud launching a star along a projectile arc) mapped to the `globals.css` tokens (tile `--accent` #245e4e, cloud `--ground` #fff9ee, star `--yellow` #f7d76e, dots `--peach` #f9ceb0). New files only: `apps/web/components/Mark.tsx` (inline SVG), `apps/web/app/icon.svg`, `apps/web/app/favicon.ico` (16/32/48), `apps/web/app/apple-icon.png` (180, full bleed), `apps/web/app/manifest.json`, `apps/web/public/icons/{icon-192,icon-512,icon-512-maskable,og-mark}.png`.
- Edited only two existing files, minimally: `apps/web/components/Shell.tsx` (Brand renders `<Mark size={32} />` instead of the ✦ placeholder) and `apps/web/app/layout.tsx` (adds `openGraph.images` and a `viewport` export with `themeColor`). `globals.css` was not touched; its `.brand-mark` colour and font-size rules are now unused and can be dropped whenever convenient.
- Verified with `tsc --noEmit` and eslint on the touched files. Nothing committed; Claude Code does not commit on this branch unless the user asks.
