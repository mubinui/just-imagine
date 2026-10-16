# Creative freedom, clear speech and a visible companion

Requested 2026-10-16. Preserve the approved cream/forest identity and the real-service demo family. The child should invent the setting, characters and rules by talking, play immediately, and change their creation with the same companion. Examples are optional inspiration, never a required choice.

## Research findings

- `packages/characters/src/audio.ts` starts PCM playback immediately, abruptly returns to zero on starvation, and drops the oldest samples beyond three seconds. A synthetic six-second burst retains only three seconds. A deliberately slow delivery simulation produces 50 hard signal jumps in two seconds. This demonstrates defects; it does not prove which one the user's device is experiencing. The user reports crackling throughout speech.
- `browser-audio.ts` posts amplitude on every audio quantum (about 375 messages/second at 48kHz). Throttle animation notifications independently of continuous audio processing. The API's input16kHz/output24kHz format already matches the code; changing pitch or merely changing the voice does not repair playback.
- `services/gateway/src/gateway.ts` also discards outgoing audio when its socket queue exceeds three seconds. Handle overload explicitly instead of quietly omitting words.
- `packages/protocol/src/characters.ts` binds voice to character identity; the default Bhombol voice is Puck. Personal companion appearance, teaching persona and voice need independent decisions. Use Sulafat for the personal companion and warm, clear, unhurried phrasing. Preserve explicit guest-guide identities.
- `components/companion/Companion.tsx` already implements a shared session and allowlisted voice navigation to Studio, Gallery and the explorer picker. Studio suppresses the floating avatar and uses a text-only **Explore together** trigger. Make the existing friend recognizable and label its purpose. Parent/account actions remain parent-owned.
- The real Studio does not display the preview Storybook selector. `build_world` already accepts a free description. However, `services/builder/src/prompts/v1.ts` supplies six full example worlds and mandates a ground, dynamic hero, concepts and prediction. Live prompts require a teaching loop. These are strong constraints on what gets created.
- After two invalid scene attempts, `worker.ts` silently selects a concept-matched fixture. The world can become ready without expressing the child's original idea. Asset scheduling stops starting requests after25s and then marks the world ready, even if some requested assets were never attempted. Patches change scene data but do not regenerate artwork for changed descriptions.
- The scene schema and engine support physical objects, drag/flick, collisions, timers and bounded actions. They do not yet offer a general vocabulary for player movement, inventory, ordered goals, portals or multi-room adventures. More example prompts alone cannot deliver these mechanics.

Dependencies: shared scene/protocol schemas → gateway tools and builder → stored worlds/versions → engine and Studio. All scene changes need backwards-compatible parsing and existing-world replay. Preserve ownership/deletion fences, quotas, moderation and validated data execution.

## Child experience

The empty Studio centers the personal friend and one invitation: **What shall we make?** Listening begins only after the child's existing audio gesture/permission. The friend asks one short question only when a rule or action is genuinely unclear. The child never needs to select a lesson or template before creating.

Example: “A cat delivering cupcakes on the Moon.” The companion can ask, “Shall we drive or jump to each house?” Play starts with that choice. “Make the bridges bouncy,” “Add a sleepy dragon,” and “Undo that” edit the same game. “Show my saved worlds” opens Gallery without losing the voice session or current creation. Optional learning observations follow play; prediction questions do not block every creation.

Keep the shell warm and calm. Let each imagined world choose its own coherent colors, setting, characters and sounds. Do not constrain an underwater town or night sky to a meadow palette. No generic feature-card grid, decorative badges, or tiny technical controls. Touch and keyboard controls reflect actions the current game actually supports.

## Implementation order

### 1. Repair speech and expose the existing friend — bounded immediate repair

Files: `packages/characters/src/{audio,browser-audio,voice-client}.ts`, `services/gateway/src/{live,gateway,prompts/v1}.ts`, `components/companion/Companion.tsx`, `app/companion.css`.

- Add a small playback prebuffer, bounded wait for very short replies, smooth starts/recovery and interruption fades, and preserve resampling phase across packets. Keep capture16kHz and playback24kHz→device rate.
- Accommodate faster-than-realtime audio bursts without deleting earlier syllables. Keep finite memory; overflow must produce an explicit recoverable state. Reduce worklet-to-UI updates to roughly30Hz and avoid allocations in its render loop.
- Select Sulafat for the personal companion, independent of its preset/chibi picture; use gentle conversational volume, short sentences and patient pauses. Verify configured Gemini Live accepts the voice. Do not claim device listening acceptance from frame counts.
- Put the personal avatar and a clear **Ask [name]** label on the existing Studio navigation trigger. Show a short concrete voice example in the menu. Preserve focus, accessible names, tap destinations and one shared session.

Acceptance: deterministic playback tests at44.1/48kHz for jitter, short phrases, long bursts, fractional resampling, interruption and overflow; gateway setup/delivery tests; actual Live smoke; one desktop/mobile inspection and navigation check; user listening check remains required.

### 2. Preserve the child's intent throughout generation — first creative milestone

New files: `packages/scene-schema/src/creation.ts` (bounded CreationBrief/CapabilityReport), `services/builder/src/planner.ts`, `services/builder/src/prompts/v2.ts`.
Modify: `services/gateway/src/{tools,gateway,prompts/v1}.ts`, `services/builder/src/{pipeline,worker,fallback}.ts`, `packages/protocol/src/{jobs,firestore}.ts`, `packages/scene-schema/src/{schema,gen,migrate}.ts`.

- Capture setting, cast, actions, player goal (optional), rules, mood, and the child's requested changes in a validated creation brief. Preserve the original request separately from the compiled scene.
- Have a planner compose supported primitives; do not choose a fixture ID as the plan. Check requested mechanics against the actual capability registry before promising them.
- Replace six full-world examples with small, diverse composition examples. Allow open-ended play with no forced ground/hero quiz where irrelevant. Learning annotations can remain optional metadata; keep correctness checks for claims about real physics.
- On unsupported ideas, preserve setting/cast and explain the specific limitation in child-friendly language; offer one feasible adaptation. Never silently replace their story with the jelly dragon or pond. On failure keep the last valid world and provide retry; a sample world is an explicit child choice.
- Persist generation provenance and distinct mechanics/artwork states. New prompt/schema versions must coexist with saved v1 worlds and queued v1 jobs.

Acceptance: a fixed evaluation set of twelve unrelated ideas, at least four mechanically different experiences, requested cast/setting/goal preserved, no undisclosed fixture fallback. Manual review must assess whether the result follows the idea; schema validity alone is insufficient.

### 3. Add composable game mechanics — second creative milestone

New files: `packages/engine/src/capabilities.ts`, `packages/engine/src/game-state.ts`, `apps/web/components/studio/GameControls.tsx`.
Modify: scene `schema.ts`, `validator.ts`, `limits.ts`, `migrate.ts`; engine `simulation.ts`, `gesture.ts`, `renderer.ts`; Studio controls and gateway simulation context.

First capability set: direct player movement/jump, collect-and-count, destination/region triggers, ordered goals, simple matching, switches/doors, moving platforms, and restart/checkpoints. Combine these with existing physics, materials, timers, spawning and transformations. Implement prerequisites together: stable entity IDs, controlled-entity designation, collision layers/regions, counters, conditions, deterministic completion and touch/keyboard inputs.

Goals are optional: a child can create a toy and play without scores or winning. Each declared control has a visible, reachable equivalent; no controls hardcoded to dragon/ball/duck IDs. Set entity/rule/spawn budgets and prevent event loops. Defer multi-room streaming until this single-stage vocabulary passes evaluation.

Acceptance examples: Moon cupcake delivery; underwater shell collection; a robot tending color-matched flowers; music stepping stones; a cloud bridge playground; a friendly animal maze. These are acceptance prompts, not a new menu of mandatory scenarios. Tests assert different actual actions and outcomes, not only different pictures.

### 4. Make the picture follow the idea and every edit

New: `services/builder/src/art-direction.ts` and a durable asset task module using the existing queue.
Modify: builder `worker.ts`, `assets.ts`, `vertex.ts`; engine `renderer.ts`, `textures.ts`; world/protocol readiness contracts; Studio progress.

- Produce one art brief per world: composition, lighting, palette, character silhouettes and proportional scale. Generate the setting and sprites from that shared brief.
- Prioritize a playable layout, main character and backdrop; then finish remaining assets durably. Replace the25s scheduling cutoff with explicit queued/generating/ready/failed states and bounded retry. Do not advertise final visual readiness while essential artwork is missing.
- On edits, regenerate only descriptions/assets that changed, invalidate dependent colliders, and retain physics state when compatible. Version geometry and visuals together; avoid new art with an old collision outline.
- Validate image dimensions, transparent edges and subject framing; render for device pixel ratio within GPU/memory limits. Upscaling alone does not improve detail. Keep touch targets independent of physical shape, and preserve measured world units/aspect ratio.

Acceptance: the same six evaluation ideas are visually distinct and recognizable; “make the cat blue” updates its art; “make the bridge wider” updates image/geometry together; restart resumes pending art tasks; failed optional decoration does not block play or masquerade as finished art.

### 5. Conversational editing, undo and companion continuity

New: `services/builder/src/revisions.ts`, `apps/web/components/studio/CreationActions.tsx`.
Modify: gateway tools; existing patch/version storage; Studio; companion provider; API world routes.

- Add bounded add/remove/change-rule/undo operations with a saved pre-change revision. Reuse existing patch validation and ownership checks. Resolve “that one” from selected entities and immediate context; clarify if ambiguous.
- Keep the personal friend visible in a consistent location, with quiet listening/thinking/speaking/reconnecting states tied to actual playback. Guest guides help briefly without replacing the main navigation identity.
- Extend safe navigation with requested “new game,” “continue this,” and opening an owned saved world by name, using resolved IDs rather than model-supplied URLs. Distinguish reset-play from undo-edit and from starting a new world.
- Restore the selected child from canonical profile data and refresh after parent changes. Keep routes and reconnection from creating duplicate microphone sessions.

Acceptance: build → play → three spoken edits → undo → Gallery → reopen → continue, with the same friend and correct world revision. Test deletion during edits, conflicting edits, lost connections and save failures. Parent actions still need the parent flow.

## Delivery and boundaries

Complexity: **high** for creative freedom; audio and discoverability are a smaller first delivery. Ship and verify each milestone before marking it complete. Do not equate working API connections with the desired child experience.

This plan delivers broad composition within a validated2D engine. Unrestricted host JavaScript, external websites,3D games, multiplayer, new billing or cloud-account migration are outside this change. More capabilities can be added to the registry later without returning to fixed scenario selection.

Risks: generated art latency/cost; weak or repeated mechanics despite novel art; stale assets after edits; migration of stored worlds; overloaded devices affecting voice and frame rate. Evidence gates above cover these separately. Real-child enjoyment and actual-device sound still require observation/listening.

## Provider references checked 2026-10-16

- [Gemini Live capabilities](https://ai.google.dev/gemini-api/docs/live-api/capabilities):24kHz output PCM,16kHz input, and Live speech configuration/voice support.
- [Gemini voice styles](https://ai.google.dev/gemini-api/docs/speech-generation): Sulafat is described as warm.
- [Google voice catalog](https://docs.cloud.google.com/text-to-speech/docs/list-voices-and-types): Sulafat is listed as female. Confirm availability against the configured Live model, not only the TTS catalog.

## Status

- [x] Code research and concrete plan recorded.
- [x] Speech repair, Sulafat Live verification and visible companion trigger. Actual-device listening remains open.
- [ ] Intent-preserving generation and honest recovery.
- [ ] Composable mechanics and controls.
- [ ] Coherent generated artwork and edit regeneration.
- [ ] Conversational undo and expanded companion actions.
- [ ] Actual-device listening and child usability acceptance.

## Current implementation pass — authoring instead of parameter selection

User correction: creative control means inventing and changing the world itself. The four-planet example is not the product boundary. Prior authorization to finish development and maintain this checkpoint remains active.

Research: `imagine-game.ts` skips behavior generation for freeplay; `drive.ts` requires a reachable score/win even for a toy; scene and script prompts force controls and heavily anchor full sample worlds. `worker.patch` asks a scene model for code-bearing JSON Patch, never regenerates changed art, and `guardPatchedGame` can silently retain old behavior. Version records only contain the result, so there is no reliable undo.

Implementation order:

1. Runtime/scene contracts: explicit open-play behavior without mandatory scores; keep sandbox and resource budgets.
2. Protocol/storage: preserve original wish and successive changes, plus pre-edit snapshots for undo. Existing worlds stay readable.
3. Builder: compile every ordinary creative world, remove compulsory sliders/template anchoring, recompose edits against the actual current world, compile behavior with the dedicated script model, reconcile/rebuild only changed art, atomically publish with a revision. Keep the last valid creation on failure.
4. Gateway: child directs the idea; use modifications for new actors/actions/rules rather than mapping everything to existing knobs. Add actual undo and pass language/current intent.
5. Studio: a free-form idea/edit field and undo alongside voice, in the existing warm shell. No scenario menu or parameter questionnaire.
6. Validate open-play behavior, structural edits and failed edits, art invalidation/reuse, undo and ownership/concurrency; rebuild and test real services. Broader child usability and arbitrary creative requests still require evaluation.

Complexity high. The internal 2D API and device budgets remain engineering constraints; they must be explained honestly when relevant, never presented as the child's menu of creative choices.

## Accepted authoring slice — 2026-10-16

- [x] Compile open-ended creative play with no compulsory score, ending, ground, teaching rule or numeric controls.
- [x] Replace full-scenario prompt anchoring with API/composition techniques and child-authored requests.
- [x] Preserve original wish descriptions and successive changes independently of the compiled scene.
- [x] Recompose a current world for new actors/actions/rules with the dedicated behavior compiler; preserve unrelated choices.
- [x] Regenerate changed/new artwork; reuse exact unchanged owned art. Reject edits atomically if behavior/art cannot be completed.
- [x] Save pre-edit snapshots, expose actual undo, and test multiple undo steps, ownership and concurrent-write protection.
- [x] Expose a free-form authoring field alongside voice; label numeric adjustments Play settings rather than treating them as authorship.
- [x] Real Live → builder → artwork → canvas → creative edit → exact undo, with no unsolicited lesson overlay.
- [x] Repair chroma collisions/unremoved image frames with replacement-key retries, border validation and `cutout-v2` cache keys; retain moderation/residual-background limits.
- [x] Make HUD scores optional; a scoreless program creates no default score badge. Source regressions and final built-browser no-score verification pass.

Acceptance world: `w_01m51vw9yz4065szfjrfqgc0nj`, **Underwater Post Office**, under demo child Ari at http://localhost:3300. Dragging a bubble letter into the mailbox actually spawns a moon. Real edit `j_01m51x1svd2j10qvrpq5czafa6` adds Lumi and a portal toggle; pointer-driven testing proved delivery succeeds in the open phase and stops in the closed phase. Real undo `j_01m51x52c3e1263erh2dsexjyc` restores the exact previous doc/creation. Current saved world is the original after undo; Lumi's successful version remains in history. `/tmp/ji-author-confirm.log` reports1,031 real audio frames and zero page errors through finish.

The original broad milestones above remain open because the twelve-idea evaluation, capability reporting, new mechanics, full art-direction/durable asset system, expanded navigation and child/device usability have not all been completed. Generic creative authoring is implemented within the existing2D sandbox; do not present a parameter menu or these acceptance examples as its creative boundary.

Final shipping confirmation: `/tmp/ji-author-smoke.log` passes saved replay, no default score badge, no forced lesson dialog, no sliders, stable desktop paint before/after editor resize, mobile paint and phone editor reachability, with zero page errors through finish. Final captures: `/tmp/ji-author-shipped-desktop.png`, `/tmp/ji-author-shipped-mobile.png`, `/tmp/ji-author-shipped-mobile-edit.png`. The first black desktop capture during resize and the earlier quiz-obstructed captures are superseded. No further visual polish is pending in this bounded pass. All four app services run the final image on3300/3301/3302/8788; Auth/Firestore data remain in the persistent emulator volume.

Final Auth/Firestore export to `/data/firebase/snapshot` succeeded after session finish (`/tmp/ji-author-data-export.log`). Existing approved artwork is preserved; the saved acceptance world contains some older prop cutout defects (for example the coral mailbox background), while newly generated/repainted assets use the stronger v2 checks. Treat that as a remaining visual limitation rather than claiming every saved-world image was revalidated.
