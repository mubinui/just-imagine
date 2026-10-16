# Quality Program Master Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. Each workstream below is executed by first expanding its task list into a code-level TDD plan (as `2026-10-15-plan-0-foundation.md` was) at pickup, then implementing.

**Goal:** Raise Just Imagine from a working architecture to a product a child prefers over a mobile game: painted worlds in under three seconds, a generation sequence that is a show, game feel on every touch, eight kinds of play, alive voice in Bangla and English, and zero crashes in a twenty-minute session on every target device.

**Architecture:** No new services. A painted asset library (generated once, QA'd, served from the CDN) feeds the existing builder, which composes worlds by asset id and generates only the hero live. The engine gains depth, light, juice, sound, draw mode, games, creatures and vehicles through additive DSL fields. The web app gains i18n with Bangla, the generation show, game chrome and stability plumbing. The gateway gains tuned personas, memory and per-child language. Telemetry closes the loop.

**Tech Stack:** As the 2026-10-15 master plan, plus: `gemini-3-pro-image` (library generation, offline), `lyria-3-clip-preview` (music loops, offline), `gemini-3.8-flash-tts` (reaction clips, both languages), a texture-atlas packer (`free-tex-packer-core`), PixiJS v8 filters (displacement, tint), Rapier revolute joints with motors, `poly-decomp` for drawn shapes, Baloo Da 2 and Noto Sans Bengali (self-hosted subsets), Playwright device emulation.

**Spec:** `docs/superpowers/specs/2026-10-16-quality-program-design.md` (and the 2026-10-15 design spec for everything it does not supersede).

## Global Constraints

Everything in the 2026-10-15 master plan still applies. Added:

- Quality bar numbers from spec section 1 are acceptance criteria, measured, not estimated: first paint p50 under 3 s; hero under 10 s; p5 frames at 60 fps on a 2021 iPad, never under 45; voice p50 under 1.2 s through Vertex; zero crashes in a 20-minute soak on each device; 99.5 percent crash-free sessions.
- DSL changes are additive and optional; every existing fixture and every Plan 0 test keeps passing. Schema version stays 1 until a breaking change is unavoidable.
- Assets: library ids are stable strings `lib/<theme>/<name>`; every asset ships with collider, anchor, size in meters and tags; nothing in the library may be rendered without passing the QA checklist.
- Sound never plays before the audio unlock gesture; music ducks under speech; everything respects reduced-motion and the parent's sound setting.
- Language: every child-facing and parent-facing string goes through `t()`; `en` and `bn` key sets are identical (CI check); character names are never translated.
- Codex and Claude Code claim files in `CHECKPOINT.md` before editing and release them after commit; the two human developers own merges.

## Review Focus

1. **A drawn stroke thinner than the physics tolerance.** Expected: the stroke is thickened to the minimum before it becomes a body; it never tunnels through the ground. Pinned in workstream D, task D3.
2. **A wish in Bangla that names something outside the library.** Expected: the builder answers in Bangla, picks the nearest library stand-in, flags the hero for live generation, and the show narrates the wait in Bangla. Pinned in F4 and B5.
3. **WebGL context loss mid-session (tab backgrounded on iPad).** Expected: the watchdog recreates the renderer from the current document and the voice session survives. Pinned in G2.
4. **Frame rate drops under 45 fps with full effects.** Expected: the quality tier steps down (fewer particles, no shader water) within one second and steps back up when stable. Pinned in A6.
5. **A generated script tries to reach the network or spawn without limit.** Expected: the static check or the budget watchdog stops it before or during the smoke run, and the child never sees it. Pinned in E1 and E2.
6. **The music bed keeps playing when a character speaks or the parent mutes sound.** Expected: ducking within 100 ms of speech start, hard mute on the setting. Pinned in C3.

---

## Workstreams and owners

| Stream | Owner | AI implementer | Weeks |
|---|---|---|---|
| A. Painted stage (engine rendering) | Dev A | Codex | 1 to 2 |
| B. Asset library and builder v2 | Dev B | Claude Code (library runs and QA), Codex (builder) | 1 to 3 |
| C. Sound and haptics | Dev A | Claude Code | 1 to 2 |
| D. Generation show and draw mode | Dev A | Claude Code (impeccable passes) | 2 |
| E. Generated games, creatures and vehicles | Dev B (runtime, builder), Dev A (bridge, HUD) | Codex (runtime, builder), Claude Code (bridge, HUD, safety review) | 2 to 4 |
| F. Voice and language | Dev B | Codex (gateway), Claude Code (Bangla UI and review) | 1 to 3 |
| G. Stability and telemetry | Dev A (client), Dev B (pipeline) | both | 4 to 5 |
| I. Learning Worlds | Dev A (screens, pets), Dev B (gateway tools, api) | Claude Code (content package, packs, screens), Codex (protocol, gateway, api) | 2 to 4 |
| H. Demo, docs, submission | both | both | 5 |

Each task lists its files, the interface it produces, and its acceptance test. Estimates are in half-days.

---

### A. Painted stage

**A1. Library manifest and atlas loading.** (1) Files: `packages/engine/src/assets/manifest.ts`, `packages/engine/src/assets/atlas.ts`, `packages/protocol/src/library.ts`. Produces: `LibraryManifestSchema` (`assets: Record<id, { theme, tags, sizeM, anchor, collider, frames?, atlas, frame }>`), `loadLibrary(url): Promise<Library>`, `Library.texture(id, frame?)`, `Library.collider(id)`. Acceptance: a fixture manifest with two atlases loads headlessly and `texture()` returns the right frame rect.

**A2. `asset.libraryId` in the DSL and renderer.** (1) Files: `packages/scene-schema/src/schema.ts` (`AssetRef.libraryId?: string`), `packages/engine/src/renderer.ts`. Produces: entities with `libraryId` render from the atlas immediately; `url` assets still work; `status: 'placeholder'` draws a themed silhouette (cream, soft shadow) instead of a rectangle. Acceptance: fixture world renders with zero placeholder rectangles in the smoke test; validator accepts both forms.

**A3. Parallax depth and ambient loops.** (2) Files: `packages/engine/src/render/backdrop.ts`, `packages/engine/src/render/ambient.ts`. Produces: three layers from `theme.layers[]` (new optional field: `{ libraryId, depth: 0..1 }[]`), pointer and hero parallax, per-theme ambient loops (clouds, water displacement, grass sway, stars, motes). Acceptance: headless test asserts layer offsets as a function of hero x; visual check in the smoke page.

**A4. Light and time of day.** (0.5) Files: `packages/engine/src/render/light.ts`. Produces: scene tint and rim highlight keyed to `theme.timeOfDay`. Acceptance: tint colour per value asserted.

**A5. Juice.** (2) Files: `packages/engine/src/render/juice.ts`, `packages/engine/src/render/particles.ts`. Produces: squash and stretch on landing, impact rings and dust scaled by impulse, splash sheets on water entry, hero trail while airborne, hold glow, confetti, camera shake capped at 6 px, spell bursts; all emitted from engine events with a particle budget. Acceptance: event-to-effect table test; particle count never exceeds the budget.

**A6. Quality tiers and frame watchdog.** (1) Files: `packages/engine/src/render/quality.ts`. Produces: `setQualityTier('full' | 'light' | 'minimal')`, automatic step-down when p5 fps under 45 for one second, step-up after ten stable seconds. Acceptance: simulated frame timings drive the tier; Review Focus 4.

**A7. Flipbook animation.** (1) Files: `packages/engine/src/render/flipbook.ts`. Produces: two-frame idle and move animation for library creatures based on velocity. Acceptance: frame index follows speed.

### B. Asset library and builder v2

**B1. Style bible v2 and reference set.** (1) Files: `docs/art/style-bible.md`, `docs/art/references/` (the six characters, the mark, three sample props). Produces: the prompt preamble, negative list, per-theme palettes. Acceptance: reviewed by Dev A and the user.

**B2. Library generation tool.** (2) Files: `services/builder/tools/library/generate.ts`, `.../catalogue.json` (the asset wishlist by theme), `.../qa.md` (checklist). Produces: `node tools/library/generate --theme meadow` generates, post-processes (reusing `services/builder/src/assets.ts`), traces colliders, writes `library/<theme>/<name>.webp` + metadata; `--pack` builds atlases and the manifest. Acceptance: a dry run on three catalogue entries produces valid manifest entries; magenta residue under 2 percent.

**B3. Library QA and publishing.** (3, spread over weeks 1 to 3) Files: `library/` in Cloud Storage, `apps/web/public/library-preview/` (40-asset subset). Produces: ~300 QA'd assets; meadow and pond first. Acceptance: checklist signed per asset; the demo worlds use only QA'd assets.

**B4. Builder composes from the catalogue.** (2) Files: `services/builder/src/prompts/catalogue.ts`, `services/builder/src/flows/imagine.ts`. Produces: the catalogue (ids, tags, sizes, by theme) in the prompt; output uses `libraryId`; `generate: true` on the hero when needed; theme choice. Acceptance: eval set validity stays at 98 percent; every composed world references only existing ids (validator rule `UNKNOWN_LIBRARY_ID`).

**B5. Live hero with references and stand-in.** (1) Files: `services/builder/src/assets.ts`, `services/builder/src/flows/hero.ts`. Produces: hero generation uses two theme assets as references; publishes `standInLibraryId` first, then the live sprite. Acceptance: pipeline test with recorded responses; Review Focus 2.

**B6. Validator additions.** (0.5) Files: `packages/scene-schema/src/validator.ts`. Produces: `UNKNOWN_LIBRARY_ID`, `LAYER_DEPTH_ORDER`. Acceptance: unit tests.

### C. Sound and haptics

**C1. Sound pack.** (1) Files: `apps/web/public/sound/*.ogg` + `.m4a`, `apps/web/lib/sound/manifest.ts`. Produces: forty authored cues (generated with `gemini-3.8-flash-tts` is not suitable; use synthesised and sourced CC0 cues, provenance recorded in `docs/art/sound-provenance.md`). Acceptance: every DSL `sound.cue` and every engine effect has a cue.

**C2. Music beds.** (1) Files: `services/builder/tools/music/generate.ts`, `apps/web/public/music/<theme>.ogg`. Produces: one 30-second loop per theme from `lyria-3-clip-preview`, loop points trimmed. Acceptance: loops play gaplessly in the smoke page.

**C3. Audio mixer.** (1) Files: `apps/web/lib/sound/mixer.ts`. Produces: `playCue(name, { gain, pan })`, `playMusic(theme)`, ducking driven by the voice client's speaking state, mute from the parent setting and reduced-motion, unlock gating. Acceptance: Review Focus 5 as a unit test with a mocked AudioContext.

**C4. Haptics.** (0.5) Files: `apps/web/lib/haptics.ts`. Produces: `tap()`, `impact(strength)` through the Vibration API where present. Acceptance: no-op on unsupported browsers.

### D. Generation show and draw mode

**D1. Show choreography.** (2) Files: `apps/web/components/studio/GenerationShow.tsx`, `app/studio.css`. Produces: the five-beat sequence from spec section 5 bound to `worldJob` statuses and world document milestones, with loop beats and the 25-second fallback; narration lines in both languages. Acceptance: Playwright with the fake world source paced to each milestone; never a static state longer than 2 s.

**D2. Brush-stroke reveal.** (1) Files: `packages/engine/src/render/reveal.ts`. Produces: wipe-mask reveal for backdrop layers and pop-in for entities when assets change from placeholder to ready. Acceptance: headless state machine test.

**D3. Draw mode.** (2) Files: `packages/engine/src/draw.ts`, `apps/web/components/studio/DrawTray.tsx`. Produces: `engine.beginStroke / addPoint / endStroke(material)` creating simplified, decomposed, thickened polygon bodies tagged `drawn`; eraser; three material pills. Acceptance: Review Focus 1; a drawn bridge holds a rolling ball in a headless test.

**D0. Voice on demand and Studio controls.** (1, first task of the programme, implemented ahead of approval as a bounded change at the user's request) Files: `apps/web/components/Studio.tsx`, `components/studio/parts.tsx`, `app/studio.css`, `lib/strings/en.ts`, `lib/voice.ts`. Produces: no Live session on mount; `startVoice(characterId)` from an avatar tap or the Ask pill; `stopVoice()` keeps the world; a control cluster (Ask or Stop, Build a game, Finish playing) in the strip corner at 64 px; "Build a game" starts voice if needed and sends the wish. Acceptance: Playwright asserts no `hello` is sent until a friend is tapped; Stop ends the session and the world stays interactive; existing flows updated accordingly.

**D4. Impeccable passes.** (1) The show, draw tray and game chrome go through the impeccable skill (design direction already recorded in the Studio surface brief; refinement path).

### E. Generated games, creatures and vehicles

**E1. Game API and sandbox runtime.** (3) Files: new package `packages/game-runtime` (`src/api.d.ts` the contract shipped to the model, `src/worker-shim.ts`, `src/static-check.ts` using `acorn`, `src/host.ts` the main-thread bridge, `src/budgets.ts`). Produces: `checkScript(source): { ok, errors }`, `createGameWorker(source, bridge): GameHandle` with `start`, `stop`, `onCommand`, `pushEvent`, `pushState`, budget enforcement and termination. Acceptance: the red-team set of twenty scripts is blocked (fetch, XHR, WebSocket, importScripts, indexedDB, eval, Function, infinite loop, 10,000 spawns, prototype tricks); a valid script receives events and emits commands in a unit test.

**E2. Headless smoke runner.** (2) Files: `packages/game-runtime/src/smoke.ts`, `services/builder/src/flows/smoke.ts`. Produces: `smokeRun(doc, source, { seconds: 10, language })` in a Node worker with the headless engine and scripted inputs; returns pass or a structured failure for the retry prompt. Acceptance: the eight few-shot games pass; each red-team script fails for the right reason.

**E3. Engine bridge and HUD.** (2) Files: `packages/engine/src/script-bridge.ts`, `apps/web/components/studio/GameHud.tsx`, `app/studio.css`. Produces: 20 Hz state and event streaming to the worker, command application through the engine API, score pill, lives, timer, level banner, win and lose sheets, `ask` prompts as a sheet, the "game got tangled" recovery state. Acceptance: the few-shot games play end to end in Playwright with the fake world source.

**E4. Builder `imagineGame` flow.** (2) Files: `services/builder/src/flows/imagine-game.ts`, `src/prompts/game-api.ts`, `src/prompts/games/*.ts` (eight few-shot programmes with scenes). Produces: playground-or-game decision, scene composition from the library, script generation on `gemini-4-argon`, static check, smoke run, one retry with the error, fallback, `SceneDoc.game.script` publishing; patch flow rewrites scripts from spoken changes. Acceptance: sixty-wish game eval at 95 percent first-try pass; red-team prompts never reach the engine.

**E5. Draw, creatures and vehicles as script-reachable primitives.** (2) Files: `packages/engine/src/behaviors.ts`, `packages/scene-schema/src/schema.ts`. Produces: behaviors `follow`, `flee`, `patrol`, `swim`, `fly`; `wheel` joint with a motor; drawn bodies tagged `drawn`; all addressable from scripts by tag. Acceptance: headless behaviour tests; a few-shot "chase" game uses `follow`.

**E6. Hand-built kinds as fallbacks and examples.** (1.5) Files: fixtures `catapult.json`, `marble-run.json`, `stack-tower.json`, `cart-race.json` with scripts; `apps/web/components/studio/PartsTray.tsx` for marble-run parts. Acceptance: each plays in the Studio and doubles as a few-shot example.

**E7. Safety review.** (1) A written threat model for the sandbox (`docs/security/game-sandbox.md`), the red-team set in CI, and a reviewer sign-off before any generated script runs on a child's device.

### F. Voice and language

**F1. Staging live.** (1) The staging project runs `gemini-3.8-live`; the first real session is recorded (latency, barge-in); JSON-schema and error-surfacing fixes from the direction check are verified against the real API. Acceptance: smoke script passes; p50 latency logged.

**F2. Personas and memory.** (1.5) Files: `services/gateway/src/prompts/*.ts`. Produces: six rewritten personas with example turns; memory block from the last three sessions. Acceptance: prompt snapshot tests; a scripted conversation eval.

**F3. Listening and interruption tuning.** (1) Files: `services/gateway/src/live/config.ts`, `packages/characters/src/voice-client.ts`. Produces: VAD and barge-in settings tuned on real sessions; confirm-by-repeat behaviour. Acceptance: measured barge-in under 300 ms.

**F4. Bangla voice and transcription.** (1) Files: gateway config and prompts. Produces: language pinned per child; Bengali transcription; voice per language from a listening test. Acceptance: Review Focus 2; a Bangla session transcript reviewed by a native reader.

**F5. i18n scaffold.** (1) Files: `apps/web/lib/i18n/{index,en,bn}.ts`, `apps/web/app/layout.tsx` (lang attribute), fonts in `public/fonts/`. Produces: `t(key, vars)`, `useLanguage()`, a CI key-parity test, Bengali numerals helper. Acceptance: key-parity test; both fonts load.

**F6. Bangla copy.** (2) Files: `bn.ts`, concept bank `bn` fields, builder prompt language output. Produces: every string translated and reviewed by a native reader; the builder emits child-language text. Acceptance: no untranslated keys; eval wishes in Bangla produce Bangla narration.

**F7. Language setting.** (0.5) Files: `packages/protocol/src/firestore.ts` (`ChildDoc.language`), api update route, parent Settings UI, profile picker badge. Acceptance: api test; Playwright flow switching to Bangla.

### G. Stability and telemetry

**G1. Error boundaries and resume.** (1) Files: `apps/web/components/Hiccup.tsx`, `app/(child)/layout.tsx`, `lib/session.ts`. Produces: friendly recovery screen keeping the voice session; world and session persisted; reload resumes. Acceptance: Playwright reload mid-world.

**G2. Engine watchdog.** (1) Files: `packages/engine/src/renderer.ts`. Produces: WebGL context-loss recovery from the current document. Acceptance: Review Focus 3 with a simulated context loss.

**G3. Client telemetry.** (1) Files: `apps/web/lib/telemetry.ts`, `services/api/src/routes/telemetry.ts`. Produces: batched events (errors, first paint, show duration, fps p5, underruns, reconnects) to Cloud Logging. Acceptance: api test; dashboard panels.

**G4. Device soak.** (2 per round, two rounds) Files: `docs/qa/soak-checklist.md`, `docs/qa/soak-<date>-<device>.md`. Produces: results per device; fix lists. Acceptance: zero crashes and stuck states on round two.

**G5. CI soak and device emulation.** (1) Files: `apps/web/e2e/soak.spec.ts`, `playwright.config.ts` projects. Produces: a 20-minute fake-mode soak nightly; four device projects; memory growth assertion. Acceptance: green nightly.

### I. Learning Worlds

**I1. World Pack schema and content package.** (2) Files: new `packages/learning-content` (`src/schema.ts` with `WorldPackSchema`: id, title, scene (SceneDoc), characters (id, name, look, voice, personality, facts, en/bn), hotspots (entityId to characterId, comesCloser style), sounds (entityId to file, provenance), challenges (id, characterId, question, answerKey, accepted[], hint, points, petReward?), `src/packs/*.json`, `src/index.ts`, `assets/sounds/`). Produces: `loadPack(id)`, `PACKS`, validation that every hotspot entity exists in the scene and every challenge character exists. Acceptance: schema tests; Space and Animals packs validate in both languages.

**I2. Space and Animals packs.** (3) Content: eight planet characters plus the Sun; twelve animals across farm, jungle and ocean with CC0 recordings and provenance in `docs/art/animal-sounds-provenance.md`; ten challenges each with answer keys; scenes composed from library assets (placeholders until the library lands). Acceptance: content review checklist signed; recordings under 200 KB each.

**I3. Human Body, Food and Nutrition, Hygiene, Exercise packs.** (4) Same shape; the brushing game and the handwashing song are scripted scenes with timers; the exercise coach's counts are voice-confirmed.

**I4. Protocol and gateway: pack characters, quiz, points, pets.** (2, Codex) Files: `packages/protocol` (client `summonPersona { packId, characterId }`, `hangUp`; server `persona` (ready for a pack character), `quiz` (question, options?), `points` (total, delta, reason), `petUnlocked` (petId); `ChildDoc.points`, `ChildDoc.pets[]`, `learnProgress` subcollection), `services/gateway` (persona system instruction built from the pack, language pinned; tools `ask_quiz`, `award_points` validated against the challenge maximum, `give_hint`; `summon_pack_character` for voice-initiated calls), `services/api` (points, pets, progress endpoints; parent dashboard data). Acceptance: emulator tests; a scripted quiz conversation awards points once and unlocks a pet at the threshold.

**I5. Learn Map and section screens.** (3) Files: `apps/web/app/(child)/learn/page.tsx`, `app/(child)/learn/[pack]/page.tsx`, `components/learn/*` (map of six islands with progress rings, section stage reusing the Studio stage with hotspots, the comes-closer overlay, the toy-phone call overlay with ring and hang-up, challenge sheet, points toast, pet unlock celebration), `components/pets/*` (eight pets, art and sounds, cast-strip slot, follow-the-hero behaviour hook). Acceptance: Playwright flow through Space: tap Saturn, hear facts in the fake gateway script, answer a challenge, earn points, unlock the first pet.

**I6. Content QA and native review.** (1) Every pack reviewed for accuracy by the two developers and for Bangla by the native reader; answer keys tested against ten paraphrases each in the gateway's judge prompt eval.

### H. Demo, docs, submission

**H1. Demo worlds.** Eight worlds, one per kind, in both languages, using only QA'd assets. **H2. Submission video and README.** **H3. Production deploy and runbook rehearsal.**

---

## Week-by-week exit criteria

| Week | Exit |
|---|---|
| 1 | Staging speaks through Vertex; meadow and pond library batches QA'd; engine renders a library world with depth and juice; sound pack wired; `bn.ts` exists with fonts loading |
| 2 | Generation show runs end to end; draw mode works; Game API, sandbox and smoke runner pass the red-team set; builder composes from the catalogue |
| 3 | A spoken game idea becomes a playable generated game on staging; creatures and vehicles playable; personas and Bangla voice tuned; Bangla UI parity |
| 4 | Telemetry live; soak round one done with fix list closed |
| 5 | Soak round two clean; production deployed; demo worlds and video ready |
