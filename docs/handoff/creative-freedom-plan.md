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

This plan delivers broad composition within a validated2D engine. Arbitrary generated JavaScript, unrestricted websites,3D games, multiplayer, new billing or cloud-account migration are outside this change. More capabilities can be added to the registry later without returning to fixed scenario selection.

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
