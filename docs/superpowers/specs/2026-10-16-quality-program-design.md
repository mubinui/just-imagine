# Just Imagine Quality Program: Design Specification

| | |
|---|---|
| Status | Draft for review, 2026-10-16 |
| Supersedes | Sections 3, 6, 7, 9 and 12 of the 2026-10-15 design spec where they overlap; everything else in that spec stands |
| Window | Five weeks, 2026-10-20 to 2026-11-24, then a submission week |
| Team | Dev A (experience), Dev B (platform and AI), two AI implementers (Claude Code, Codex) working under these plans |

## 1. Purpose and the bar

The first build proved the architecture: contracts, engine, gateway, builder, api and infrastructure exist and pass their tests. It does not yet feel like a product a child would choose over a mobile game. Worlds render as placeholder rectangles, there is no sound, generation shows a spinner and a sentence, the characters have never spoken through Vertex AI, the vocabulary of worlds is narrow, there is one language, and nothing has been soaked on a real tablet.

This program sets a measurable bar and the work to reach it.

| Quality bar | Measure | Target |
|---|---|---|
| Painted worlds | Share of worlds where every entity and the backdrop show painted art, never placeholder geometry | 100 percent in the demo library, 95 percent of live wishes |
| Fast first paint | Time from wish to a painted, playable world | p50 under 3 s (library compose), hero sprite under 10 s |
| Generation is a show | A choreographed, narrated sequence runs for the whole wait, never a static spinner | Every build |
| Game feel | Every tap, drag, flick, collision, dial and spell has motion and sound feedback | 100 percent of interactions |
| Frame rate | On a 2021 iPad with 24 entities, particles and parallax | p5 of frames at 60 fps, never under 45 |
| Voice | Child stops speaking to first character audio, through Vertex AI | p50 under 1.2 s, p95 under 2.0 s |
| Freedom | A new game concept from a child's own words, not a template | Generated game scripts: 95 percent pass the static check and smoke run first time; the eight hand-built kinds remain as fallbacks and examples |
| Language | Bangla and English, selectable per child, with voice, captions and every screen | Parity for all child-facing text |
| Stability | Twenty-minute soak sessions on each target device | Zero crashes, zero stuck states, reconnect within 5 s |
| Crash-free sessions | Measured in production telemetry | 99.5 percent |

## 2. Art pipeline: hybrid library plus live hero

**Decision.** A curated painted library produced once and composed in under three seconds, with live generation reserved for the one novel hero sprite a wish needs. This gives consistent Disney-inspired style, instant first paint, low cost, and a predictable demo.

**Library contents (about 300 assets).** Six themes: meadow, pond, sky and clouds, moon and space, science lab, cosy room. Per theme: three backdrop depth layers (far, mid, near ground) at 2048 by 1152; 8 to 12 props (rocks, logs, mushrooms, boxes, ramps, planks, cups, pegs, lily pads, stars); 4 to 6 creatures with two-frame idle and move flipbooks (duck, frog, fox, bird, fish, robot); 3 vehicles (cart, rocket, boat) with separate wheel parts; effect sheets (dust puff, splash, sparkle burst, confetti, smoke, bubbles, rain, snow). Every asset carries metadata: id, theme, tags, world size in meters, anchor, collider polygon, material hint, flipbook frames.

**Production.** Generated offline with `gemini-3-pro-image` from a style bible and a fixed set of reference images (the six characters and the brand mark) for consistency, on magenta for sprites, post-processed by the existing builder pipeline (chroma key, despeckle, trim, collider tracing), packed into atlases with a manifest, and QA'd by a human against a checklist (style match, clean alpha, readable silhouette at 64 px, collider fit). Rejected assets are regenerated with a stronger prompt. The library ships to Cloud Storage behind the CDN; a 40-asset subset is bundled for the offline preview.

**Composition.** The builder receives the library catalogue (ids, tags, sizes) in its prompt and selects assets by id, choosing a theme, three backdrop layers, props, creatures and the hero. The Scene DSL gains `asset.libraryId` so the engine loads from the atlas immediately. If the wish names something the library lacks, the builder marks the hero `generate: true`; the engine shows the nearest library stand-in with a shimmer until the live sprite arrives and swaps it in with a pop.

**Live hero.** `gemini-nano-banana-2.1` as today, with the style bible and two reference assets from the chosen theme as image references, so the live sprite matches the library's look.

## 3. World rendering: the painted stage

Additions to the engine renderer, all driven by the document and the library manifest:

- **Depth.** Three parallax layers behind the entities, offset by a slow pointer or tilt parallax and by hero position; near-ground layer in front of the ground line.
- **Life.** Ambient loops per theme: clouds drift, water shimmers through a cheap displacement shader, grass sways, stars twinkle, dust motes in the lab. Creatures play their two-frame flipbooks when moving.
- **Light.** A time-of-day tint over the whole scene and a soft rim highlight on dynamic bodies, keyed to `theme.timeOfDay`.
- **Juice.** Squash-and-stretch on landing, impact rings and dust puffs scaled by impulse, splash sheets on water entry, a short trail on the hero while flying, hero glow when held, confetti and chimes on discoveries, gentle camera shake on hard impacts, spell bursts.
- **Weather.** Rain and snow particle fields as optional environment fields.
- **Budget.** A particle budget and a quality tier that drops to lighter effects when the frame rate dips, so the frame-rate bar holds on the 2021 iPad.

## 4. Sound and haptics

A sound design pack of about forty authored cues (boing, splat, splash, whoosh, ding, pop, magic chime, tick, UI taps, confetti) plus one music bed per theme generated with `lyria-3-clip-preview` offline and looped. Cues map to DSL `sound` actions and to engine events (impact, water entry, spawn, dial, spell). Music ducks under character speech and mutes under reduced-motion or a parent setting. Haptic taps on Android through the Vibration API on tap, launch and impact.

## 5. Generation as a show

The wait becomes the character's performance, bound to builder milestones:

1. **Wish heard (0 s).** The friend pulls out a brush; the status chip reads "Painting".
2. **Backdrop (library, under 1 s).** The three layers paint in with a brush-stroke wipe mask, far to near, over two seconds.
3. **Props and creatures (under 3 s).** Silhouettes drop in with sparkle and settle with a squash.
4. **Hero.** A shimmering library stand-in appears; the friend talks about it; when the live sprite arrives it pops in with a chime.
5. **Reveal.** The friend says the narration intro, confetti bursts, the dial tray slides up.

If a milestone is late the sequence loops its ambient beat and the friend asks a question; after 25 seconds the friend apologises and offers a library world. There is never a static spinner.

## 6. Freedom: more kinds of play

Additive DSL and engine work so the same loop covers eight kinds of play.

**Draw-your-own shapes.** A draw mode in the Studio: the child draws with a finger; the stroke becomes a rigid body (simplified polygon, chosen material from three pills: wood, stone, rubber), tagged `drawn`. An eraser removes it. Rules can reference the `drawn` tag; the builder can set up worlds that invite drawing ("draw a bridge for the duck").

**Games are generated, not templated.** The first design chose a closed vocabulary so that nothing executable ever came from a model. That kept worlds safe and testable but made every "game" a recombination of mechanics we hand-coded, which is why they feel basic and why a new concept cannot be made. This programme adds a second, sandboxed layer: Gemini writes the game's rules as a small program against a typed Game API, and the painted engine renders it. Scenes, assets and physics stay declarative; mechanics come from the script. What becomes possible: "a frog that must catch ten flies before the owl wakes up", "stack blocks taller than the giraffe while the wind grows each level", "race the snail across the pond where rain makes the lily pads slippery", "land the rocket softly on the Moon, too fast and it bounces away". The child changes the game by talking ("make the flies faster"), which rewrites the script through the patch flow.

**The Game API** (version 1, TypeScript declarations shipped to the model as the contract): `game.spawn(templateOrLibraryId, { x, y, tags, material })`, `game.remove(idOrTag)`, `game.find(tag)` returning positions and velocities, `game.on('tick' | 'collision' | 'tap' | 'drag' | 'flick' | 'dial' | 'variable' | 'timer', handler)`, `game.every(seconds, handler)` and `game.after(seconds, handler)`, `game.impulse(id, vector)`, `game.setGravity`, `game.setWind`, `game.setMaterial`, `game.score(delta)`, `game.lives(delta)`, `game.level(n)`, `game.win()`, `game.lose()`, `game.hud({ score, lives, timer, label })`, `game.say(text)`, `game.ask(question, options)` returning a promise of the chosen index, `game.sound(cue)`, `game.celebrate(style)`, `game.random()` (seeded). The HUD (score pill, lives, timer, level banner, win and lose sheets) is part of the Studio chrome.

**Sandbox.** The script runs in a Web Worker created from a blob, after a shim deletes network, storage and messaging globals (`fetch`, `XMLHttpRequest`, `WebSocket`, `importScripts`, `indexedDB`, `caches`, direct `postMessage`). Before it ever runs, a static check parses the source with an ECMAScript parser and rejects imports, `eval`, `Function`, `with`, property access on the global object, and any identifier outside the API and plain JavaScript. Budgets are enforced by a watchdog: a tick handler over 8 ms or more than 50 ms of script time per second terminates the worker and the Studio shows a friendly "the game got tangled" state with a retry; at most 200 spawned bodies and 50 timers. Physics never runs in the worker; the engine streams events and body states at 20 Hz over a message channel and applies commands through its existing API, so the script cannot bypass the validator or the material table.

**Smoke run before the child sees it.** The builder runs every generated script headlessly for ten simulated seconds in a Node worker with the same shim and the headless engine, driving scripted inputs (a tap on each tappable entity, one dial change, one flick), and requires: no exception, no budget breach, a reachable `win` or `score` call found by the static scan, and every `say`, `ask` and `hud` string passing the moderation classifier in the child's language. A failing script goes back to the model once with the error; a second failure falls back to a declarative world and the friend says so.

**Document and flow.** `SceneDoc.game.script` holds `{ apiVersion: 1, source, hash }` beside the declarative scene; patches rewrite the script. The builder's `imagineGame` flow decides playground or game from the wish, composes the scene from the library, generates the script with the Game API declarations and eight few-shot programmes in the prompt, runs the static check and smoke run, then publishes. Script generation adds six to eight seconds on `gemini-4-argon`; the generation show covers it with the beat "writing the rules". A sixty-wish game eval set targets 95 percent of scripts passing the static check and smoke run on the first try, and a red-team set of twenty escape attempts (network, storage, DOM, infinite loops, huge spawns) must all be blocked.

**Creatures and vehicles.** Behaviors `follow`, `flee`, `patrol`, `swim`, `fly`; a `wheel` joint with a motor for carts and cars; flipbook animation from the library.

**Builder v2.** Prompts know the eight kinds, pick one from the wish, and can propose a remix. A "surprise me" wish picks a kind and theme at random. Few-shot examples for every kind; the eval set grows to 100 wishes covering all kinds and both languages.

## 6b. Learning Worlds: fixed sections with characters you can call

Alongside imagined worlds, a Learning Map offers fixed, authored sections. Each is a painted world on the same stage where the things themselves are characters with a Gemini voice: a planet, a tooth, the stomach, a lion. The child taps a character, it comes close and introduces itself in a funny voice, the child asks it anything, and the child can "call" it on a toy phone. Learning happens while playing: every section explains its ideas in the moment of interaction, not in a lesson.

**Sections (all six are built; order for the demo: Space, Animals, then Human Body, Food and Nutrition, Hygiene, Exercise).**

- **Space.** The Sun and the planets as characters with personalities (Mercury is in a hurry, Venus is vain about her clouds, Mars is a red-dust adventurer, Jupiter is the big show-off, Saturn is proud of her rings). Tap a planet: it swoops close, says its facts in character, answers questions, and offers a challenge ("How many moons do I have? More than you, I bet!"). A "call Saturn" button rings a toy phone and connects.
- **Animals.** Farm, jungle and ocean scenes. Tap an animal: it makes its real sound (licensed CC0 recordings with provenance), then talks in its Gemini voice about what it eats, where it lives, and one surprising thing. Challenges ask the child to find the animal that matches a clue.
- **Human Body.** Body parts introduce themselves and why they matter: the heart that never takes a break, the lungs that are balloons, the stomach that is a mixing bowl, the brain that is the boss, bones, skin, eyes, ears and teeth. Challenges: "Which part helps you hear me right now?"
- **Food and Nutrition.** A plate the child builds; foods explain their vitamins and minerals in character (the carrot and Vitamin A for eyes, milk and calcium for bones, the orange and Vitamin C). Challenges reward a balanced plate.
- **Hygiene.** Brushing teeth with a two-minute brushing game guided by the Tooth characters, handwashing with the twenty-second song, bath time; the Germ characters flee when done right.
- **Exercise.** A coach character leads short move-along challenges ("jump ten times, I will count!"), with the stage characters cheering; counts are voice-confirmed by the child.

**How a section works.** A section is a World Pack: an authored scene in the Scene DSL (library assets, painted), a list of pack characters (name, look, voice, personality, a facts sheet, and the language variants), hotspots mapping entities to characters, sounds (animal calls), and challenges (question, answer key with accepted variations, hint, points, pet reward). Packs are content, versioned in the repo, QA'd like library assets, and authored in both languages.

**Characters you can call.** Tapping a hotspot or pressing "Call" hands the voice session to the pack character the way a guide is summoned: the gateway builds the system instruction from the pack's persona and facts sheet (trusted authored content), pins the child's language, and the stage plays the "comes closer" moment (the character portrait grows to centre, the world dims, a toy-phone ring for calls). Companions and guides stay in the strip; "hang up" returns to the friend.

**Challenges, points and pets.** The character asks a challenge by a tool (`ask_quiz`) that carries the answer key only server-side; the child answers by voice; the character judges with the key and calls `award_points` (validated by the gateway against the challenge's maximum) or gives the hint once. Points accumulate on the child profile; thresholds unlock eight collectible pets with authored art and sounds. An unlocked pet sits in the cast strip, follows the hero in imagined worlds, reacts to discoveries, and can be chosen as the child's companion. Pets do not speak, so they cost nothing per session. The parent dashboard shows points, pets and sections explored.

**Learning while playing.** In imagined worlds, the Discovery Card loop already explains physics at the moment it happens; Learning Worlds extend that: every interaction has an in-character explanation line, and the pacing engine's attention beats become questions from the characters.

## 7. Voice that feels alive

- **First real sessions.** The staging project runs `gemini-3.8-live` through Vertex AI in week one of this program; every later item is tuned against real latency.
- **Personas.** Each of the six characters gets a rewritten persona with example turns, a signature opening, three question styles and two ways to celebrate; Pori Apu, Onko Mama and Jadu Kaka get lab and magic vocabularies.
- **Listening.** Short confirmations of what the child said before building; one clarifying question at most; silence handling that invites rather than nags.
- **Memory.** The system instruction carries the child's last three worlds and discoveries, so the friend remembers.
- **Interruption.** Barge-in measured and tuned; the mic ring and lip-sync reflect it.
- **Language.** The child's language is pinned in the system instruction; input and output transcription run in that language; voice names are chosen per language from a listening test.
- **Reaction clips.** Side-character clips regenerated with `gemini-3.8-flash-tts` in both languages.

## 7a. Voice on demand and Studio controls

Voice is off until the child asks for it. Entering the Studio opens no Live session and shows no mic ring; the stage says "Tap a friend to start". Tapping any friend in the cast strip, or the "Ask <friend>" button, starts the session with that friend; the mic ring and "Listening" chip appear only then. "Stop" ends the session but keeps the world playable; "Finish playing" ends the session and leaves the Studio. "Build a game" asks the current friend to build a game (starting the session first if it is off); in the local preview it opens the nearest game fixture.

The four controls form one cluster at the strip's bottom-right, in reach of the friends and away from the exits: Ask (sunshine, mic icon, the primary action), Stop (clay #ad6524, square icon, shown only while voice is live and replacing Ask), Build a game (cream, spark icon), Finish playing (quiet outline). All 64 px, labels hidden on phones except Ask. The quota note and preview label move to the status chip.

## 8. Language: Bangla and English

- A `language` field on the child profile ('en' or 'bn'), set in parent Settings and in the profile picker, with English default.
- String tables `lib/i18n/en.ts` and `lib/i18n/bn.ts` for every child-facing and parent-facing string; a typed `t()` with the same keys in both; a CI check that the key sets match.
- Fonts: Baloo Da 2 for Bengali display and Noto Sans Bengali for body, self-hosted and subset; Latin stays Baloo 2 and Nunito. Bengali numerals in child UI; Latin digits in lab values with Bengali labels.
- Builder output (titles, narration, predictions, `say` lines, Discovery Card kid explanations) in the child's language; the concept bank bilingual; character names unchanged.
- Captions, the parent dashboard, emails and the marketing page in both languages; a language switch in the footer for the marketing page.

## 9. Stability

- **Device matrix.** iPad (2021 or newer, Safari), Android tablet (Chrome), laptop Chrome, iPhone and Android phones. A manual soak checklist per device: twenty minutes of play, three worlds, one handoff, one reconnect, one background-and-return.
- **Recovery.** React error boundaries with a friendly "hiccup" screen that keeps the voice session; the world document and session id persist in storage so a reload resumes; engine watchdog that recreates the renderer on WebGL context loss.
- **Telemetry.** A tiny client reporter sends errors and quality metrics (first paint, show duration, fps p5, audio underruns, reconnects) to Cloud Logging; dashboards and alerts extend the existing ones; a weekly quality review reads them.
- **Automated.** Playwright flows run with device emulation for all four classes; a fake-mode soak test runs twenty minutes in CI nightly; memory growth is asserted across world switches.

## 10. Team split and sequence

Five working weeks after this spec is approved. Each row is independently testable and demoable.

| Week | Dev A (experience) | Dev B (platform and AI) | AI implementers |
|---|---|---|---|
| 1 | Engine depth, light and juice; sound pack wiring; i18n scaffold with `bn.ts` and fonts | Staging project live; first real Live and image calls; style bible v2; library generation tool | Claude: generate and QA the library in batches; Codex: builder catalogue composition and `libraryId` |
| 2 | Generation show; draw mode; score and game UI | Builder v2 prompts for all eight kinds; game block in DSL and validator; Bangla prompt output | Claude: Studio design passes (impeccable) for show, draw, game; Codex: creatures, vehicles and wheel joints in the engine |
| 3 | Marble run parts tray; catapult and stacking templates in the Studio; Bangla UI parity | Voice personas, memory, barge-in tuning, Bangla voice; reaction clips in both languages | Claude: Bangla copy review with a native reader; Codex: eval set to 100 wishes, both languages |
| 4 | Stability: error boundaries, resume, watchdog, telemetry client; device soak round one | Telemetry pipeline, dashboards, alerts; load test; nightly soak in CI | Both: fix lists from the soak |
| 5 | Polish from the second soak; demo worlds across all kinds | Production deploy; second soak; runbooks | Both: submission video, README, docs |

## 11. Out of scope

Native apps; languages beyond Bangla and English; multiplayer; user-uploaded images in worlds (the companion photo feature stays as built); full Rive rigs for the six characters (the authored SVG cast stays, upgraded with flipbook mouths if time allows); 3D.

## 12. Risks

| Risk | Mitigation |
|---|---|
| Library QA takes longer than the generation | Batch by theme; meadow and pond first because the demo worlds use them; accept 60 percent of the library for week two |
| Bangla voice quality on `gemini-3.8-live` | Listening test in week one; fall back to Bangla captions over English speech for the demo if quality is poor, with the setting hidden |
| Frame rate on the 2021 iPad with full effects | Quality tiers from day one; measure every week |
| Draw mode physics (thin strokes tunnelling) | Minimum stroke thickness, convex decomposition, continuous collision detection on drawn bodies |
| Scope against five weeks | Game templates ship in order catapult, marble run, stacking, race; the last two can slip to after submission |

## 13. Decisions log

| Decision | Choice | Alternatives |
|---|---|---|
| Art pipeline | Hybrid library plus live hero | Fully generated per wish; library only |
| Play kinds this round | Draw, catapult and targets, marble runs and bridges, creatures and vehicles | Fewer kinds |
| Learning Worlds | Six fixed sections as World Packs with callable characters; Space and Animals first; real CC0 animal recordings; voice-judged challenges with an answer key; eight collectible pets as stage companions | Generated learning content; tap-to-answer quizzes; gallery-only pets |
| Game logic | Generated game scripts in a sandboxed worker, with static check, budgets and a headless smoke run | Richer declarative rules only; scripts without a smoke run |
| Bangla depth | UI, captions and voice, per child | UI and captions only |
| Devices | iPad 2021+, Android tablet, laptop Chrome, phones | Tablet only |
| Music | Offline loops from `lyria-3-clip-preview` per theme | Licensed library |
| Fonts | Baloo Da 2 and Noto Sans Bengali | Hind Siliguri |
