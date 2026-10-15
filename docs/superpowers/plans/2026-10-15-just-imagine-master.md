# Just Imagine Master Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build Just Imagine, a Google Cloud SaaS where a child aged 6 to 13 talks with animal companions (6 to 10, Playgrounds) or summons guide characters (9 to 13, Labs) and turns imagination into an interactive, physics-respecting 2.5D world with live maths and physics visualizations, in 6 weeks with two developers.

**Architecture:** A contract-first TypeScript monorepo. The browser streams audio to a Cloud Run WebSocket gateway that holds a Vertex AI Live session per child; a Genkit builder on Cloud Run turns conversation into a Zod-validated Scene DSL that a PixiJS plus Rapier2D engine renders; Firestore delivers worlds progressively; an api service handles accounts, quotas, and Stripe.

**Tech Stack:** TypeScript 5.9+, Node 22, pnpm workspaces, Turborepo, Zod 4, Vitest, Playwright, Next.js (App Router) on Firebase App Hosting, PixiJS v8, Rapier2D (`@dimforge/rapier2d-compat`), Rive (`@rive-app/canvas`), Fastify, `ws`, `@google/genai` (Vertex mode), Genkit with `@genkit-ai/google-genai`, Firebase Admin and Firebase client SDKs, Stripe, Terraform, GitHub Actions, Cloud Build.

**Spec:** `docs/superpowers/specs/2026-10-15-just-imagine-design.md`

## Global Constraints

Every task in every module plan implicitly includes these. Values are copied from the spec.

- Node `>=22.12`, TypeScript `strict: true` with `noUncheckedIndexedAccess`, ESM only (`"type": "module"`), pnpm workspaces, Turborepo. Shared packages export TypeScript source directly (`"exports": { ".": "./src/index.ts" }`); services bundle with tsup at deploy time.
- Zod 4 for every schema. Every message, job payload, Firestore document, and REST body that crosses a service boundary has a Zod schema in `packages/scene-schema` or `packages/protocol` and is parsed at the boundary.
- Models, by exact ID, always through Vertex AI in `us-central1` with Application Default Credentials and never from the browser: `gemini-3.8-live` (voice), `gemini-4-argon` (world builder), `gemini-3.8-flash` (patches, summaries, moderation, image safety check), `gemini-nano-banana-2.1` (hero sprites, backdrops), `gemini-3.1-flash-lite-image` (props), `gemini-3.8-flash-tts` (cached reaction clips), `gemini-3-pro-image` (one-time mascot art).
- Regions: Cloud Run and Vertex AI `us-central1`; Firestore `nam5`; Cloud Storage US multi-region.
- Age bands `6-7`, `8-10`, `11-13`; tiers `playground` and `lab`. Characters by id: companions `mishti`, `bhombol`, `chandni`; guides `pori` (Physics Fairy, all bands), `onkomama` (Math Man, 8-10 and 11-13), `jadukaka` (Magic Man, all bands). Display names and voices live only in `packages/protocol/src/characters.ts`.
- Lab extension of the DSL: at most 6 variables, 6 visuals, 3 challenges per world; spells are runtime messages, never document fields. Lab kinds this round in order: graphs and functions (projectile), probability and data (Galton board), fractions.
- Scene DSL limits: 24 entities, 16 joints, 12 rules, 8 materials, 3 dials; sprite and particle size 0.2 to 8 m; ground and water up to 16 m; bounds 16 by 9 m; density 0.05 to 20; mass 0.01 to 2000 kg; 1 to 3 concepts per world.
- Audio: client to gateway PCM16 mono 16 kHz in 20 ms frames (320 samples); gateway to client PCM16 mono 24 kHz in 20 ms frames (480 samples). Binary WebSocket frames carry audio only; JSON text frames carry everything else. World content never travels over the WebSocket; it is read from Firestore.
- Latency budgets: first character audio p50 under 1.2 s and p95 under 2.0 s; Scene DSL generated and validated under 6 s; placeholders under 3 s; backdrop under 8 s; hero sprite under 10 s; world ready under 25 s; patch under 6 s; character handoff under 2 s.
- Plan limits: Free 1 child, 15 voice minutes per day, 3 worlds per day, 8 images per world, 10 saved worlds. Family 4 children, 60 minutes, 20 worlds, 16 images, 200 saved worlds. Enforced server-side in Firestore transactions.
- Session rules: one live mic-holder character; Google Search off; proactive audio on; input and output transcription on; session resumption on; context compression on with a 100k-token trigger; end-of-speech silence 900 ms; Vertex safety settings at the strictest threshold; attention beat every 90 s; session target 8 minutes rising by 2 per three completed loops, capped at 20.
- Privacy: no raw audio stored anywhere; transcripts live only in gateway memory and are discarded at session end; child profile holds first name, avatar, and age band only; all timestamps are integer epoch milliseconds.
- Performance: 60 fps on a 2022 iPad with 24 entities; engine bundle at most 1.2 MB gzipped including Rapier WASM; first paint of a fixture world under 500 ms after the document arrives.
- Git: trunk-based on `main`, one short-lived branch per task named `feat/<plan>-<task-number>-<slug>`, pull request with green CI, squash merge; commit messages in Conventional Commits form (`feat(engine): ...`, `test(gateway): ...`); commit messages end with prose and never carry a Claude or Anthropic attribution line.

## Review Focus

Inputs the spec implies but that no happy-path test covers. Each line names the owning plan and task that must carry the test.

1. **The child interrupts the character mid-sentence.** Expected: audio stops within one frame and the model stops generating. Playback ring buffer flush on `interrupted` is tested in Plan A2 (characters and audio) task "Playback worklet and barge-in"; forwarding the Live `interrupted` signal as a client message is tested in Plan B1 (gateway) task "Audio relay".
2. **The WebSocket drops while a world is building.** Expected: the client reconnects with its `sessionId`, the gateway resumes the Live session, and the world still arrives through Firestore. Tested in Plan B1 task "Resumption and reconnect" and Plan A3 (web) task "Studio connection lifecycle".
3. **A second tab connects for a child who already has an active session.** Expected: the new connection is refused with `SESSION_ACTIVE_ELSEWHERE` and the first session is untouched. Tested in Plan B1 task "Session lifecycle".
4. **Daily voice quota runs out mid-session.** Expected: a `quota` message when 120 seconds remain, the character wraps up, then `bye` with reason `quota`. Tested in Plan B1 task "Metering and quota".
5. **iOS Safari starts with the AudioContext suspended.** Expected: audio begins after the "Who's playing?" tap and never requires a second gesture. Tested in Plan A2 task "Audio capture" with a mocked suspended context.

---

## Plan index

| Plan | File | Owner | Weeks | Depends on | Produces |
|---|---|---|---|---|---|
| 0 Foundation and contracts | `2026-10-15-plan-0-foundation.md` | Both (pair week 1; Dev B owns `server-core`) | 1 | none | monorepo, `scene-schema` (with the lab extension), `protocol` (with the concept bank), `fixtures` (four worlds), `server-core`, CI |
| A1 Engine | `2026-10-15-plan-a1-engine.md` | Dev A | 2 to 3 | 0 | `packages/engine` |
| A2 Characters and audio | `2026-10-15-plan-a2-characters-audio.md` | Dev A | 3 | 0 | `packages/characters`, browser audio and WebSocket client |
| A3 Web app | `2026-10-15-plan-a3-web.md` | Dev A | 3 to 5 | 0, A1, A2 | `apps/web` |
| B1 Gateway | `2026-10-15-plan-b1-gateway.md` | Dev B | 2 to 4 | 0 | `services/gateway` |
| B2 Builder | `2026-10-15-plan-b2-builder.md` | Dev B | 3 | 0 | `services/builder` |
| B3 API and SaaS | `2026-10-15-plan-b3-api.md` | Dev B | 4 to 5 | 0 | `services/api`, Firestore rules |
| B4 Infrastructure and operations | `2026-10-15-plan-b4-infra.md` | Dev B | 1, 5 to 6 | all | Terraform, Cloud Build, dashboards, alerts, load test |

Execution order inside a week follows the spec's milestone table (section 17). Each plan produces working, independently testable software; integration points are the shared packages from Plan 0.

## How the two developers work in parallel

- **Week 1 is shared.** Both developers execute Plan 0 together: Dev A takes `scene-schema` and `fixtures`, Dev B takes `protocol`, `server-core`, and CI, and each reviews the other's pull requests the same day. Nothing else starts until the Plan 0 exit criterion is met: `pnpm install && pnpm lint && pnpm typecheck && pnpm test` is green on `main` and the fake gateway serves a fixture world.
- **From week 2, each side builds against fakes.** Dev A runs the web app against the fake gateway and the fake world source from `packages/fixtures`. Dev B drives the gateway with the WebSocket test client in `packages/fixtures` and the builder with fixture conversation summaries.
- **Changing a contract.** Any change to `packages/scene-schema` or `packages/protocol` is a pull request reviewed by the other developer before merge, with the schema version bumped if the change is not purely additive. Migrations live in `packages/scene-schema/src/migrate.ts`.
- **Integration checkpoints.** End of week 2: a child can talk to Bolt on staging and a fixture world plays locally. End of week 3: a spoken wish becomes a generated world on staging. End of week 4: the whole loop runs with real accounts. End of week 5: SaaS complete and the load test is within SLO. Week 6: hardening, production deploy, submission.

## Definition of done for every task

1. The failing test was written first and seen to fail for the right reason.
2. The implementation is the minimum that makes it pass.
3. `pnpm --filter <package> test`, `typecheck`, and `lint` pass.
4. The commit touches only the files the task lists, plus lockfile changes.
5. The pull request description names the plan and task number.
