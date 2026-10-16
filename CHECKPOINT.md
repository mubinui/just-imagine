# Development checkpoint

Updated: **2026-10-16 (Asia/Dhaka)**. Branch: `feat/full-development`.

## Start here

The real-service app is running at **http://localhost:3300**; use the demo credentials below. The separate fixture preview remains at **http://localhost:3200**. On3300 sign in, choose **Ari**, and speak an original idea in Studio. The3200 preview has the sample-world Storybook and guided dragon/Lab activities. The landing itself has an Earth/Moon gravity experiment. Parent space is at `/parent/dashboard`.

The user requested full implementation, a persistent teammate handoff, and then a premium judge-facing UI pass using Impeccable. They explicitly chose **keep the warm cream/forest palette; elevate the craft**. Preserve Claude Code's full-screen Studio, character presentation and brand assets. Codex owns the landing/parent refinements, demo art/data integration, engine and backend fixes described below.

Claude Code committed/pushed the implementation through55a98de and the lint follow-upb01b48b (see preserved notes). The subsequent local integration fixes remain uncommitted; Codex has not committed, pushed, merged or deployed them. Do not confuse a local playable preview with a credentialed production release.

## Latest pass — speech quality and creative freedom

User reports crackling throughout assistant speech, repetitive scenario-based worlds, an unfindable navigation assistant, and requests a soothing female voice plus a concrete plan for creative freedom. Research and implementation milestones: [creative-freedom-plan.md](docs/handoff/creative-freedom-plan.md). The larger builder/engine expansion is planned, not implemented.

Immediate source repair: PCM playback buffers100ms (short replies wait at most150ms), fades starts/starvation/interruption over5ms, preserves six-second fast bursts instead of discarding earlier syllables, and supports a bounded30-second queue with explicit overflow recovery. Worklet rendering reuses its output buffer and sends mouth amplitude about30 times/second instead of every audio quantum. Gateway overload now reconnects explicitly rather than silently dropping PCM. These fixes address demonstrated discontinuities and packet loss; actual-device listening remains necessary to confirm the user's reported crackle is gone.

All three companion personas now use **Sulafat** in the Live adapter; guest guides retain their configured voices. The prompt requests warm, calm, clear short responses. Credentialed Gemini3.8Live setup accepted Sulafat and returned297 audio frames and7 transcript events without an unexpected close. The Studio navigation trigger now shows the companion's face with **Ask Pip** (or the child's chosen friend name), retaining its accessible navigation name and shared session.

Scoped checks:18 character/audio tests and21 gateway tests pass; characters/gateway/web typecheck and lint pass. The plan covers intent-preserving generation, composable mechanics, durable coherent artwork, edit regeneration, undo and companion continuity. Retain real-service demo data and do not silently swap a child's idea for a fixture. Build/browser confirmation is recorded below when complete.

## Latest pass — runnable application with demo identities

Docker Compose runs web3300, API3301, builder/assets3302, Live gateway8788, Firebase Auth9099 and Firestore8080. Local queues persist in Firestore; world artwork persists in a Docker volume. Explicit demo-project/emulator guards keep these adapters out of cloud deployments. The existing3200 preview remains available.

The user supplied `GEMINI_API_KEY` in the gitignored root `.env.local` (mode0600). A server-side model-list request returned HTTP200. Real Live speech/captions and browser microphone transcription are verified. Real scene generation and companion image generation/moderation passed separately. The real browser flow now passes: synthetic spoken request → Gemini transcription → build tool → persisted queue → validated generated scene/artwork → rendered canvas → fresh-game reset → saved gallery. Never print or commit the key. Docker is running on the ports below. Parent signup/profile creation/companion save/fresh sign-in pass in the real-service browser. Fixed Docker session-origin matching, unsupported Live setup fields, minimum Gemini request deadlines (10s), and complex-schema rejection with validated JSON-mode fallback. Also fixed optional `undefined` job fields rejected by Firestore and subscribing before a queued world had an owner/document. Test emulators use separate8085/9095 ports to avoid touching demo data. A new **Build a game** control clears the active world without deleting saved work or restarting the companion session.

Verification: **344 distinct tests pass** (schema85, protocol45, fixtures36, server-core38, engine45, characters11, web17, API22, builder22, gateway23), including the isolated emulator run. **10 preview browser tests pass**. Workspace typecheck/lint pass. The real browser test received1385 audio frames, transcribed the spoken idea, generated and displayed the world with zero page errors, reset the stage through **Build a game**, and found the saved game in Gallery. Parent upload→Gemini chibi generation/moderation→profile save/reload also passes using synthetic artwork; no real child's photo/likeness was tested. Evidence: `/tmp/ji-{local-tests-final,local-preview-e2e,local-types,local-lint,demo-full-flow,photo-endpoint}.log`, `/tmp/ji-real-generated-world{,-mobile}.png`. The phone check exposed a compressed connection label; its flex minimum is fixed; final390px confirmation shows a13.2px-high single-line label with no horizontal overflow.

Docker data export initially failed because Firebase tried to replace the mounted volume root. Import/export now use `/data/firebase/snapshot` inside the volume; explicit export succeeded. Final rebuilt-image restart/import passed: fresh demo sign-in, Ari profile, saved generated world, phone layout and explicit session finish all passed with zero page errors. Evidence: `/tmp/ji-demo-verify.log`, `/tmp/ji-final-{desktop,mobile}.png`. All five services run the rebuilt image. The old emulator process was stopped only after a verified export; the new process imports/exports the corrected subdirectory. Use `node scripts/local.mjs start|stop|status|logs|reload-key`; details in `docs/handoff/local-development.md`.

### Demo identities, real services

User explicitly wants fictitious accounts with all real functionality, not fixture data. Created and verified `parent@justimagine.test` / `ImaginePlay!2026` at http://localhost:3300/sign-in, child explorer **Ari**, companion **Pip**. Child selects Ari at `/play`; there is no child email/password in this parent-owned account model. Auth/storage currently run in persistent Docker emulators; Gemini calls are real. The3200 site remains a separate fixture preview. Do not overwrite the demo family or replace its worlds with fixtures.

## Latest pass — playable worlds

The six local preview worlds now have larger playable objects, painted meadow/moon/pond scenery, tactile duck/cannon/cup sprites, and exact native peg/fraction geometry. `lib/playable-preview.ts` adapts cloned fixtures so backend evaluation fixtures remain unchanged. Five new WebP assets total approximately 825KB; prompts, source paths and provenance sidecars are in `apps/web/public/worlds/`.

- Each world has an explicit action: bounce, drop together, drop into water, launch, release a ball, or split/join. Static rule-driven controls are accessible too. Retry preserves the child's gravity/material/variable choices. Readings come from simulation state; the peg board caps at its actual entity limit.
- Tap now dispatches on release; the previous zero-velocity release erased the tap impulse. Drag begins after 6px; pointer cancellation never launches an object. Canvas targets have a 44px minimum hit area and sound unlock also works from action buttons.
- Higher-resolution curve tessellation removes polygonal balls/pegs without changing physics dimensions. Text rasterizes at 48px with 2× resolution, then scales with a 13 CSS-pixel minimum for mobile annotations. Plot panels accommodate title size, rulers show real world lengths, and the cannon trail records actual positions.
- The hollow cup uses three convex collider pieces; direct ball drops and real challenge collisions are tested. Cannon copy correctly promises hitting the cup. Fraction split/join works repeatedly; manual peg drops feed the real histogram.
- Stage controls follow the canvas width; compact layouts scroll without squeezing the world or Lab. Discovery details collapse until opened. Existing six SVG cast and warm palette remain.

This is a local-preview improvement, not evidence of live Vertex output or child usability. A fresh Impeccable finish reviewer inspected all twelve desktop/mobile captures, requested readable phone annotations, and returned **ship** after that bounded fix and recapture. No remaining material findings in this scope. The earlier side-border hook finding was fixed; no ignores were added. Approved warm identity and active-character selection rings remain intentional.

## Current implementation

| Area             | Implemented and checked locally                                                                                                                                                    |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Shared contracts | Scene/protocol Zod validation, physics/material validation, atomic patches, six playable sample worlds, fake socket/source, Firebase server core/quotas                            |
| Engine           | Pixi/Rapier, soft bodies, drag/flick, dials, rules, variables, challenges, plots, histogram trials, sprites/auto-colliders, spells/effects/synthesized cues, bounded cleanup       |
| Web/audio        | Marketing/auth, profile selection, full-screen Studio, six authored fallback characters, PCM capture/playback, reconnect, parent CRUD/progress/test billing, deletion confirmation |
| Gateway          | Auth/ownership, Live adapter/tools, quotas/pacing, reconnect/session lease, durable metering, in-memory transcripts, summaries, versioned persona/Lab instructions                 |
| Builder          | Versioned scene prompts, validation/repair/patches, curated fallback, progressive safe assets, alpha processing/convex colliders, caching, jobs/deletion fences/evaluator          |
| API              | Profiles/worlds/discoveries/sessions, Stripe TEST checkout/portal/webhooks, durable account/child/world deletion and writer fences                                                 |
| Operations       | CI and browser gate, Docker, Cloud Build/promote source, Terraform/Firestore rules/indexes, telemetry/alerts/dashboard/CDN option, load/eval scripts                               |

See `docs/handoff/engine-report.md` and `docs/handoff/backend-direction-fixes.md` for the latest concrete fixes. Earlier review reports are historical: read their appended closure sections and the newer direction-fix report before treating a finding as open.

## Judge-facing changes

### Character and layout refinement — verified locally

All six authored SVG characters were refined with more distinct silhouettes, facial details and separate voice-driven mouth openings. Selection uses stable 76px slots on desktop and 64px on phones, with visible names and no reflow. The Studio uses the available viewport, preserves the canvas's 16:9 ratio, and keeps header, dials, Lab controls and cast balanced. Compact screens and the numeric keypad scroll. The five-viewport regression passes at 1440×900, 1180×820, 390×844, 320×640 and 844×390, including all six character selections, predictions, dials, Lab sliders, keypad cancellation and finish controls. Character evidence: `/tmp/ji-craft/`; current world evidence: `apps/web/.impeccable/review/worlds/`.

- Landing: real Earth/Moon drop-and-bounce interaction, stronger typography and spacing, single primary preview entry, sequential learning story. No invented testimonials, metrics or live-AI claims.
- Explorer picker and parent area: clearer selection/focus, calmer forms, session chart with an honest empty state and a direct start action.
- Studio: Claude Code's full-bleed stage, storybook, cast strip, listening state, captions, predictions, summons/spell presentation and lab drawer retained.
- Flagship art: compressed local dragon/cloud/meadow WebP assets in `apps/web/public/worlds/`; exact image-generation prompts/provenance in `PROVENANCE.md`. These are static preview assets. Moon/pond scenery and duck/cannon/cup sprites now extend the set; pegs and fractions intentionally use exact native geometry.
- Preview Discovery Cards now persist per child to browser storage and appear in Parent space. Profile/account deletion removes them. No sample progress is invented.
- New physics fixes restore the jelly dragon's bounce Discovery rule, distribute soft-body mass/forces correctly, retain flick messages, render spawned templates/facing/scale, and avoid repeated collider downloads/rebuilds.

## Verification

**Baseline:** full workspace lint, typecheck, optimized preview build, native API/builder/gateway startup smoke and full `pnpm test` passed before the latest visual extension. That run plus the subsequent engine correction covered **320 distinct cases**.

**Latest playable-world extension:** **45 engine tests and 17 web tests pass**, including tap-impulse preservation, preview schema/fixture immutability, static controls, hollow-cup collision and repeated fraction recombination. Replacing the baseline engine44/web13 counts gives **325 distinct passing cases across the full baseline and final scoped runs**, not a new single full-workspace run. **All 9 Playwright tests pass**, including original flows, five-viewport character/layout coverage and actions in all six worlds. Twelve desktop/mobile world captures show no horizontal overflow or page errors. After the bounded mobile-label correction, all twelve captures and the 45 engine tests were rerun.

Optimized preview build, engine typecheck, engine/web lint and final formatting are checked for this extension. The optimized build reports the existing `metadataBase` fallback warning; set the actual site origin before deployment. Evidence: `/tmp/ji-world-{engine-test,web-test,e2e,build,engine-types,engine-lint,lint,format,capture}.log`, `/tmp/ji-world-review.json`. Browser artifacts are ignored. Previous full-workspace logs remain `/tmp/just-imagine-final-{tests,build,lint,typecheck,e2e}.log`.

Counts across baseline + scoped updates: schema85, protocol45, fixtures36, server-core37, engine45, characters8, web17, API15, builder19, gateway18. API/builder/gateway cases repeated inside the emulator runner are counted once.

Earlier checks: real/fake optimized Next builds, Terraform validate, all three native service startup smokes, offline50-case evaluator plumbing. Local Node22 ARM64 Docker build and API/builder/gateway startup plus Sharp WebP passed; this does not establish AMD64 Cloud Run deployment. The offline evaluator uses fixture doubles and is not a model-quality score.

## Run and verify

```sh
# Terminal 1 (already running on 8787)
pnpm --filter @just-imagine/fixtures dev
# Terminal 2 (already running on 3200)
NEXT_PUBLIC_FAKE=1 pnpm --filter @just-imagine/web dev --port 3200
# Browser suite against this preview
PLAYWRIGHT_BASE_URL=http://localhost:3200 pnpm --filter @just-imagine/web e2e
# Workspace checks
pnpm format:check
pnpm lint
pnpm typecheck
pnpm test
NEXT_PUBLIC_FAKE=1 pnpm build
```

If pnpm is absent, use `npm exec --yes --offline --cache .npm-cache --package pnpm@10.34.7 -- pnpm`. Target Node22.12+, pnpm10.34.7, Java21. Local Java21: `.tools/amazon-corretto-21.jdk/Contents/Home`. Emulator suites run sequentially through `scripts/test-emulators.mjs`; avoid starting two runs on the same ports. Public web env changes require rebuilding. Port3000 belongs to an unrelated app: do not stop it.

## Remaining gates / next teammate work

1. **Credentialed staging:** configure Firebase/GCP/ADC/Vertex models and verify one real speech→world→play→summary session, image generation, resume/handoff and deletion. Model IDs preserve the spec and remain configurable/unverified. Check current API/model availability before rollout.
2. **Payments/deployment:** Stripe TEST keys/price/webhook, Terraform plan/apply, actual service URLs/IAM, App Hosting public env, CDN/DNS, notification destinations and CI/promotion approvals. No cloud resources were created here.
3. **Release evidence:** real-model50-prompt eval,200-session load, speech latency,2022iPad/Safari fps/audio, child usability and production policy review. Local software WebGL is not device evidence.
4. **Known source follow-through:** safe parallel moderation/tool gating, fuller Live transport/goAway/missing-call-ID coverage, task permanent-vs-transient error classification and asset failure diagnostics. See backend-direction-fixes.md exclusions. Recorded reaction clips/final Rive files and richer lab measurement presentation remain assets/polish work. The engine still lacks the spec’s explicit buoyant-flag behavior and automatic splitting for breakable materials; density-based buoyancy exists, but it is not full flag coverage. Replay API and richer measurement visuals also remain separate work. Fixed60Hz time scaling is now corrected and tested.
5. Review latest uncommitted work together and rerun required CI before merging. Shared schemas/protocol shapes were preserved; schema-adapter behavior changed and deserves teammate review.

## Important decisions

- Original Next/Firebase architecture retained. No separate Sites registration.
- Raw audio is not stored; transcripts stay in bounded gateway memory. Jobs use an age/tier/concept brief rather than raw transcript excerpts. Operational logs omit child text/tokens/provider messages.
- Live moderation outages fail closed as operational errors, not child safety strikes. Parallelization is deferred until tool gating can be proven safe.
- A failed generated scene is recorded as terminal fallback, remains playable and is explained to the child; retry/handoff context clears stale failures correctly.
- Browser screenshots and tool caches are ignored. Keep source art/provenance and checkpoint history. This shared workspace must not be removed as part of cleanup.

## Parallel teammate ledger (preserved)

## Parallel session notes (Claude Code, 2026-10-15 23:55)

- Added the brand mark ("Dream Launch": a thought cloud launching a star along a projectile arc) mapped to the `globals.css` tokens (tile `--accent` #245e4e, cloud `--ground` #fff9ee, star `--yellow` #f7d76e, dots `--peach` #f9ceb0). New files only: `apps/web/components/Mark.tsx` (inline SVG), `apps/web/app/icon.svg`, `apps/web/app/favicon.ico` (16/32/48), `apps/web/app/apple-icon.png` (180, full bleed), `apps/web/app/manifest.json`, `apps/web/public/icons/{icon-192,icon-512,icon-512-maskable,og-mark}.png`.
- Edited only two existing files, minimally: `apps/web/components/Shell.tsx` (Brand renders `<Mark size={32} />` instead of the ✦ placeholder) and `apps/web/app/layout.tsx` (adds `openGraph.images` and a `viewport` export with `themeColor`). `globals.css` was not touched; its `.brand-mark` colour and font-size rules are now unused and can be dropped whenever convenient.
- Verified with `tsc --noEmit` and eslint on the touched files. Nothing committed; Claude Code does not commit on this branch unless the user asks.

## Parallel session notes (Claude Code, 2026-10-16 00:08)

- On the user's instruction, committed the whole working tree as `2273e1b` on `feat/full-development` and pushed the branch to origin. `main` is unchanged. Keep committing on this branch; Claude Code will not rewrite history.
- Claude Code is now running a read-only direction check of each area against the spec; reports land in `docs/reviews/`. No code edits from Claude Code until the next note here names the files it is taking.

## Parallel session notes (Claude Code, 2026-10-16 00:11)

- Opened draft PR #1 (`feat/full-development` → `main`) so CI runs on this branch. First run failed only at `pnpm format:check` (4 files); lint, typecheck and tests did not run. Fixes: added `apps/web/next-env.d.ts` to `.prettierignore` (Next regenerates it), ran prettier on `README.md`, and ran prettier (whitespace only, no logic change) on `services/gateway/src/gateway.ts` and `services/gateway/test/gateway.test.ts`. If an anchored edit on those two files fails for you, re-read them; nothing else changed.
- Moved the icon generator into the repo as `scripts/make-icons.cjs` (run from the root with `node scripts/make-icons.cjs`); it resolves sharp through `services/builder`.
- Please run `prettier --check .` before each commit so the CI gate stays green; it is the first step and blocks the others.

## Parallel session notes (Claude Code, 2026-10-16 00:17) — files claimed

Claude Code is now redesigning the child Studio surface per docs/reviews/2026-10-16-web-direction-check.md (stage layout, Imagine-phase listening state, cast strip, dial tray, Discovery toast, summon overlay, spell flourish, six distinct character faces). Files taken until the next note here:

- apps/web/components/Studio.tsx, apps/web/components/CharacterFace.tsx, apps/web/app/globals.css (studio and character sections), apps/web/lib/strings/en.ts (child-facing strings only)
- new: apps/web/components/SummonOverlay.tsx, apps/web/components/SpellFlourish.tsx, apps/web/components/studio/*, apps/web/app/studio.css
  Codex: please keep to services/, packages/ and the parent area while this is in progress; if you must touch one of these files, append a note here first.

## Parallel session notes (Claude Code, 2026-10-16 00:21) — review findings for Codex

Four direction-check reports are in docs/reviews/ (summary: docs/reviews/2026-10-16-direction-check-summary.md). Findings in your areas, highest value first; all have file:line references in the reports:

1. builder `src/vertex.ts:56` and gateway `src/tools.ts:35` send raw JSON Schema (`$schema`, `additionalProperties`, `propertyNames`) to Vertex; wrap with `toGeminiJsonSchema` from scene-schema.
2. gateway `src/gateway.ts:236-238` swallows Live setup errors; the child gets `bye: error` with nothing logged. Also: quota warning never reaches the character; prompts are one unversioned string.
3. engine soft bodies: lattice carries ~40% of document mass, impulses land on one node, so the jelly dragon's `bounce` rule never fires (engine report defect 1, with a probe).
4. api `src/store.ts:124` leaks world existence with 403 (spec says 404); `src/deletion.ts:72-100` leaves builderJobs behind.
   Claude Code is on the Studio stage (files listed in the note above) and will not touch these.

## Parallel session notes (Claude Code, 2026-10-16 00:46) — Studio stage rebuilt

The child Studio is now a full-bleed stage (impeccable new-work flow; surface brief at apps/web/.impeccable/surfaces/components-studio-tsx.md; review captures in apps/web/.impeccable/review/). Changed: apps/web/components/Studio.tsx (same hooks and contracts, new render tree), components/CharacterFace.tsx (authored SVG fallback instead of Avatar), new components/studio/{parts,LabDrawer,CharacterArt}.tsx, new app/studio.css (imported by Studio.tsx; globals.css untouched, its .studio/.play-world/.character-panel/.cast/.dial-tray/.lab-panel/.discovery/.prediction rules are now unused and can be deleted), lib/strings/en.ts (child strings appended). Your Playwright flows in e2e/flows.spec.ts pass unchanged against it (every selector they rely on was kept). Engine placeholder art is unchanged and still yours; a cream-silhouette/sky palette for placeholders would lift the stage a lot. Claude Code's file claim on these files ends once this work is committed.

## Codex checkpoint — 2026-10-16, premium preview in progress

- User approved keeping the cream/forest palette and explicitly requested Impeccable polish. Codex owns landing `app/page.tsx`, new `welcome.css`/`GravityPlayground.tsx`, explorer picker/`explorers.css`, parent panels/`parent-polish.css`. Claude Code's Studio/character files are preserved.
- Preview currently running at **http://localhost:3200** (`NEXT_PUBLIC_FAKE=1 next dev --port 3200`); fixture gateway on 8787. Port 3000 belongs to an unrelated app; do not stop it. Port 3100 is an older production preview.
- Landing now has an actual drop/bounce experiment with Earth/Moon acceleration, one clear entry CTA, and a quieter sequential explanation. Explorer cards and parent chart/empty states refined. Desktop/mobile captures passed overflow checks and the route from landing through profile to Studio had no page errors. Web lint passed before the final empty-state refinement.
- Engine implementer is fixing the newly reported mass/impulse, flick, spawned-rendering, face-direction and collider-reload defects from `docs/reviews/2026-10-16-engine-characters-direction-check.md`; do not overwrite packages/engine concurrently.
- Prior full suite: **300 distinct tests**, **5 Playwright flows**, emulator suites; scoped fixtures36/characters8/gateway12 rerun passed after fallback context retry fix and browser timer binding fix. All three service bundles and Sharp WebP worked in the local Node22 ARM64 Docker image. This is packaging evidence, not Cloud Run/AMD64 deployment evidence.
- Teammate has since committed/pushed baseline and opened draft PR #1, per notes above. Codex has not committed or pushed this polish batch.
- Remaining: final visual confirmation/e2e/build/typecheck, flagship demo sprite integration, consolidate handoff; newly reported backend adapter/API gaps and real staging credentials remain explicit follow-through work.

### Codex integration note — preview discoveries

Codex is making one narrow integration edit to `components/Studio.tsx`: persist a displayed preview Discovery Card to the browser sample family's store so it is visible in Parent space. This preserves Claude Code's render tree and animation work. Storage/API changes stay in `lib/demo.ts`; no live-service behavior changes.

### Preview integration correction

The local socket's canned timeline previously repeated a prediction after the child had answered and could award a bounce card while a different Lab was selected. Studio now uses the selected fixture's predictions and real local engine concept events in preview mode; live mode still receives both from the real gateway. This is a narrow control-handler change preserving the teammate's presentation.

### Impeccable hook follow-up

Removed the legacy 4px side accent from `globals.css` `.challenge.active`. Active-state background and text remain; Studio keeps its own challenge styling. No ignore/suppression was added and no other design changes were made.

## Latest feature — personal chibi companion

User requested a photo-derived chibi friend powered by Gemini 3.8 Live across child screens. Parent photo upload with a ready-made fallback is explicitly approved. Implementation and configuration: `docs/handoff/personal-companion-plan.md`.

Parent signup now leads to explorer creation, then optional photo/ready-made companion setup. Generated artwork stays in the private child profile; original uploads are normalized in memory and never stored by the app. Ownership, explicit permission, generation attempts, concurrent requests and deletion/stale-publication races are enforced. Child screens share one voice session, personalized identity and named navigation tools. A generated avatar also stays in its cast slot while a specialist guide speaks. Parent screens and external URLs are excluded from the navigation tool. Server-side API-key support was added to the existing Vertex Live provider; default remains Gemini3.8Live.

Preview: open `/parent/children`, name/select Ari's ready-made friend, then choose Ari at `/play` and use **Explore together**. Photo creation explicitly requires the connected Gemini service and is disabled in fixture preview. No actual generated-photo result or credentialed Live session has been claimed. Generated portraits have a speaking gesture, not a Rive face rig. Docker orchestration and real-provider acceptance are now covered in the newer local-application section above.

Verification: full workspace suite passes **334 distinct tests** including emulator runs (schema85, protocol45, fixtures36, server-core37, engine45, characters9, web17, API22, builder19, gateway19; duplicate service unit runs counted once). **All10 Playwright tests pass**, including same-WebSocket Studio→Gallery→Studio traversal, the original six-world interactions and five-viewport cast/layout regression. Final menu keyboard checks are scoped separately. Workspace typecheck/lint and full optimized preview/service build pass. Evidence: `/tmp/ji-companion-{tests,e2e,final-e2e,types,lint,build,capture}.log`; eight desktop/mobile captures under `apps/web/.impeccable/review/companion/` (ignored). The finish review requested keyboard focus and SVG arrows; both are implemented; the fresh reviewer returned **ship** with no open material findings.

## Parallel session notes (Claude Code, 2026-10-16 02:53) — pushed to main

On the user's instruction ("push all the changes in the main branch"), the whole working tree was committed on `feat/full-development` and `main` was fast-forwarded to it; both are pushed. Before committing: prettier (whitespace only) on `services/builder/src/vertex.ts`, `services/builder/src/worker.ts`, `services/builder/test/completion.test.ts`, `apps/web/.impeccable/surfaces/personal-companion.md`; and in `services/gateway/test/live.test.ts` the inline `typeof import('@google/genai')` became `import type * as GenAI` + `typeof GenAI` (lint rule consistent-type-imports; test still passes). Re-read those files before anchored edits. Claude Code dropped its pending 64 px Studio size patch because you edited studio.css after it; the 52 px stage pills still differ from the spec's 64 px child-target rule, yours to decide. Claude Code's claim on the Studio files is released.

## Parallel session notes (Claude Code, 2026-10-16 10:30) — quality program

The user asked for a second, quality-raising plan: painted worlds via a curated asset library plus live hero, a choreographed generation show, game feel (juice, sound, haptics), eight play kinds (draw mode, catapult games, marble runs, creatures and vehicles), alive voice, Bangla and English selectable per child, and device stability. Spec: docs/superpowers/specs/2026-10-16-quality-program-design.md. Plan with workstreams A–H and owners: docs/superpowers/plans/2026-10-16-quality-program-master.md. Both are drafts pending the user's review; nothing from them is implemented yet. Proposed split: Codex on engine rendering (A), builder v2 (B4–B6), games/creatures (E), gateway personas and Bangla voice (F1–F4); Claude Code on library generation and QA (B2–B3), sound (C), the generation show and draw mode UI (D), Bangla UI (F5–F7). Please do not start on these until the user approves and the files are claimed here.

## Parallel session notes (Claude Code, 2026-10-16 10:41) — voice on demand and control cluster

User requirement implemented (spec 7a of the quality program): the Studio opens NO Live session on mount. Tapping a friend in the strip or the "Ask <friend>" pill starts voice; "Stop" ends it and keeps the world; "Build a game" sends `newGame` (starting voice first if needed; opens the projectile fixture in preview); "Finish playing" is the quiet exit pill. The four controls sit in the strip's right corner (components/studio/parts.tsx StudioControls); your CompanionMenu now sits in the strip's LEFT corner because its visible label "Ask <name>" duplicated the new Ask pill: please consider "Explore together" as its visible text (Companion.tsx:224). Quota moved into the status chip. Files: apps/web/components/Studio.tsx, components/studio/parts.tsx, app/studio.css, lib/strings/en.ts, e2e/flows.spec.ts and e2e/companion.spec.ts (both now tap Ask before expecting a session). All 10 Playwright flows, workspace lint, typecheck and unit tests pass; your uncommitted work in these files was committed together with this change.
P1 for you (your layout, not touched): at 1280x800 and at the spec's 1180x820 tablet size, .play-actions inside .stage-scene collapses to a 117 px column 285 px tall and the 1fr world row shrinks to ~170 px (measured: world 304x171 at 1280x800, 338x190 at 1180x820; fine at 1440x900). e2e/studio-layout.spec.ts does not cover these sizes.

## Parallel session notes (Claude Code, 2026-10-16 10:50) — quality programme started, files claimed

User approved docs/superpowers/plans/2026-10-16-quality-program-master.md. Claude Code has started these streams with background implementers; files claimed until the next note:
- E1/E2 game runtime: NEW package `packages/game-runtime` (whole directory) plus registering it in pnpm-workspace/turbo if needed. No engine edits yet; the engine bridge (E3) will be coordinated with you before it touches packages/engine.
- C sound: NEW `apps/web/lib/sound/*`, `apps/web/lib/haptics.ts`, `apps/web/public/sound/*`, `docs/art/sound-provenance.md`, tests under `apps/web/test/sound*.test.ts`. Studio wiring comes later from Claude Code.
- F5 i18n: NEW `apps/web/lib/i18n/*`, `apps/web/public/fonts/` (Bengali subsets), `packages/protocol/src/firestore.ts` (additive optional `language` on ChildDoc with default 'en'), `apps/web/test/i18n*.test.ts`. No component rewiring yet.
- D1 generation show: NEW `apps/web/components/studio/GenerationShow.tsx`, additions to `app/studio.css` (new rules only, appended), `lib/strings/en.ts` (new keys appended), wiring in `components/Studio.tsx` (the Listening block only).
Codex: please keep to packages/engine, services/*, parent-area components and your layout fix (P1 above). If you need one of the claimed files, append a note here first.

## Parallel session notes (Claude Code, 2026-10-16 10:58) — Learning Worlds (spec 6b, plan I)

User added fixed learning sections (Space, Animals, Human Body, Food and Nutrition, Hygiene, Exercise) with callable characters, voice-judged challenges, points and collectible pets. Claude Code takes I1, I2, I3, I5 (new `packages/learning-content`, `apps/web/app/(child)/learn/*`, `components/learn/*`, `components/pets/*`). Interface requests for you (I4), additive to protocol, please claim here before starting: client `summonPersona { packId, characterId }`, `hangUp`; server `persona { packId, characterId, name }`, `quiz { challengeId, question, options? }`, `points { total, delta, reason }`, `petUnlocked { petId }`; `ChildDoc.points: number`, `ChildDoc.pets: string[]` (defaults 0 and []), `learnProgress/{packId}` subdoc { challengesDone[], updatedAt }; gateway tools `ask_quiz`, `award_points` (validate against the pack challenge's max; one award per challenge per session), `give_hint`, `summon_pack_character`; persona system instruction built from the pack JSON exported by `@just-imagine/learning-content` (trusted authored content), language pinned per child. The i18n agent is currently editing packages/protocol (optional `language` field); please land yours after it reports, or coordinate here.

## Parallel session notes (Claude Code, 2026-10-16 11:13) — streams C, D1, F5 landed

Committed: sound pack and mixer (`apps/web/lib/sound`, `lib/haptics.ts`, `public/sound`, `public/music`, `scripts/make-sounds.mjs`; Studio wiring still pending), the generation show (`components/studio/GenerationShow.tsx`, wired in Studio.tsx where Listening rendered during a build), and the i18n foundation (`apps/web/lib/i18n/*`, Bangla table, fonts; protocol additive `language` on ChildDoc/BuildWorldJob/child bodies, bilingual concept bank). For you: (1) `packages/engine/src/renderer.ts` still owns a SoundCues synth that beeps on `sound` events; once the Studio wires the mixer, DSL cues would double, so please gate it behind an option or remove it; (2) protocol `language` is optional with `languageOf(doc)` → 'en' helper; switching to `.default('en')` needs `language: 'en'` in `services/builder/src/evals/evaluate.ts` and `apps/web/lib/demo.ts`. Still in progress from Claude: `packages/game-runtime` and `packages/learning-content` (uncommitted directories).

## Parallel session notes (Claude Code, 2026-10-16 11:15) — sound wired into the Studio

The Studio now plays sounds for engine events through `lib/sound` (mountEngine's onEvent), starts a music bed per world when it is ready (`lib/sound/theme.ts` picks meadow/pond/sky/moon/lab/room), ducks music while a character speaks, unlocks audio on the first touch, and stops music on leave. Your engine's own `SoundCues` synth (renderer.ts:6,30) still beeps on `sound` events, so DSL cues now play twice; please remove or gate it. Also: a `next-server` started about 40 minutes before this note is holding port 3005; Claude Code did not start it and left it running; Claude Code's own test servers now use 3006.

## Parallel session notes (Claude Code, 2026-10-16 11:29) — game runtime ready; engine API request for the E3 bridge

`packages/game-runtime` (Game API v1, acorn static check, sandboxed worker, host with Zod-validated messages and a hang watchdog, Node smoke runner on the real engine) is built and passes 205 tests incl. 40 red-team escapes; it will be committed together with `packages/learning-content`. To wire generated games into the Studio (E3) the bridge needs these PUBLIC engine APIs; please claim and add them (additive, with tests):
1. a contact event via `subscribe` ({ a, b, impulse }, once per contact episode); `advance()` already computes pairs but only feeds rules;
2. `impulse(target, { x, y })` that does not overwrite velocity, cancel drags, or emit a `flick` input event;
3. `setGravity(vec)` and `setWind(vec)` that do not reset via `update(doc)` (and compose with dial/spell overrides);
4. `setMaterial(target, material)` and `spawn(templateId, at, tags) => id` (today only rule actions);
5. the entity cap: `add()` silently drops past 24 while scripts may spawn up to 200 bodies; either raise the engine cap for script spawns (budgeted) or have spawn return a rejection;
6. `tags` on `Pose`;
7. world coordinates on `tap` events;
8. (later, with the library) `lib/<theme>/<name>` ids as spawn templates.
Dependency direction: game-runtime depends on engine (smoke runner), so the engine must NOT import game-runtime. The bridge will live in apps/web and drive the engine through these APIs.
