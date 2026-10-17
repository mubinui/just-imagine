# Generated game quality: operations and source map

2026-10-17. User asked for high-quality games authored with Argon according to the child's imagination. This pass strengthens arbitrary generated behavior and preserves the prior language, story, native motion-art and learning work. School ownership is confirmed: Claude implements; Codex reviews and integrates.

## Runtime configuration

Use http://localhost:3300. The local compose defaults now select `gemini-4-argon` for `SCENE_MODEL` and the independent `GAME_MODEL`. `GAME_MODEL_LOCATION=global` controls the authoring client with Vertex credentials; configure it explicitly for a production deployment. API-key requests use the Gemini API. `FAST_MODEL`, image models and `gemini-3.8-live` remain separate.

Keep the existing server-only `GEMINI_API_KEY` in root `.env.local`; do not copy it to web variables. Game authoring has no silent model fallback. Planning uses MEDIUM reasoning, code HIGH, bounded transport and abort deadlines, and at most two code attempts. A rejected nested schema400 can retry JSON mode on the same model and still must pass strict local validation. The existing scene adapter retains its own availability fallback; a configured scene-model name alone is not proof that every scene call used that model. Provider request telemetry reports the game model, phase and duration without prompts or child names.

## Publication path

1. Compose and independently review a physical scene against the actual child words.
2. Before writing new behavior, independently derive bounded data-only acceptance journeys from those words and the scene. Preserve exclusions and unrelated existing behavior in edits. Pure Live conversations can explicitly use the existing character system without invented game rules; voice is then marked outside physics coverage.
3. Generate a complete scene-specific programme against the existing isolated Game API. Preserve free play: no compulsory scores, timers, quizzes, genre or endings.
4. Run static/sandbox checks, the existing generic smoke run and moderation. Then run the exact planned inputs in fresh real physics worlds: empty-space/entity taps, static characters, spring dragging/release, flicks and the selected question option.
5. Measure destinations, both velocity components, displacement, stateful command targets, disappearance and continuous separation where planned. Check invariants such as a disabled portal leaving the player in place. Every positive effect names its own input trigger. Repeat with the same seed and only the inputs before that trigger: the effect must fail there. Runtime/budget failures in idle or prefix controls reject publication; they never count as causal evidence. Moderate strings on these paths too.
6. Feed concrete failures into the existing single repair attempt. If still wrong, reject the creation or edit; do not substitute a template or stale behavior. Art generation follows accepted behavior.

Model-authored tests are samples and can misinterpret a wish. The data contract, real engine and causal controls provide evidence, not a proof for all possible inputs or a guarantee of enjoyment. Keep real browser and human acceptance separate.

## Visual defect found during acceptance

The first fresh planet world generated a correct2K starfield and two expressive planet portraits, but an optional opaque mid-layer painted an unrelated forest over the starfield. The generation flow and controls passed; its rendered setting failed visual review. The before captures are retained, not relabelled a visual success.

The correction has two parts. The renderer inspects a small alpha sample once per optional texture and hides plates with less than55% clear area, including legacy saved plates, without rewriting saves or retrying an immutable rejection every frame. Normal backgrounds and character textures are unaffected. New mid-layers use an `overlay-v1` cache namespace and a sparse wide-canvas keying prompt. Full-canvas processing preserves placement and16:9 proportions; it requires at least60% transparency and visible decoration, and vision review checks the requested decoration rather than a second landscape. A failed optional decoration cannot cover the accepted backdrop. Existing transparent plates remain supported.

## Source map

| Path                                                   | Responsibility                                                                                        |
| ------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| `services/builder/src/game-model.ts`                   | Independent model configuration, structured/JSON planning, reasoning, deadlines and request telemetry |
| `services/builder/src/game-playtest.ts`                | Strict data plan, intent prompt, real-world assertions and input-prefix controls                      |
| `services/builder/src/{imagine-game,game-prompt}.ts`   | Plan-before-code orchestration, publication gate and bounded repair                                   |
| `packages/game-runtime/src/{drive,smoke}.ts`           | Exact input playback, real drag release, trusted frame observation and resource disposal              |
| `services/builder/src/{layer-art,worker}.ts`           | Sparse transparent layer processing, separate cache and generation integration                        |
| `packages/engine/src/{textures,renderer}.ts`           | Legacy opaque-layer protection and texture lifecycle                                                  |
| `services/builder/test/recordings/game-quality-*.json` | Portable real Argon outputs; replay tests need no key                                                 |

## Verification

- Real Argon access with the supplied key succeeded. A new two-planet scene and behavior passed the prewritten physics journeys; that diagnostic required two code attempts. A separate switchable portal programme passed on its first attempt, including disabled behavior, re-enabling and repeated teleports. The portal scene was an isolated modified fixture, not a fresh generated-art world.
- The first complete real browser creation used a separate temporary family: exact wish retained, actual native assets, tap-to-approach/return on both planets, low-speed rest, desktop and390×844 phone,1,905 audio frames, no page errors or document overflow. Its scenery defect above remained a visual failure until corrected.
- Portable replay tests exercise both actual Argon programmes and reject mutations disconnecting planet taps or breaking the portal's disabled-state guard. Other regressions catch no-op/caption-only implementations, automatic returns, unrelated score masking, blocked routes, held-body echo, malformed plans, invalid answers, branch moderation, transient overlap and opaque/empty layers.
- Latest unit totals: engine77, game-runtime206, builder117. Builder's isolated integration-inclusive run passed132 tests on8085/9095 with proper rules; persistent demo emulators8080/9099 were untouched. Full repository typecheck/lint passed26 tasks; Docker/Next build and scoped formatting passed. These are distinct from real model/browser evidence.

The final visual rerun and cleanup are complete; details follow. No new school implementation, cloud deployment, release tag or push is implied. Preserve existing dirty-tree work and the published `demo-2026-10-16` tag. Native generation reliability, target-device audio, continuous film rigs and real-child enjoyment retain separate acceptance.

## Final fresh run and data handoff

Final world `w_01m54j634xn5gprf70bph47g6g`, job `j_01m54j634xn5gprf70bph47g6h`, was created through the actual app under a separate fake QA family. Both actual generated planet portraits and the2K starfield were ready. The exact original wish was retained. Tapping each planet changed its position and produced the matching Live `worldCharacter` acknowledgement; both approach states reached zero velocity. Return paths were checked within0.6m while still settling; rest is also checked independently by the prewritten engine plan. Final browser capture and phone overflow checks passed,2,610 audio frames returned, zero page errors. Screenshots were inspected: the starfield remains visible and the unrelated forest is absent.

The optional native overlay did **not** pass: first attempt failed vision review, second failed registration/transparency. It was omitted and its reference remained a placeholder. That is safe optional degradation, not evidence of a successfully generated transparent plate. Synthetic/native-alpha unit cases verify the new processing and legacy protection. Native overlay generation reliability remains a follow-up.

Provider telemetry confirms the actual authoring model `gemini-4-argon`: nested plan schema rejected in1.6s, same-model JSON plan succeeded in14s; first HIGH code call timed out in89.5s, second succeeded in82s and passed. Artwork phase took53s. This still involves substantial generation latency; do not describe it as instant or universally reliable. Cloud dispatch/lease timing needs its own deployment acceptance; this pass verified the durable local queue.

Both QA families/worlds are deleted and their Live sessions ended. Correct-project count-only audit:0 temporary Auth accounts/profiles,0 active local tasks,0 world locks,0 pending deletions. Ari's Bangla selection,3points and16worlds remain, with both original named worlds present. Auth/Firestore export succeeded. Four app services were rebuilt/refreshed while the persistent emulators stayed up.

Local ignored evidence: `apps/web/.impeccable/review/game-quality/` (before correction), `game-quality-final/` (final desktop/phone). Logs: `/tmp/ji-game-quality-{final-browser,runtime,final-tests,integration,final-source-checks,final-build,export}.log`; model diagnostics and replay source are retained in the source-backed recordings. Temporary log paths are not durable across machines. This pass adds no broad Impeccable suppression; the historical side-tab border remains absent. No CSS or navigation layout was changed in this pass.
