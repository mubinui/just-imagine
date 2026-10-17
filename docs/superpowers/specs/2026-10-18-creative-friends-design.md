# Creative friends: Mishti's pictures and the friends' games — design

Date: 2026-10-18. Status: decisions recorded with the product owner; ready for an implementation plan.

## Intent

A child speaks an idea and one of six Studio friends turns it into something worth keeping. Today every friend produces the same kind of output, a generated world or game, and the games are often thin: something to tap with no character, no story and nothing learned. The product owner wants each friend to own a distinct, high-quality kind of creation, and every game to be fun and teach one thing through play. The world builder is `gemini-4-argon`, a highly capable model, so the bar is polished output, not a technically valid one.

## Decisions (made by the product owner on 2026-10-18)

1. **Mishti, the World artist, makes pictures, not games.** Three kinds of output:
   - a still picture of the child's idea;
   - a **living picture**: a 2–4 second loop built from a small set of consistent frames, made by default because it is fast and cheap;
   - an optional **movie**: a short real video clip, made only when the child asks to "make it a movie". This adds one Vertex AI video model to the approved model list.
2. **The other five friends each own one game family**, each with its own proven template and quality checks:
   - Bhombol (Inventor & builder): build-and-play adventures;
   - Pori (Physics explorer): physics playgrounds;
   - Chandni (Space explorer): space missions;
   - Onko Mama (Pattern & maths maker): maths puzzles;
   - Jadu Kaka (Wonder & experiment guide): experiment challenges.
3. **Every game has a hero, a story and one lesson**: a learning character the child moves with large on-screen buttons (left, right, jump, action) under real physics; a short three-step story; one clear concept learned by doing; a goal, a celebration and a replay.
4. **Quality gate: templates plus an automatic playtest.** `gemini-4-argon` designs the game inside its family's template rather than from a blank page. An automatic playtest checks that the game can be finished, the controls respond and the lesson actually happens. A failing game gets one repair; if that also fails, the child receives a polished ready-made version of their idea, never a broken game.
5. **World characters speak with a voice the builder chose for them**, always different from the friend's (implemented 2026-10-18).
6. **A build continues while the child does other things**: a small badge on the other child screens shows progress and opens the finished world (implemented 2026-10-18).

## Goals

- Each friend's creations feel distinct and recognisably theirs.
- A generated game is playable within one minute of the request, completable, and teaches its concept in a way a 6–10-year-old notices.
- Generated art matches the app's realistic-cartoon direction and is consistent across frames.
- Every child-visible image, frame and clip passes the existing child-safety image check (`gemini-3.8-flash`).

## Non-goals

- Free-form code generation. The Scene DSL and the sandboxed game script runtime remain the only way a game runs; no generated code runs outside them.
- Multiplayer, scores shared between children, or open-ended chat inside games.
- Long videos. A movie is a short clip, not a story told in video.

## Anti-goals (failure even if it technically works)

- A game with no character, no story or nothing learned.
- A game that cannot be finished, or controls that lag or do not respond.
- A picture whose frames do not match each other, or art that looks unlike the app.
- A child waiting on a spinner with nothing else to do (the badge exists for this).
- Any unsafe or frightening image reaching a child.

## Constraints

- All model calls go through Vertex AI in `us-central1` with Application Default Credentials (the game model may use the `global` location as today).
- Approved models: world builder `gemini-4-argon`; images `gemini-nano-banana-2.1` (hero, frames) and `gemini-3.1-flash-lite-image` (props); checks `gemini-3.8-flash`. The video model is new and must be added to the approved list in `CLAUDE.md` and the design spec's section 20 before it is used; the exact model ID is the builder's to confirm against current Vertex availability.
- No raw audio is stored; generated media is stored like world assets (Cloud Storage, owner-scoped).
- Changes to `packages/scene-schema` or `packages/protocol` need the other developer's review.

## How it works

### Mishti's pictures

1. The friend hears the idea and asks one short clarifying question only if the idea is empty.
2. `gemini-4-argon` writes a picture brief: subject, setting, mood, palette and, for a living picture, a 2–4 second action broken into 6–8 key frames.
3. `gemini-nano-banana-2.1` paints the first frame with the app's style references, then each following frame in the same multi-turn session with the previous frame as reference, so the character stays consistent.
4. Each frame passes the image check. A rejected frame is regenerated once; a second rejection ends the loop early on the last good frame.
5. The browser plays the frames as a smooth loop (cross-faded, timed by the brief) and can save it as an animated image.
6. "Make it a movie" sends the brief and the first frame to the video model as a short 16:9 clip; the first and last frames are checked. Movies are rate-limited per child per day.

### The friends' games

Each family template fixes what must be true and leaves the model the creative choices:

| Family | Template fixes | Model chooses |
| --- | --- | --- |
| Build-and-play (Bhombol) | a hero, a level with platforms, a contraption to assemble, a goal | setting, hero, parts, story beats, the concept (simple machines, balance) |
| Physics playground (Pori) | a hero, an object to launch or roll, a measurable outcome | ramp, forces, materials, the concept (gravity, friction, buoyancy) |
| Space mission (Chandni) | a hero ship, a route between bodies, fuel or time | destinations, hazards, the concept (orbits, distance, light) |
| Maths puzzle (Onko Mama) | a hero, collectibles with numbers or shapes, a target | theme, numbers, the concept (counting, fractions, patterns) |
| Experiment challenge (Jadu Kaka) | a hero, two choices to test, an observable result | the experiment, the concept (mixing, floating, magnets) |

Every template supplies the on-screen controls (left, right, jump, action as large buttons, plus keyboard), the three-step story frame (meet, try, discover), the celebration and replay. The model fills a structured gameplay plan, validated against the template, then writes the game script inside the existing Game API.

The automatic playtest drives the controls headlessly: it must reach the goal within a time budget, observe the lesson moment (the concept's state change), and stay within frame and memory budgets. Failure produces a diagnostic; the model gets one repair with that diagnostic; a second failure falls back to the family's polished ready-made game themed with the child's words.

## Phases

1. **Game families on templates** (no new model): templates for the five families, gameplay-plan schema per family, playtest checks for "finishable" and "lesson observed", fallback games.
2. **Mishti's still and living pictures** (no new model): picture brief, consistent frame painting, loop player, saving.
3. **Movies** (adds the video model): approval of the model ID, clip generation, safety checks, daily limit.

## Left to the builder

- The exact Vertex video model ID and its region availability.
- Frame counts and timings within the 2–4 second range.
- Per-family playtest thresholds, tuned on the evaluation set (`services/builder/src/evals`).
- Storage layout for frames and clips, following the existing asset pattern.
