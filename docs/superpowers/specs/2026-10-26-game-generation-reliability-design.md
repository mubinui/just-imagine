# Game generation: fast, best quality, never a failure screen

Date: 2026-10-26. Status: approved direction; plan follows.

## 1. Intent

A child asks for a game and, a few minutes later, plays a good one. Today the
build often never finishes on the live site, sometimes fails outright, and
takes longer than it needs to. This design makes three promises:

1. **Never a failure screen.** Every build ends in a playable world. When the
   model could not make the child's exact idea, the friend says so honestly and
   the child keeps editing by voice.
2. **Fast.** About two to three minutes with art, about ninety seconds without,
   on the same models.
3. **Best quality.** `gemini-4-argon` stays the script model. Quality is built
   into the prompts and the acceptance tests the way a children's game designer
   would insist on, rather than hoped for.

## 2. What we found (evidence)

Three timed local runs of the real `imagineGame` flow against live Gemini
(scratchpad `repro.mts`, `run1-3.log`), plus a read of the pipeline and the
infrastructure.

| Phase | Time | Notes |
|---|---|---|
| Scene (`pipeline.ts buildScene`) | 15–36 s | one repair round in run 2 |
| Review (fast model) | 4–5 s | |
| Plan (`game-model.ts plan`) | 10–22 s | plus ~2 s wasted: the first call with a JSON schema is rejected (400) every time, then falls back |
| Script (`gemini-4-argon`, medium thinking) | 14–69 s per call | the first script failed in all three runs |
| Game phase total | 91–161 s | |
| Art (`worker.ts`) | up to 180 s | starts only after the script passes |

Failure causes, verified in code:

- **A test no script can pass.** The planner wrote `speed ≤ 0.5` after a move as
  a triggered effect. The input-cause control (`game-playtest.ts
  runGameplayPlan`) replays without the input and demands the check fails; a
  body that never moved is also at rest, so it never fails. `validateGameplayPlan`
  accepts it, and the plan is fixed before the script loop, so both scripts
  were doomed. One of three runs.
- **The time budget.** Builder Cloud Run timeout 300 s (`infra/terraform/main.tf`)
  equals the Cloud Tasks dispatch deadline (`gateway/src/store.ts`). Game plus
  art needs 150–340 s. A timed-out request is retried after 5 s, hits the
  360 s world lock ("Another job is updating this world"), keeps retrying, and
  after the lock expires restarts the whole build, which times out again. The
  job never reaches `failed`; the child sees "Taking a little longer" forever.
  This is the likely reason the live site "fails every time".
- **Art fails the whole world.** `requireMotionArtwork` throws after the game
  already passed when any moving sprite lacks its animation sheet.
- **Art waits for nothing it needs.** Art depends only on the scene, but starts
  after plan and script.

Ruled out: output truncation (scripts are 3–5 KB, limit 20 KB); model location
and memory settings.

## 3. Goals, non-goals, anti-goals

Goals: zero failure screens; typical build under three minutes with art; the
child's own idea, cast and controls; honest companion speech; every fallback
visible in logs and alerts.

Non-goals: changing model IDs (`gemini-4-argon` stays for scene and script;
`gemini-3.8-flash` was considered and rejected because it would not fix the
impossible tests and would likely lower first-pass quality); changing the Game
API or the Scene DSL; splitting the build into separate game and art jobs (a
bigger change, deferred).

Anti-goals: silently replacing the child's idea with a stock game; publishing a
script that skipped the safety gate; hiding a failure as success in logs;
starting a model call that cannot finish inside the budget.

## 4. Constraints

- Every model call through Vertex AI with ADC; no keys in the browser.
- Generated scripts run only in the game-runtime sandbox after the static
  check, smoke run and moderation (`imagine-game.ts gateScript`). Templates go
  through the same gate; nothing is published unchecked.
- `packages/protocol` changes need the other developer's review.
- Terraform changes are applied by the project owner, not by the builder of
  this work.
- Tests first; the new orchestration must be testable with fake generators and
  fake clocks, no live model in unit tests.

## 5. Decisions (made by the project owner)

| Decision | Choice | Alternatives considered |
|---|---|---|
| Time budget | Raise builder timeout and dispatch deadline to 900 s; one hard deadline inside the pipeline | Split game and art into two jobs; keep 300 s and trim attempts |
| Speed without losing quality | Keep `gemini-4-argon`; write two scripts at once, first valid wins | `gemini-3.8-flash` first with argon fallback; stay sequential |
| Last resort | A designed template game around the child's cast and scene, with honest companion speech | Scene without a game; friendly retry screen |
| Hero when the child names nobody | The friend holding the mic becomes the playable hero | Let the scene model choose; ask the child first |
| Quality | A children's game designer brief in the planner and script prompts and in the templates | Rely on validation alone |

These change one rule from the original spec: "never substitute a plain
scene" becomes "never *silently* substitute". The template only runs after the
model attempts fail, keeps the child's cast, scene and requested control, and
the friend says what happened.

## 6. Design

### 6.1 Impossible tests cannot be written

Checks of the kinds the validator already treats as invariants (`speed`,
`exists: true`, `command min 0`, `near invariant`) describe how an effect ends
or that nothing bad happened; they cannot prove an input caused anything.

- `validateGameplayPlan`: a triggered `speed` check no longer counts as the
  scenario's measurable change on its own; it must share its trigger with a
  `near`, `displacement`, `exists: false` or `command min > 0` check on the
  same scenario. A scenario whose only triggered checks are at-rest checks is
  rejected with a new rule name (`REST_ONLY_EFFECT`) so the planner's retry
  feedback names it.
- `runGameplayPlan`: triggered `speed` checks are required in the full journey
  and excluded from the input-prefix control.
- Safety net: a check that fails the causal control in every candidate of a
  round was wrong in the plan, not the script. It is dropped for the next round
  and logged (`plan_check_dropped`). The round-two prompt tells the programmer
  which check was dropped and why.

### 6.2 The designer brief

One shared text block, used by the planner prompt, the script prompt and the
templates:

1. Toy first, game second: the first ten seconds are fun with no instructions.
2. One verb; two at most.
3. Every input gets a visible and audible answer within a second.
4. First success within fifteen seconds for a clumsy finger; the first goal is
   nearly impossible to miss; difficulty grows slowly.
5. Gentle losing: no game over; a miss is a friendly nudge and an instant
   retry; a win celebrates and keeps the world alive unless a finite challenge
   was requested.
6. The goal in child words on the HUD with a small count (3, 5, 10), mirroring
   the child's own nouns.
7. Big targets: interactive bodies at least 0.6 m on their smaller side, the
   hero at least 0.9 m. Goes into `GAME_SCENE_HINT`; the review checks it.
8. The child's idea stays theirs: their cast, their words.

A soft feedback rule: every `tap`, `drag` or `flick` handler must reach at
least one of `sound`, `say`, `celebrate`, `impulse`, `move`, `spawn`, `remove`
or `score`. Checked by a static scan in the builder; a miss is added to retry
feedback when a retry happens anyway, never a rejection on its own.

### 6.3 The exam in the prompt

The script prompt states the actual pre-publication tests: a ten-second smoke
run in which a test child taps every tappable body in turn, changes one dial
and flicks the hero, after which a goal game must have scored or won; then the
plan's journeys with their exact inputs; then the same journeys with the
inputs removed, where every triggered effect must *not* happen. Today the model
is told none of the first part, which is the likely cause of the `SCRIPT_NO_GOAL`
first attempt in run 1.

The two closest of the eight finished example games (`game-examples.ts`,
currently unused by the prompts) are included as complete worked examples,
chosen by word overlap between the wish and each example's wish. Retry feedback
carries the measured numbers already captured in `PLAYTEST_CHECK` diagnostics
(expected versus actual).

### 6.4 The hero rule

- The hero is the character the child named as doing the action. The review
  step rejects a scene whose `learning.heroEntityId` is a static body, the
  ground, or an actor the child did not name when they named one.
- When the child names no character, the friend holding the mic becomes the
  hero. When a guide (Pori Apu, Onko Mama, Jadu Kaka) holds the mic, the
  child's own profile companion is used, else the default companion
  (`DEFAULT_CHARACTER`, Bhombol), so every build job carries a companion and
  the deterministic patch below is always possible. The gateway adds
  `companionId` (`CompanionIdSchema`, optional only for jobs queued before it
  existed) to `BuildWorldJob` (`packages/protocol/src/jobs.ts`; other
  developer reviews).
  The scene prompt receives that companion's `look`; the scene includes a
  sprite entity with id equal to the companion id, that description, tags
  `['hero', <companionId>]`, and **no** `character` metadata (its voice is the
  companion's own Live session, outside the world).
- If the review still finds no acceptable hero after the scene's repair
  rounds, the builder inserts the companion hero entity itself with a
  deterministic patch (near the ground at x = 3, 1.0 × 1.0 m, the scene's
  default dynamic material) and continues. A missing hero never fails a build.
- The hero gets its sprite and run cycle first (existing ordering), and the
  one-verb control acts on it.

### 6.5 Nothing waits that does not need to

- Art starts the moment the scene passes review, in parallel with plan and
  script. Asset generation already depends only on the job and the entity
  descriptions (`worker.ts asset`), not on the published world. Results are
  held in memory and merged into the world document; the first publish
  (`status: building`) happens when the script passes, already carrying any
  art that finished, and later publishes add the rest, exactly as today.
- The plan runs alongside the review. If the review rejects the scene, the
  plan is discarded (about 5 s saved per build, at most one wasted plan call
  when the review fails, which is rare).
- The planner's schema call goes. The contract-in-prompt form that always
  works today becomes the first and only form, unless a unit test proves the
  schema is accepted.

### 6.6 Two scripts at once

A round sends two independent script requests at the same time. Each candidate
is validated as it arrives (static, smoke, moderation, plan journeys, causal
control). The first that passes wins; the other request is aborted through its
`AbortSignal`. If both fail, one second round runs with feedback built from
the better failure (fewest failed checks, then latest failing check time) and
any dropped plan check (6.1). No third round; after that, the template (6.8).

Cost: about twice the script tokens per build. Rate limits: `withBackoff`
stays; a 429 on one candidate does not cancel the other. If both candidates
of a round fail rate-limited, the next round sends one candidate. The count is
configurable per deployment (`GAME_CANDIDATES`, default 2). Up to 3 builder
instances × 4 jobs × 2 candidates is 24 simultaneous `gemini-4-argon` calls;
the owner checks the project's quota against that before deploying.

### 6.7 One budget

- Infrastructure (owner applies): builder Cloud Run `timeout = "900s"`;
  Cloud Tasks `dispatchDeadline` 900 s; world lock 960 s so a retry after a
  crash waits at most a minute.
- Inside the job, `start` is read once. Hard deadline `H = start + 780 s`.
  Rules: a model call may start only if `now + its timeout ≤ H`; when a round
  cannot start, the pipeline moves to the next fallback step immediately
  rather than waiting. Art stops at the earlier of `H` and 180 s after it
  started. Everything is published `ready` by `H` plus the final publish.
- The same budget object is passed to the scene, plan, script and art phases
  so tests can drive it with a fake clock.
- `SLOW_BUILD_MS` (web, 4 min) stays; "Taking a little longer" is still
  accurate.

### 6.8 Never a failure screen: the fallback ladder

| When | What happens | Child-facing |
|---|---|---|
| Planner unavailable or invalid twice | Scripts are written without a plan; the gate is static, smoke, moderation. Logged `game_plan_skipped`. | Nothing said; it is still their game |
| Both rounds of scripts fail, or no round fits the budget | Template game (6.9) around the child's cast and scene, through the same gate | Friend: "I made a simpler version of your game. Tell me what to change." |
| A moving sprite's animation sheet is missing after one repair attempt within the art deadline | `locomotion` is removed from that entity; the world is published `ready`. Logged `art_locomotion_dropped`. | Nothing said; the sprite slides instead of running |
| Scene invalid after three repair rounds | Nearest sample world of the same tier (`fallback.ts nearestConceptFixture`), then the template game on it | Friend: existing "could not be painted" line |
| Anything else thrown | Caught at the top of the build; the same ladder applies from the furthest point reached; the job never ends `failed` for a reason the ladder covers | |

Honesty is carried by job status `fallback` (already read by the gateway) plus
a new `fallbackReason` (`template` or `sample`) so the gateway chooses the
right line. Today the gateway sends the browser `worldJob status: failed` for a
`fallback` job, and the Studio then shows "Your world could not finish"; that
message is no longer sent for `fallback` (the world's `ready` status reaches
the browser through Firestore as it does today), so no web or WebSocket
protocol change is needed. The gateway change deploys before the builder
starts writing `fallback`. The world's `creation` note records the same so later edits know
the game is a template. The patch flow is unchanged: a voice edit regenerates
the behaviour; if that fails, `guardPatchedGame` keeps the current world.

### 6.9 Templates

Two hand-written Game API scripts, parameterised only by entity ids, tags,
names and the job language, each written to the designer brief:

- **Collect**: the hero hops toward where the child taps along the ground;
  touching a target counts, with sound and a sparkle; the HUD says "Catch 5
  <targets>!" in child words; at the goal, celebrate and keep playing. Used
  when the wish or plan intent implies catching, collecting or reaching and
  the scene has at least one non-hero dynamic body to use as targets.
- **Tap toy**: tapping any body makes it hop with a sound; dragging moves it;
  collisions pop; the hero greets the first tap; in `game` mode, every tenth
  tap on a non-hero body celebrates and scores so the goal rule holds. Used
  otherwise. It passes the smoke run on any scene with one tappable body.

Child-facing strings are fixed, in English and Bangla, and pass moderation.
Unit tests run both templates through `gateScript` on every fixture world and
on the two recorded scenes in `services/builder/test/recordings/`, so a
template that cannot pass is caught in CI, not at run time. At run time the template still goes through the gate; if even the
template fails on a strange scene, the tap toy runs in `freeplay` mode as the
floor.

### 6.10 Observability

New log events, all with `jobId` and `worldId`: `game_round` (round, candidates,
ms), `game_candidate` (won, failed with code, or cancelled, ms),
`plan_check_dropped`, `game_plan_skipped`, `game_fallback` (reason),
`art_locomotion_dropped`, `build_deadline_hit` (phase). Terraform adds a
log-based alert on `game_fallback` and `build_deadline_hit` so a new failure
cause is seen the first time it happens. Existing events keep their names.

## 7. Expected results

Typical build: scene 20 s, review and plan together 20 s, script round 15–40 s
(the faster of two), so the game exists at about 60–80 s; art from about 25 s
for at most 180 s. Ready at roughly 120–200 s with art, about 80 s without.
Worst case still ends in a playable world by 13 minutes, and the alert fires.

## 8. Left to the builder

The exact candidate-cancellation mechanics; the word-overlap scoring for the
two examples; the deterministic hero patch's exact placement; the shape of the
budget object; the template scripts' exact wording within the brief; the
alert thresholds; the order of pull requests. Suggested order: 6.1 and 6.3
(cheap, biggest first-pass gain), 6.7 and the art fixes (unblocks production),
6.5 and 6.6 (speed), 6.4 (protocol change, needs review), 6.8 and 6.9
(fallback ladder and templates), 6.10 throughout.

## 9. Risks

- Twice the script cost per build. Accepted.
- The sprite model may draw the companion hero slightly differently from the
  mascot art. Accepted for now; a mascot reference image is a later step.
- The `fallback` status today means "sample world" in the gateway's wording;
  `fallbackReason` must land in the gateway before the builder starts using it
  for templates.
- Live logs were not available; a cause not seen locally may remain. The
  catch-all rung and the alert exist for that.

## 10. Verification

- Unit tests (fake generators, fake clock): rest-only plans rejected; speed
  excluded from the causal control; dropped-check round two; two candidates
  racing with the loser cancelled; art merged from the parallel phase; every
  budget rule; each rung of the ladder; templates pass the gate on all fixtures;
  the hero rule including the deterministic patch.
- Local soak before merge: ten varied wishes through the real `imagineGame`
  with a stubbed art phase, zero failures, median game phase under 90 s,
  every fallback logged with a reason.
- After deploy: five live builds with timings from the new events; the alert
  policy exists and has fired once in a forced test.
