# Web and characters review

Reviewed 2026-10-15 against `web-brief.md`, `web-report.md`, the approved design spec (Studio/Labs, audio, authentication), and current source. This is a read-only code review plus one executed audio lifecycle reproduction. No application source was changed. Engine implementation is being reviewed separately; references below explain frontend integration behavior.

## Important findings

### P1 — Ending during the microphone permission prompt does not cancel capture

- Locations: `packages/characters/src/browser-audio.ts:48`, `:56`, `:76`; `packages/characters/src/voice-client.ts:43`, `:122`; `apps/web/components/Studio.tsx:154`, `:284`.
- `startCapture()` awaits `getUserMedia()`. `stopCapture()` stops only an already assigned stream. After permission resolves, the only cancellation check is `disposed`; `VoiceClient.end()` calls `stopCapture()`, not `dispose()`.
- Reproduction: enter real Studio with microphone permission undecided, finish or navigate to Gallery, then allow the pending microphone request. The new stream attaches after the session has ended and remains live until a later disposal. The socket does not reopen, but microphone capture still runs.
- Executed an isolated Node harness that transpiled the actual `BrowserAudio` source and mocked AudioContext/worklet/media devices. Sequence `startCapture pending -> stopCapture -> resolve permission` returned `{ stoppedTracks: 0, attachedSources: 1, captureStillAttached: true }`. This verifies the lifecycle race, not real-device browser permission behavior.
- Fix: invalidate pending capture requests when stopping, stop any stream resolved for an invalidated request, and prevent duplicate concurrent starts. Cover the delayed-permission/end case in an audio regression test.

### P1 — Opening a saved world does not attach that world to the real voice session

- Locations: `apps/web/components/Gallery.tsx:24`, `apps/web/components/Studio.tsx:77`, `:136`; `services/gateway/src/gateway.ts:111`.
- Gallery writes the selected ID to `ji-world`, and Studio subscribes to that ID. However, Studio adds `hello.worldId` only when `env.fake` is true. The real gateway initializes its record from the optional hello world ID.
- Reproduction: real-mode Gallery -> open an existing world -> inspect the initial hello frame. The world renders from Firestore, but the frame has no `worldId`; gateway tools such as `set_variable` and `set_dial` see no active world, and saved-world context is absent.
- Fix: use one selected world identity for the subscription and hello. Scope/clear the stored selection on profile changes so a fresh profile choice does not reopen another child's previously selected world. Add a real-mode transport test for Gallery -> Studio.

### P1 — Sliders bypass required message throttling and can disconnect voice

- Locations: `apps/web/components/Studio.tsx:254`, `:440`; `packages/characters/src/voice-client.ts:118`; `services/gateway/src/gateway.ts:94`.
- Every range `onChange` applies locally and sends a WebSocket `variable` message immediately. There is no frontend throttle. The gateway closes the socket after more than 30 control messages in a one-second window, before its later semantic throttling. The spec requires one variable update per 300 ms per variable.
- Reproduction: continuously drag a sufficiently fine-step lab slider so it emits more than 30 changes in a second; its messages reach the transport unbounded and trigger gateway close code 1008 / `Message rate exceeded`. The existing keypad test sends only one update and does not exercise this.
- Fix: retain immediate local updates, throttle/coalesce network updates per variable, send the final value, and cancel timers when ending or changing world. Test message count and final value with fake time.

### P1 — Playground entity interactions have no keyboard equivalent

- Locations: `apps/web/components/Studio.tsx:311`, `:422`, `:450`; `packages/engine/src/renderer.ts:42`, `:330`.
- The canvas accepts pointer events only and has no keyboard handler or focusable interaction surface. Studio's named entity action buttons exist only inside `world.doc.variables && ...`, which excludes ordinary playground worlds.
- Reproduction: enter Jelly Dragon and navigate with Tab/Enter. Controls and prediction answers are reachable, but the dragon cannot be tapped, dragged, or flicked through any keyboard action. The core playground interaction is unavailable to keyboard users (WCAG 2.1.1).
- Fix: expose named entity actions for playgrounds as well as Labs and provide an intentional keyboard equivalent for manipulation. Coordinate canvas behavior with the engine owner. This finding is based on source inspection, not an assistive-technology session.

### P2 — Displayed variable and dial values diverge from the running simulation

- Locations: `apps/web/components/Studio.tsx:165`, `:317`, `:439`; `packages/engine/src/simulation.ts` `update()` and `reset()`.
- Every WorldSource update replaces slider values with document defaults. The engine correctly preserves runtime variable values on an asset-only update. In the opposite direction, the Reset button resets the engine to the document but leaves React's `values` and `dials` unchanged.
- Reproduction A: change launch speed, then receive a progressive asset update with unchanged variable definitions. The displayed speed returns to the default while the simulated launch still uses the changed speed.
- Reproduction B: change launch speed or gravity, press Reset. The simulation returns to its defaults while the slider/select continues showing the previous setting.
- Fix: reconcile UI state with the engine snapshot and update only genuinely changed variable definitions; explicitly refresh values and dials on reset/world replacement. Verify both progressive-update preservation and reset behavior.

### P2 — Active/completed challenge state is invisible, and valid visual-only labs omit challenges

- Locations: `apps/web/components/Studio.tsx:117`, `:201`, `:422`, `:463`; `apps/web/app/globals.css` `.challenge`.
- A challenge message changes only the `active` CSS class, but no corresponding selector or active-state text exists. Completion clears that same invisible state, leaving the identical challenge goal/hint visible. Challenge rendering is additionally nested under the presence of `variables`, although a valid lab may have visuals without variables.
- Reproduction: send a challenge message for a loaded challenge and then complete it; the banner provides no visible or announced start/completion change. Load a valid visual-only lab with challenges and no variables; no banner is rendered.
- Fix: render challenge status independently of variables, communicate active/completed state with text and a live announcement, and clear state when switching worlds.

## Positive evidence and reviewed boundaries

- Session creation verifies same-origin requests, revoked tokens, authentication freshness and explicit first-account consent. A transaction checks the deletion lock before creating the account. Cookie settings include HttpOnly, SameSite=Lax and Secure in production; parent layout verifies the cookie server-side. The existing session tests mock Firebase and are not a real OAuth/emulator browser proof.
- Parent mutations use the API transport with ID tokens, deletion requires a confirmation dialog, and dialog code traps Tab, handles Escape and restores focus. Real deletion removes the cookie but does not explicitly sign out Firebase or clear the selected child/world browser state; server-side deletion/revocation remains the enforcement boundary. No deletion bypass was established in this review.
- Real/fake data and transport selection is explicit. Preview capture is disabled, payment buttons are disabled with explanatory copy, and no finished Rive assets are claimed. The web report accurately limits fake voice conversation to the jelly-dragon script.
- World documents flow through an independent WorldSource, not WebSocket messages; Firestore snapshots are schema-validated. VoiceClient retains session/world identifiers on reconnect, refreshes tokens, bounds retries, flushes interrupted playback, and stops existing capture on terminal messages.
- Child UI has no free-text field. Numeric values are clamped/stepped; guide choices are age-filtered; captions and quota/error/end controls are present. Native labels, focus styles, reduced-motion rules and explicit child target sizing are in source.
- Impeccable's mechanical detector on `apps/web/components` and `apps/web/app/globals.css` returned `[]`. This does not cover functional/accessibility findings above.

## Evidence limits and remaining product scope

- The implementation report records 12 web unit tests, four Playwright flows and real/fake builds passing. Those commands were not rerun by this reviewer; this pass executed only the isolated pending-capture reproduction and mechanical detector. No production services, payments, real microphone, Safari, screen reader, load test or visual sign-off was exercised.
- Existing Playwright flows use preview data and do not cover real-mode Gallery hello identity, delayed microphone permissions, slider transport rates, progressive runtime-value preservation or keyboard playground interaction.
- The broader approved spec also calls for a parent Labs unlock control and engaged-minutes/loops/concept-coverage dashboard presentation. ChildForm does not expose `labsUnlocked`/`tier`; the dashboard currently shows today's voice usage, child targets and record lists. The report already discloses the absent weekly chart. These are product-scope omissions, separate from the six reproducible defects above.
- Final artwork and Rive assets remain an acknowledged external prerequisite. Runtime fallback presentation does not implement mouth/emotion animation; this is not evidence of a broken asset load.
- Impeccable context reported legacy PRODUCT.md schema (`product-schema-legacy`); no documentation migration was performed. Its `init` command owns that optional migration.

## Scoped fix re-review — 2026-10-15

The six findings above are retained as the original review record. Re-reviewed the subsequent source fixes without editing application source. The status below supersedes their original open status, subject to the verification limits stated here.

1. **Pending microphone capture: fixed and regression-tested.** `BrowserAudio` now invalidates a capture generation on stop, stops a late-granted stream before attaching it, deduplicates concurrent starts, and rejects stale capture frames. Independently ran the characters test suite: **8 tests passed across 3 files**, including the executable delayed-permission/deduplication regression. No real-device microphone assertion is implied.
2. **Saved-world hello identity: fixed by source inspection.** Real Studio includes the stored Gallery world ID in hello. Choosing a profile clears that stored ID, preventing an old selection from silently carrying into a fresh profile choice.
3. **Variable transport throttle: fixed by source inspection, with lifecycle corrections.** Local engine/UI updates remain immediate; a 300 ms timer coalesces outgoing variable values. The first fix cleared a timer without clearing its ref, which would suppress all later sends after a world switch. This was reported during re-review and corrected. Every reviewed cancellation path now clears both timer and ref/pending values: selection, subscription replacement, server bye, manual finish, reset and component cleanup.
4. **Keyboard playground controls: original missing-action finding fixed by source inspection.** Named dynamic-entity buttons now render for all worlds. Enter/Space taps the entity; arrow keys apply a directional push, with an accessible description. This establishes keyboard interaction alternatives; a full keyboard/assistive-technology usability audit is still outside this review.
5. **UI/runtime variable synchronization: fixed by source inspection.** Same-world snapshots preserve values when the variable definition is unchanged; changed/new definitions take document defaults. Reset explicitly resets visible values/dials and clears pending variable sends. A separate world-identity problem found during this pass is also corrected: `selectWorldId` immediately clears old world/overlays/keypad/control state, and engine mounting now depends on `world.id`. A different world therefore gets a fresh simulation while same-ID asset updates retain runtime state.
6. **Challenge state: fixed by source inspection.** Challenges render outside the variables-only panel, use explicit try/active/completed text and an `aria-live` container, and have an active visual style. World changes clear active and completed state.

Parent profile forms additionally expose learning mode and early Labs permission. The dashboard now includes a seven-day session-minutes chart plus loop and unique-concept counts. The chart derives minutes from recorded `voiceSeconds`; it does not establish a separately measured attention/engagement metric.

During the bounded re-review, an additional selection edge case was reported to the implementation owner: clicking an already-selected preview fixture cleared `world` although subscription dependencies were unchanged, leaving a permanent loading state. **Closed by source inspection:** `switchWorld` now returns immediately when the requested fixture ID matches `selectedWorld.current`.

The re-review did not rerun browser flows, real-mode Firebase integration, builds or visual capture. The implementation owner is adding browser regressions for the changed controls/lifecycle. Source closure here should not be described as complete production verification.
