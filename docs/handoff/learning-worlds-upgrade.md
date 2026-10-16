# Interactive learning worlds upgrade — 2026-10-16

## Research and authorized plan

The prior creative authorship slice is complete (real creation/edit/undo verified; see CHECKPOINT). This extension follows the user's explicit full-development instruction.

Existing: four packs (Space and three animal habitats), authored SVG cast, comes-closer transition, Gemini persona handoff, spoken quizzes, transactional points/progress and eight pet thresholds. Four map destinations are closed. Characters have no demonstrated learning activities or call-directed motion/outfits. Animal audio has CC0/public-domain provenance; listen verification is outstanding.

1. `packages/learning-content`: add Body, Food, Hygiene, Exercise packs, richer Space directory, bilingual facts/challenges and per-character interactive demonstrations. Keep answer keys server-side.
2. `apps/web/components/learn`, `app/learn.css`, public backdrops: open all islands, show demonstrable actions during play, character-specific motion and readable responsive stage; retain cream/forest identity and current cast language. No card-grid redesign.
3. Protocol/gateway: trusted activity context, requested challenges, in-character action tool and open-ended Gemini outfit generation while calls continue. Preserve authored identity/facts, moderation, atomic one-time points and pet rewards. Never claim a drawing is finished before completion.
4. Tests: content/reference integrity, hidden answers, activity event authorization, live-only tool validation and failed-generation preservation. Build and deploy local Docker app, then batched desktop/mobile inspection and real Gemini acceptance.

Risks: model latency/failure, stale call callbacks, microphone permission, rapid character changes, restart-safe account progress, no browser exposure of answer keys. Outfit images are session appearance until a durable wardrobe is added; do not claim saved wardrobes. Health content is educational, not diagnostic; character prompts never prescribe diets, supplements or exercise intensity.

## Progress

- [x] Research complete; existing user changes preserved.
- [x] Content and activity contracts
- [x] Complete 40-character cast, six stages and distinct playable interactions
- [x] Live motion, costume, explanation/challenge wiring
- [x] Source checks, local Docker run and credentialed Gemini rewards/pet acceptance
- [x] Final screenshot confirmation and independent craft review (ship at scoped raster-acting quality)

## Source review

Health/science checked 2026-10-16 against CDC clean-hands and child activity guidance, NHS children's teeth, NIH/NHLBI/NINDS/NIDDK organ primers, USDA MyPlate food-group guidance, NASA solar-system facts. Exact URLs and mapping will be retained in `docs/art/learning-content-sources.md`.

## User feedback incorporated — gameplay, not fact panels

The user explicitly rejected the first activity pass as insufficiently playable. Keep its bilingual content, voice tools and reward fixes, but replace the initial button-driven demonstrations with direct manipulation games. Six primary verbs: brushing plaque with a dragged brush, routing oxygen, positioning the Moon, delivering animals home, assembling a nutrient picnic, matching a demonstrated movement sequence. The main world stays visible while a call is pinned. Pip is moved into the Learn dock; no floating helper over its buttons. OpenAI Game Studio foundations/UI/playtest/sprite skills researched from their primary repository; exact installed paths and actual usage will be recorded at finish. Do not call CSS bobbing a finished animation system.

## Credentialed acceptance

Real spoken PCM “20” was recognized and handwashing awarded 3 points. Real asynchronous astronaut outfit, requested dance and pinned-call gameplay explanation succeeded in the prior live run. Saturn quiz added 4 points and Captain Heart correctly accepted “Blood” for 3 points, totaling 10; Tuktuk pet unlocked and GET progress confirmed both saved values. Temporary Lumi QA explorer deleted; Ari preserved. Evidence `/tmp/ji-learn-reward.log`, `/tmp/ji-learn-real.log`, `/tmp/ji-learn-points.log`. Final pet flow returned 410 real audio frames with zero page errors. The automated browser needed reduced-motion mode for map-island clicking (continuously bobbing targets never become stable for Playwright) and foreground audio flags for headless playback; neither is an application behavior exception.

Approved art now covers every authored learning character. Unmodified PNG acting sheets and optimized WebP derivatives ship in `apps/web/public/learn/cinematic/`; exact new cast prompts in `docs/art/learning-cast-prompts.json`, native dimensions and sizes in `docs/art/learning-assets.json`, background prompts embedded in PNGs/WebP sidecars. Built-in image generation used. Exercise sheet row boundaries were measured from empty alpha rows (349/687/935) to avoid adjacent-pose bleed. Sprite acting is not a skeletal/film animation claim.

## Finish

Final six-game browser confirmation, Studio short-desktop/phone clipping, mobile portrait scroll reset and Pip hit targets passed with zero page errors. Phone gallery/profile-picker shelf nonoverlap and real20-second wash hold/pause/resume also passed. Fresh Impeccable finish review: **ship** at this scoped raster-acting delivery; no material fixes, no suppressions. Documentation updated in DESIGN.md, design.json and Learn brief. Keep the warm palette and recorded animation/wardrobe/device-listening limits. Persistent emulators retained; final data export succeeded after QA cleanup. App remains at http://localhost:3300.
