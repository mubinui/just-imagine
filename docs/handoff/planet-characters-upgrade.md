# Child-created worlds with characters

2026-10-16. Acceptance example supplied by the user: planets should be characters a child can interact and speak with, rather than another gravity template. Preserve the user's uncommitted game-runtime, Learning Worlds, admin, sound and Bangla work.

## Findings at the start of this pass

- The running builder bundle has neither the new game prompt nor GameScriptModel. All seven saved worlds have no game script. Running a new web image alone does not activate the new generator.
- `imagine-game.ts` has a genuine sandboxed game pipeline, but it skips Lab-tier children; gateway selects Lab from the profile even when the child asks to create a game.
- Scene variables are restricted to Labs. Scripts receive variable events but the scene cannot declare custom game-rule inputs.
- Authored planet personalities already exist in Learning Worlds. Child-created worlds cannot yet declare their own conversational characters. Adding another fixed planet menu would not provide creative freedom.
- Assets stop being scheduled after 25 seconds, leaving later requested characters without their illustrations.

## Outcome

A child asks for a solar adventure; the builder creates the requested setting, cast and game. Each declared character can take the existing Gemini Live conversation when selected, with its own personality and topic. The friend can return, and the child can request another character by voice. This is a generic scene capability suitable for planets, animals or invented characters.

A child's created game can expose its own numeric rule controls (for example orbit speed, jump power or a collection goal), rather than being limited to gravity/wind/material. Changes use validated ranges and reach the running script without rebuilding the game. The original physics and Lab controls remain compatible.

## Work order

1. Extend scene contracts with optional conversational character data and a game-rule variable binding. Keep saved scenes compatible and validate/moderate generated character text.
2. Extend gateway/session protocol to select an owned world's character and return to the friend. Reuse the existing Live handoff and moderation; preserve authored Learning World personas and English/Bangla. Make Lab selection explicit for new worlds and forward the child's language.
3. Connect builder prompts and game scripts to the new character/variable metadata. Require scripts to react to declared game-rule variables. Give character artwork enough generation time and prioritize the cast.
4. Add discoverable character conversation controls to Studio and a clearly named custom-rule panel. Canvas taps and accessible buttons must both work. Preserve the current dock and warm shell.
5. Verify source checks, then rebuild the actual builder/gateway/web together. Generate a new planet adventure through real services, select characters, change a rule and save/reopen. Capture desktop and phone. Do not overwrite the demo family's existing creations.

## Proof and limitations

Success means the requested characters exist, switching changes the real Live persona, and at least one custom rule changes actual play. Schema validity and a screenshot alone do not prove that. Keep fixture previews clearly distinct from new Gemini output. No prediction about competition results is justified by infrastructure or test counts.

- [x] Research current source and running bundle; record the user's concrete acceptance example.
- [x] Scene/runtime controls and character contracts.
- [x] Real character handoff and generation routing.
- [x] Studio character interaction and custom controls.
- [x] Rebuild and real-service acceptance.

## Implemented behavior

The existing sandboxed game runtime now receives custom game variables immediately, including their initial values and replayed settings. `game.move(target, {x, y})` gives scripts bounded movement for fixed and dynamic actors, enabling real scripted orbits. Ordinary worlds may declare up to six numeric rules; physics and Lab bindings retain their existing restrictions.

Generated characters have moderated name, personality, greeting and topic metadata. The Studio cast and canvas taps select an owned world's actor through the real Live gateway. English/Bangla are preserved. The actor can change declared game variables through the existing tools. A spoken request for Pip or the explicit return button restores the personal friend. Sulafat remains the configured warm companion voice.

Creation no longer quietly substitutes a nearest-template fixture or downgrades an explicitly requested game after failed generation. Invalid scene repair receives the previous candidate and concrete errors, with three bounded attempts. Permanent scene/script failures are surfaced and acknowledged rather than incurring repeated queue retries. Character art is prioritized, with a longer scheduling window, two asset attempts and clean-edge prompts compatible with strict background removal. No image quality or safety gates were bypassed.

## Real-service acceptance artifact

At **http://localhost:3300**, sign in with the existing demo parent, select **Ari**, open Gallery, and choose **Cosmic Planet Adventure**.

- World ID: `w_01m51s06tz1xwbmsnjb6d5gpx3`.
- Real creation job: `j_01m51s06tz1xwbmsnjb6d5gpx4`.
- Real spoken remix job: `j_01m51sedjbbths878e35gzx4jc`.
- Independently selectable Earth, Mars, Jupiter and Saturn, all four generated planet illustrations ready; spaceship and star collection.
- Generated controls: `flight_speed`, `star_goal`, `orbit_speed`. Browser instrumentation measures actual actor movement rather than merely checking slider labels. Replay retains the current controls.
- The spoken remix keeps the same world/cast/rules and permits continued exploration after the collection goal, rather than ending with a blocking win screen.
- Initial real Live checks covered Earth and Jupiter, rule changes, voice return to Pip, and received 2,361 audio frames. Desktop/390px phone captures: `/tmp/ji-planets-final-desktop.png` and `/tmp/ji-planets-final-mobile.png`.

All four app containers were rebuilt from final source; API3301, builder3302, gateway8788 and web3300 share `just-imagine-local:dev`. Persistent Auth/Firestore emulators and existing family/world data were retained. The separate3200 fixture preview is not evidence of live generation.

## Verification and remaining scope

Scoped source suites passed 741 distinct tests: scene92, protocol76, engine64, game-runtime205, builder65, gateway30 and web209. Typecheck, relevant lint and the full Docker/Next build passed. The generated-game browser regression also passes, including finishing play without reading a disposed simulation. A real end-session check exposed that lifecycle bug; the bridge now stops when the Studio ends. No Impeccable hook suppressions were added.

Generation/artwork can still take minutes. Three optional star illustrations did not pass strict background processing and render as native golden star geometry; all four character images succeeded. Broad arbitrary-game support, appearance-edit asset regeneration, conversational undo, richer generated-character animation, and child/device usability remain follow-up work. This pass validates one demanding creative example; it does not establish unlimited generation or a competition result. User and teammate changes remain uncommitted and preserved.

Final rebuilt-image browser confirmation: `/tmp/ji-planets-final-browser.log` reports success, all four planet images ready, replayed controls retained, real voice rule change, real spoken return to Pip, ongoing exploration, 1,393 audio frames and zero page errors through explicit session finish. Measured Earth movement rates were 0.224 versus 1.400 stage units per simulation second at low/high orbit settings. One preceding model-driven return request timed out; the subsequent run passed without an explicit-button fallback. Keep evaluating Live tool-call reliability rather than treating this example as a guarantee. A transient session lock during rebuild also resolved normally; no active session lock was forcibly removed.
