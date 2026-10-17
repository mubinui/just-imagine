# Learning character calls and Live voice

Date: 2026-10-17. Branch: `feat/family-schools-integration`, worktree `../just-imagine-integrated`. Local app: <http://localhost:3300>.

The user reported poor Sun/Tooth call animation and the assistant automatically starting after End call. The actual combined app was inspected; the existing family, school, Studio, stories, voices and original raster artwork are preserved.

## Call ownership and cancellation

The learning End call previously sent `hangUp`, whose server meaning is to return to the companion while keeping the session and microphone alive. It now uses `stopChildVoice`, sending the terminal end, invalidating connection work and stopping capture/playback. Closing the learning portrait or leaving an owned learning call also ends it. An unrelated companion call is not stopped merely by mounting/unmounting a learning hook that never requested a call.

A per-request generation discards delayed unlock success/failure, pending-ready callbacks and obsolete persona acknowledgements. End is available while connecting. Studio and companion starts share a cancellation-aware audio unlock so a stopped tap cannot connect later; the companion Stop control remains available during reconnect too. Observations are sent only for the matching active learning persona.

VoiceClient coalesces desired guest selections and gates capture/playback until the latest persona and ready acknowledgements arrive. World/companion selection priority and explicit internal return semantics remain intact. Old socket errors/token rejections cannot affect a redial. Playback worklet events carry an epoch: delayed old RMS/overflow cannot reopen a mouth or terminate a new call; actual drain barriers remain functional. Gateway startup rechecks closed sockets after awaited authorization/catalog/world/lease work; a cancelled claimed session is released and finished without opening Live or asking a model for a recap.

Ringing/animal clips accept per-request AbortSignals. Cancellation before/during decode cannot start a delayed sound; active cancellation stops only the owned clip. Shared decode caching, other cues and music remain intact. Call starts occur in the user tap, without an artificial 1.7s delay. Guest transcripts are excluded from companion captions, and closed/error status clears old captions.

## Character presentation

Tooth previously overlaid multiple complete atlas images. It now mounts exactly one clipped, opaque image and selects the original eight cells through the shared visibility-aware clock. Brushing, wave, cheer and blink retain their meanings. Sun/shared speech poses now have a 180ms minimum dwell and a 180ms sustained-silence release. A varying 30Hz envelope produced 15 pose changes in 3 seconds, with a measured minimum spacing of 200ms; silence settled at 180ms. Reduced motion keeps representative action and stable speech poses.

The close-up and story guide accept mouth energy only from their matching `speakerId`. Entrance animations cancel on interruption; the fallback is a short settling entrance without an overshoot. The story remains mounted, hidden and inert during close-up, while its painting supplies the background. This removes duplicate full-body actors and overlapping controls without changing chapter state. The phone shakes for two bounded rings; the portrait remains steady. Its bottom stays within the portrait slot so the character name remains visible. Compact bilingual Talk/Call/Back text retains full character-specific accessible labels.

These are the existing eight-pose raster actors: no new artwork, continuous skeletal rig or phoneme lip-sync is claimed.

## Checks and acceptance

- Full web suite: 368 tests / 44 files. Character/audio client suite: 39 / 3. Full gateway unit suite: 76 / 9. All 30 source typecheck/lint tasks passed; the final web correction batch also passed all 368 tests, typecheck and lint.
- Ten hook regressions run actual hook callbacks with controlled transport timing: End, unlock/ready cancellation, latest guest, stale acknowledgement/error, reconnect and owned/unrelated unmount. The node harness does not claim native React scheduling/StrictMode coverage.
- Generated worklet source executes inside a VM, including PCM drain, epoch cancellation and delayed RMS/overflow. Mixer regressions cover cancellation before/during decoding, active stop, unrelated playback and listener cleanup. Gateway tests cover cancellation during claimed startup without a provider call.
- Native Safari used the actual app in Bangla. The user explicitly approved a brief Mac microphone test sending captured audio to the configured Gemini service. Real Sun and Tooth calls reached listening, showed the browser microphone indicator and returned distinct in-character Bangla speech/captions. A Sun challenge was requested but no answer button or quiz submission was made; points remained3. Each End returned to voice off, and the companion menu explicitly showed microphone off without a new call.
- Initial desktop/mobile acceptance found phone-frame/name overlap, long Bangla call labels and guest captions retained in the companion menu. One correction batch addresses these. After rebuilding, final confirmation passed: the 390×844 Tooth call had a readable name, one body, complete captions and fitting End/Back controls. The companion menu after End showed microphone off with no guest caption. Desktop Sun likewise had a readable name below its phone frame, one body and no underlying story controls. An immediate Sun redial was observed connecting with Cancel available; ending it returned to off and no companion restart occurred. Native inspection is visual/status evidence; audio timbre and phoneme-level lip-sync were not independently assessed.

## Local runtime

Production builds reuse the completed dependency image from source checkpoint3771f83 with no dependency changes, copy current packages/services/web, and rebuild all three servers plus Next. Final image manifest is `eecc5123d3ff3f43f32fefa29bd9d1de4a60e39a67a66d321114205648a2cabe` (manifest list `39e4aa161b3bc9feb92873417e0ba9365a67ba8ca4b1ae55820a9f1a6357c493`). All16 changed source files match both running web and gateway images by SHA-256. Web/API HTTP health return200. The final gateway log records exactly three intended session starts and three ends, ending at count0, with no Live-open/release/finish errors; initial native checks before its refresh also ended both calls at count0. Only web and gateway are refreshed; API, builder and persistent Firestore/Auth instances remain running. Persistent emulators are never reset. Calls create ordinary metered session records; no roster, credentials, points or chapter completion is rewritten by this pass. No push or cloud deployment.

Logs: `/tmp/ji-learn-call-{web-tests,web-confirm,web-type-final,web-lint-final,web-type-confirm,web-lint-confirm,checks,build,confirm-build}.log`, `/tmp/ji-learn-end-gateway-unit.log`, `/tmp/ji-learn-call-runtime-final.json`. Scientific worksheet evidence remains in [school quality assurance](school-quality-assurance.md). Earlier generated-world timeout remains outside this scoped call repair.
