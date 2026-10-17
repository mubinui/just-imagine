# Family and schools motion handoff

## Worktree and preservation

Implementation is in `/Users/mubinuiislam/Home/Hackathons/just-imagine-integrated`, branch `feat/family-schools-integration`. The school merge checkpoint is `84082759acb08a16596315500ea204f1d3151938`; the subsequent integration commit contains the implementation below.

The original workspace remains `/Users/mubinuiislam/Home/Hackathons/just-imagine`, branch `feat/creative-experience-upgrades`, HEAD `bc626dd5fb18f621bea1aa88a0acdb3127d7d243`.

Independent read-only SHA-256 verification on 2026-10-17 UTC found:

- **1,043 / 1,043 original source files unchanged**, with no missing files, against the pre-integration manifest.
- **51 / 51 character asset files unchanged** in the integrated worktree: 17 PNGs, 17 WebPs and 17 registration JSON files.
- **71 / 71 Learn cinematic asset files unchanged** in the integrated worktree.
- **24 / 24 captured preexisting family documents unchanged**, with no missing documents, against `.env.family-before-schools.json`. Live reads used Firestore `127.0.0.1:8080`, project `demo-just-imagine-local`, and recursively sorted JSON SHA-256 fingerprints. Document contents were neither printed nor written.

The source snapshot is `/Users/mubinuiislam/Home/Hackathons/just-imagine-session-backups/family-before-schools-20261017-173211`, also recorded in `/tmp/just-imagine-integration-backup`. These counts describe the captured manifest and the earlier document checkpoint; additional school records are separate. Final source/asset hashes still match. Later non-QA session/usage activity and the unchanged 299-record fifth-run baseline are distinguished in `generated-world-runtime-acceptance.md`; no historical data was restored.

## Motion changes

- The engine derives locomotion from the same interpolated position used for drawing. This removes alternating rest-pose flashes between 60 Hz physics ticks on 120 Hz displays and in slow motion. Rotation takes the shortest interpolated arc; airborne runners keep their gait phase still.
- Pixi's uncapped elapsed time detects suspended-tab gaps. Resuming pauses catch-up rather than advancing physics and poses through a hidden interval.
- Portraits share one display-synchronized clock capped at 30 Hz, matching the playback envelope. Mouth attack/release and hysteresis reduce threshold chatter while retaining one opaque facial pose. Hidden and offscreen actors pause.
- Personal single-image chibi avatars use the same shared clock for restrained grounded breathing and smoothed speech presence. At 160 px, maximum combined vertical movement is about 1.25 px; there is no sideways wobble, rotation or synthetic mouth. Reduced motion produces the exact neutral pose, and hidden/offscreen avatars pause.
- Learning travel keeps momentum through aligned queued destinations, brakes for corners and final stops, and eases swimmer pitch. It preserves legal destinations and arrival callbacks. Reduced motion completes valid arrivals without spatial tweening.
- SVG subscriptions update actor poses, parcel hit targets and rover wheels without rendering the entire activity every animation frame. Horse completion still waits for arrival.

The existing Disney-inspired identities, authored artwork, Studio presentation and story mode remain the visual baseline. These are volumetric raster characters: six-pose locomotion cycles and eight-pose acting sheets, not continuous skeletal 3D animation. Improved timing and grounding cannot create intermediate joint articulation absent from the artwork. Personal single-image avatars retain their image; no replacement artwork was generated.

## Verification and native review

At the motion implementation checkpoint, the full engine suite passed **82 tests** and the web suite passed **239 tests**. Subsequent focused renderer/motion verification passed **27 tests**, including 120 Hz, slow-motion and suspended-tab regressions. Acting tests passed **6 tests**. Applicable typechecks, scoped ESLint and formatting checks passed.

The first native Safari review at 1368 × 788 found that adventure controls and feedback could shrink the Lion trail SVG to an unusable sliver. The bounded `learn.css` fix gives both the canvas track and SVG a deterministic **280 px desktop** and **340 px phone** height; the story container scrolls vertically when its controls require more space. A minimum-height-only version exposed an intrinsic SVG sizing cycle and was replaced before final acceptance. The original artwork, HUD and activity logic are retained.

The rebuilt app was confirmed in native Safari at desktop size and 390 × 844: the complete Lion playfield is visible, all four controls are reachable through the internal story scroll, and one Right action moves the lion one legal cell and returns to rest. No chapter was completed during this check. The final full web suite passed **286 tests across 34 files**, including three personal-avatar presence regressions. Whole-project runtime acceptance is documented separately in `family-schools-integration.md` and `school-runtime-acceptance.md`.
