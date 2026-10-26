# Game Generation Reliability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every game build ends in a playable, honestly described world in about two to three minutes, on the same models, with quality built into the prompts and tests.

**Architecture:** The builder's `imagineGame` flow gains one time budget, two script candidates per round, a plan validator that cannot write impossible tests, art that starts as soon as the scene exists, and a fallback ladder ending in a hand-written template game that passes the same gate. The gateway adds the mic-holding companion to the build job and reads a fallback reason so the friend speaks honestly. Terraform raises the builder's limits and alerts on every fallback.

**Tech Stack:** TypeScript (strict, ESM), Zod 4, Vitest, `@google/genai` through Vertex AI, Rapier2D through `@just-imagine/game-runtime`, Firestore, Cloud Run, Cloud Tasks, Terraform.

**Spec:** `docs/superpowers/specs/2026-10-26-game-generation-reliability-design.md`

## Global Constraints

- Script model stays `gemini-4-argon` at `ThinkingLevel.MEDIUM`; no model ID changes; no Game API or Scene DSL changes.
- Every published script passes `gateScript` (static check, smoke run, moderation); templates included.
- Hard deadline inside a build: `start + 780000` ms; builder Cloud Run timeout `900s`; Cloud Tasks `dispatchDeadline` 900 s; world lock `960000` ms; art phase ends at the earlier of the hard deadline and 180000 ms after it starts.
- Two script candidates per round, at most two rounds, then the template.
- Child-facing template strings are fixed in English and Bangla exactly as written in Task 8; they pass `findBlockedTerm`.
- Changes to `packages/protocol` need the other developer's review (Task 1 is its own pull request).
- Commits are Conventional Commits ending in prose, no Claude attribution. Branch per pull request: `feat/game-reliability-<n>-<slug>`.
- Commands: `./node_modules/.bin/vitest run <file>` from the package directory (pnpm is not on PATH; `~/Library/pnpm/.tools/pnpm/10.34.7/bin/pnpm` if needed), `./node_modules/.bin/tsc --noEmit -p .`, `../../node_modules/.bin/eslint .`, `../../node_modules/.bin/prettier --check`.

## Review Focus

1. A scene with no dynamic, non-hero body (a lone hero on the ground): the collect template must not be chosen, the tap toy must still score in `game` mode. Test in Task 8.
2. A race where both candidates fail with transient 429s: the round counts as failed once, backoff still applies per candidate, and the budget, not the retry count, ends the build. Test in Task 6.
3. A `PLAYTEST_CAUSAL` failure on different checks in the two candidates: nothing is dropped from the plan. Test in Task 6.
4. The hard deadline arrives while art is still running after the game passed: the world is published `ready` with the assets that finished and `build_deadline_hit` is logged. Test in Task 9.
5. A patch (voice edit) whose behaviour fails validation: the template is never used; the previous world is kept exactly as today. Test in Task 6.

---

## Pull requests

| PR | Branch | Tasks |
|---|---|---|
| 1 | `feat/game-reliability-1-protocol` | 1 |
| 2 | `feat/game-reliability-2-builder-speed` | 2, 3, 4, 5, 6 |
| 3 | `feat/game-reliability-3-gateway` | 11 |
| 4 | `feat/game-reliability-4-builder-never-fail` | 7, 8, 9, 10 |
| 5 | `feat/game-reliability-5-infra` | 12 |
| none | local only | 13 (soak) |
| 6 | `feat/game-reliability-6-journey` | 14, 15 |

PR 2, 3 and 4 branch from PR 1's merge (or from its branch). PR 3 (gateway)
must be merged and deployed before PR 4, because PR 4 is the first code that
writes job status `fallback`, and today's gateway turns that into a failure
screen.

---

### Task 1: Protocol: companion on the build job, fallback on the creation note

**Files:**
- Modify: `packages/protocol/src/jobs.ts:17-36`
- Modify: `packages/protocol/src/firestore.ts:74-79`
- Test: `packages/protocol/test/jobs.test.ts` (create if absent; follow `packages/protocol/test/tutor.test.ts` style)

**Interfaces:**
- Produces: `BuildWorldJob.companionId?: 'mishti' | 'bhombol' | 'chandni'` (`CompanionIdSchema.optional()` from `./characters`); `Creation.fallback?: 'template' | 'sample'`.

- [ ] **Step 1: Write the failing tests**

```ts
it('accepts an optional companion on a build job and rejects a guide', () => {
  expect(BuildWorldJobSchema.safeParse({ ...build, companionId: 'mishti' }).success).toBe(true);
  expect(BuildWorldJobSchema.safeParse({ ...build, companionId: 'pori' }).success).toBe(false);
  expect(BuildWorldJobSchema.safeParse(build).success).toBe(true);
});
it('records how a creation fell back', () => {
  expect(CreationSchema.parse({ ...creation, fallback: 'template' }).fallback).toBe('template');
  expect(CreationSchema.safeParse({ ...creation, fallback: 'plain' }).success).toBe(false);
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `cd packages/protocol && ./node_modules/.bin/vitest run test/jobs.test.ts`
Expected: FAIL (unknown key `companionId` rejected by `.strict`/`refine`, or `fallback` stripped).

- [ ] **Step 3: Add the two optional fields**

`companionId: CompanionIdSchema.optional()` in `BuildWorldJobSchema` with a one-line comment: the friend holding the mic, who becomes the hero when the child names nobody. `fallback: z.enum(['template', 'sample']).optional()` in `CreationSchema`.

- [ ] **Step 4: Run tests, typecheck, lint**

Run: `./node_modules/.bin/vitest run && ./node_modules/.bin/tsc --noEmit -p . && ../../node_modules/.bin/eslint .`
Expected: all pass.

- [ ] **Step 5: Commit and open PR 1**

```bash
git commit -am "feat(protocol): companion on build jobs and a fallback reason on creations"
```

---

### Task 2: One time budget

**Files:**
- Create: `services/builder/src/budget.ts`
- Test: `services/builder/test/budget.test.ts`

**Interfaces:**
- Produces:
  ```ts
  export interface BuildBudget {
    readonly start: number;
    readonly hard: number;                 // start + hardMs
    canStart(callMs: number): boolean;     // now + callMs <= hard
    remainingMs(): number;                 // max(0, hard - now)
    deadlineFor(phaseMs: number): number;  // min(hard, now + phaseMs)
  }
  export const HARD_BUDGET_MS = 780000;
  export const ART_PHASE_MS = 180000;
  export function createBudget(options?: { now?: () => number; hardMs?: number }): BuildBudget;
  ```

- [ ] **Step 1: Write the failing tests**

```ts
it('allows a call only when it can finish before the hard deadline', () => {
  let t = 1000; const budget = createBudget({ now: () => t, hardMs: 100000 });
  expect(budget.canStart(90000)).toBe(true);
  t = 20000; expect(budget.canStart(90000)).toBe(false);
  expect(budget.remainingMs()).toBe(81000);
});
it('caps a phase deadline at the hard deadline', () => {
  let t = 0; const budget = createBudget({ now: () => t, hardMs: 780000 });
  expect(budget.deadlineFor(180000)).toBe(180000);
  t = 700000; expect(budget.deadlineFor(180000)).toBe(780000);
});
```

- [ ] **Step 2: Run to verify they fail** — `cd services/builder && ./node_modules/.bin/vitest run test/budget.test.ts` → FAIL, module missing.
- [ ] **Step 3: Implement `createBudget`** in `budget.ts` with the defaults `now = Date.now`, `hardMs = HARD_BUDGET_MS`.
- [ ] **Step 4: Run** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(builder): one time budget for a world build"`.

---

### Task 3: Impossible tests cannot be written

**Files:**
- Modify: `services/builder/src/game-playtest.ts:183-277` (`validateGameplayPlan`), `:487-514` (`runGameplayPlan` causal loop)
- Modify: `services/builder/src/game-diagnostics.ts:33-50` (add `'REST_ONLY_EFFECT'` to `planRule`)
- Test: `services/builder/test/game-playtest.test.ts` (`describe('bounded data-only plans')`)

**Interfaces:**
- Produces: `export function withoutCheck(plan: GameplayPlan, scenario: number, index: number): GameplayPlan` (pure; drops one check; if the scenario would have no checks left it is removed; if no scenarios remain, returns `plan` unchanged).
- `diagnoseGameplayPlanFailure` maps the message prefix `'A triggered at-rest check'` to `'REST_ONLY_EFFECT'`.

- [ ] **Step 1: Write the failing tests**

```ts
it('rejects a scenario whose only triggered effect is at rest, and names the rule', () => {
  const plan = { ...valid, scenarios: [{ name: 'stop', seconds: 4, inputs: [{ at: 0.5, type: 'tap', target: 'frog' }],
    checks: [{ at: 2.5, type: 'speed', trigger: 0, target: 'frog', max: 0.5 }] }] };
  expect(() => validateGameplayPlan(plan, doc)).toThrow(/A triggered at-rest check/);
  expect(diagnoseGameplayPlanFailure(catchError(() => validateGameplayPlan(plan, doc))).planRule).toBe('REST_ONLY_EFFECT');
});
it('accepts an at-rest check that shares its trigger with a displacement effect', () => {
  const checks = [{ at: 1.5, type: 'displacement', trigger: 0, target: 'frog', min: 0.5 },
                  { at: 2.5, type: 'speed', trigger: 0, target: 'frog', max: 0.5 }];
  expect(() => validateGameplayPlan({ ...valid, scenarios: [{ ...scenario, checks }] }, doc)).not.toThrow();
});
it('requires a triggered speed check in the full journey but not in the input-prefix control', async () => {
  // script: tap moves the frog right with an impulse that decays to rest by 2.5 s
  expect(await runGameplayPlan(doc, movesThenStops, planWithBoth)).toBeNull();
  expect(await runGameplayPlan(doc, neverStops, planWithBoth)).toMatch(/speed/);
});
it('drops one check and removes an emptied scenario', () => {
  const dropped = withoutCheck(planWithBoth, 0, 1);
  expect(dropped.scenarios[0]!.checks).toHaveLength(1);
  expect(withoutCheck(singleCheckPlan, 0, 0).scenarios).toHaveLength(0);
});
```

- [ ] **Step 2: Run to verify they fail** — `./node_modules/.bin/vitest run test/game-playtest.test.ts` → the first test fails (plan accepted), the third fails (causal control reports the speed check), the fourth fails (no export).
- [ ] **Step 3: Implement**
  - In the `for (const check of scenario.checks)` loop, a triggered `speed` check no longer sets `meaningful`; after the loop, if any triggered `speed` check has no sibling check with the same `trigger` of type `near`, `displacement`, `exists` with `value: false`, or `command` with `min > 0`, throw `new Error('A triggered at-rest check needs a sibling effect with the same trigger')`.
  - In `runGameplayPlan`, build `checks` for the control with `.filter((check) => check.type !== 'speed')`; skip the control entirely when that leaves none.
  - Add `withoutCheck`.
- [ ] **Step 4: Run the whole file** → PASS, including the existing journeys.
- [ ] **Step 5: Commit** — `git commit -m "fix(builder): at-rest checks can no longer make an acceptance plan impossible"`.

---

### Task 4: The designer brief, the exam, the closest examples, the feedback lint

**Files:**
- Create: `services/builder/src/designer-brief.ts`
- Modify: `services/builder/src/game-prompt.ts:8` (`GAME_PROMPT_VERSION = 'game-v3'`), `:11-12` (`GAME_SCENE_HINT`), `:46-79` (`gameScriptPrompt`), `:83-87` (`retryFeedback`)
- Modify: `services/builder/src/game-playtest.ts:279-298` (`gameplayPlanPrompt` adds the brief)
- Modify: `services/builder/src/creation-review.ts` (review prompt adds the hero and size rules)
- Test: `services/builder/test/designer-brief.test.ts`, existing prompt tests (`game-wishes.test.ts`, `game-quality-gate.test.ts`) updated where they pin prompt text

**Interfaces:**
- Produces:
  ```ts
  export const DESIGNER_BRIEF: string;            // the eight rules of spec 6.2, numbered
  export const SMOKE_EXAM: string;                // built from SCRIPTED_INPUTS (game-runtime)
  export function closestExamples(wish: string, count?: number): GameExample[]; // default 2
  export function feedbackLint(source: string): string[]; // one line per tap/drag/flick handler with no feedback call
  export const HERO_RULE: string;                 // review + scene hint text for spec 6.4
  export const TARGET_SIZE_RULE: string;          // "interactive bodies at least 0.6 m on their smaller side; the hero at least 0.9 m"
  ```
- `retryFeedback(reason: string, source: string | undefined, lint?: string[]): string` appends `lint` lines when present.

- [ ] **Step 1: Write the failing tests**

```ts
it('states the smoke exam with the runtime constants', () => {
  expect(SMOKE_EXAM).toContain(`from second ${SCRIPTED_INPUTS.tapStart}`);
  expect(SMOKE_EXAM).toContain(`every ${SCRIPTED_INPUTS.tapInterval} s`);
  expect(SMOKE_EXAM).toContain('game.score or game.win');
});
it('picks the two examples whose wishes share the most words with the child wish', () => {
  expect(closestExamples('a frog that must catch flies before the owl wakes').map((e) => e.name)[0]).toBe('catch-the-flies');
  expect(closestExamples('anything')).toHaveLength(2);
});
it('lists input handlers that give the child no feedback', () => {
  expect(feedbackLint(`game.on('tap', e => { count++; });`)).toHaveLength(1);
  expect(feedbackLint(`game.on('tap', e => { game.sound('pop'); });`)).toHaveLength(0);
  expect(feedbackLint(`game.on('drag', e => { game.move(e.target.id, {x:e.x,y:e.y}); });`)).toHaveLength(0);
});
it('puts the brief, the exam and two full examples in the script prompt, and the brief in the plan prompt', () => {
  const prompt = gameScriptPrompt({ ...input, description: 'catch flies' });
  expect(prompt).toContain(DESIGNER_BRIEF);
  expect(prompt).toContain(SMOKE_EXAM);
  expect(prompt).toContain(GAME_EXAMPLES[0]!.source);
  expect(gameplayPlanPrompt(doc, job)).toContain(DESIGNER_BRIEF);
  expect(GAME_SCENE_HINT).toContain('0.6');
});
```

- [ ] **Step 2: Run to verify they fail** — `./node_modules/.bin/vitest run test/designer-brief.test.ts` → FAIL, module missing.
- [ ] **Step 3: Implement `designer-brief.ts`**
  - `SMOKE_EXAM` exact text: `Before publication a test child plays your programme for 10 seconds: from second ${tapStart} it taps every tappable body in turn, one every ${tapInterval} s, at its centre; at second ${dialAt} it changes the first dial; at second ${flickAt} it flicks the hero with velocity {x:${flickVelocity.x}, y:${flickVelocity.y}}; it answers every question with the first option. A goal game must have called game.score or game.win by the end. Then your programme replays the acceptance plan's exact inputs, and replays each journey again with the inputs before each trigger removed; every triggered effect must NOT happen in that replay.`
  - `closestExamples`: lowercase, split on non-letters, keep words of 4+ letters, drop `{with, that, before, after, from, this, there, their, when, where, game, make, want}`; score each `GAME_EXAMPLES` entry by overlap with `wish` and `name`; stable sort descending; take `count`.
  - `feedbackLint`: parse with the parser `packages/game-runtime/src/static-check.ts` uses (if it is hand-rolled, do a brace-matched scan of each `game.on('tap'|'drag'|'flick', ...)` handler); a handler passes if its body calls `game.sound|say|celebrate|impulse|move|spawn|remove|score` or any user function.
- [ ] **Step 4: Wire the prompts**: `gameScriptPrompt` inserts `DESIGNER_BRIEF`, `SMOKE_EXAM`, and `Complete worked examples (data): ${JSON.stringify(closestExamples(input.description))}` after the API declarations; `gameplayPlanPrompt` inserts `DESIGNER_BRIEF` first; `GAME_SCENE_HINT` appends `HERO_RULE` and `TARGET_SIZE_RULE`; `creation-review.ts` appends both rules to its checklist.
- [ ] **Step 5: Run all builder unit tests** → PASS after updating any test that pinned the old prompt version or text.
- [ ] **Step 6: Commit** — `git commit -m "feat(builder): a children's game designer brief, the smoke exam and the closest examples in every game prompt"`.

---

### Task 5: Script model: cancellable calls, no doomed schema call

**Files:**
- Modify: `services/builder/src/game-model.ts:36-98`
- Modify: `services/builder/src/rate-limit.ts:14-43` (`withBackoff` gains `signal?: AbortSignal`)
- Modify: `services/builder/src/imagine-game.ts:25` (`GenerateScript`)
- Test: `services/builder/test/game-model.test.ts`, `services/builder/test/rate-limit.test.ts`

**Interfaces:**
- Produces: `export type GenerateScript = (prompt: string, sessionId?: string, signal?: AbortSignal) => Promise<unknown>`; `GameScriptModel.generate(prompt, sessionId?, signal?)`; `GameScriptModel.plan` makes exactly one request, in contract-in-prompt JSON mode (no `responseJsonSchema`).
- `withBackoff(call, { ..., signal })` rethrows the last error without sleeping once `signal.aborted`.

- [ ] **Step 1: Write the failing tests**

```ts
it('plans with one JSON-mode request that carries the contract in the prompt', async () => {
  await model.plan(doc, job);
  expect(generateContent).toHaveBeenCalledTimes(1);
  expect(generateContent.mock.calls[0]![0].config.responseJsonSchema).toBeUndefined();
  expect(generateContent.mock.calls[0]![0].contents).toContain('Exact JSON contract');
});
it('aborts a script request through the caller signal', async () => {
  const controller = new AbortController();
  const pending = model.generate('p', undefined, controller.signal);
  controller.abort();
  await expect(pending).rejects.toThrow(/abort/i);
});
it('stops backing off when the signal is aborted', async () => { /* rate-limit.test.ts: a 429 then abort → rejects without sleeping */ });
```

- [ ] **Step 2: Run to verify they fail** — `./node_modules/.bin/vitest run test/game-model.test.ts test/rate-limit.test.ts` → FAIL.
- [ ] **Step 3: Implement** — `request(prompt, schema, purpose, signal?)` uses `AbortSignal.any([signal, AbortSignal.timeout(timeoutMs + 10000)])` when a signal is given; `plan` drops the try/400 path; `withBackoff` checks `options.signal?.aborted` before each sleep.
- [ ] **Step 4: Run** → PASS; `tsc --noEmit` clean (the `GenerateScript` change is backward compatible for callers).
- [ ] **Step 5: Commit** — `git commit -m "feat(builder): cancellable script calls and one planner request"`.

---

### Task 6: Two candidates per round, the budget, plan-optional, dropped checks

**Files:**
- Modify: `services/builder/src/imagine-game.ts:34-55` (deps/result), `:181-342` (`compileBehavior`)
- Create: `services/builder/src/candidates.ts`
- Modify: `services/builder/src/revisions.ts:85-92` (passes `fallback: 'throw'`)
- Test: `services/builder/test/candidates.test.ts`, `services/builder/test/imagine-game.test.ts`

**Interfaces:**
- Consumes: `BuildBudget` (Task 2), `withoutCheck` (Task 3), `feedbackLint` and `retryFeedback(reason, source, lint)` (Task 4), `GenerateScript` with signal (Task 5).
- Produces:
  ```ts
  // candidates.ts
  export type Candidate<T> = { ok: true; value: T } | { ok: false; failure: string; diagnostic: GameFailureDiagnostic; source?: string };
  export async function raceCandidates<T>(count: number, make: (signal: AbortSignal, index: number) => Promise<Candidate<T>>): Promise<Candidate<T> | Candidate<T>[]>;
  // first ok candidate wins and aborts the rest; otherwise all failures in index order
  ```
  ```ts
  // imagine-game.ts
  export interface ImagineGameDeps { ...; budget?: BuildBudget; onScene?: (doc: SceneDoc) => void; candidates?: number /* default 2 */ }
  export interface ImagineGameResult { ...; rounds: number; fallbackReason?: 'template' }
  export async function compileBehavior(doc, job, deps, previous?, options?: { fallback: 'template' | 'throw' }): Promise<ImagineGameResult>
  ```
  `imagineGame` calls `deps.onScene?.(doc)` as soon as `buildScene` returns, then `compileBehavior(..., { fallback: 'template' })`. `reviseCreation` passes `{ fallback: 'throw' }`. Until Task 8 exists, `'template'` throws exactly as today (a `TODO(Task 8)` branch is acceptable for one commit).
  Events: `game_round` `{ round, candidates, durationMs }`, `game_candidate` `{ round, index, outcome: 'won' | 'failed' | 'cancelled', milestone, durationMs }`, `game_plan_skipped` `{ reason }`, `plan_check_dropped` `{ scenario, index }`.

- [ ] **Step 1: Write the failing tests** (`candidates.test.ts`)

```ts
it('returns the first passing candidate and aborts the other', async () => {
  const aborted: number[] = [];
  const result = await raceCandidates(2, (signal, i) => new Promise((resolve) => {
    signal.addEventListener('abort', () => aborted.push(i));
    setTimeout(() => resolve({ ok: i === 1, value: i, failure: 'x', diagnostic: { code: 'SCRIPT_OUTPUT' } }), i === 1 ? 5 : 50);
  }));
  expect(result).toEqual({ ok: true, value: 1 });
  expect(aborted).toEqual([0]);
});
it('returns every failure in index order when nobody passes', async () => { /* two failures → array length 2, order [0,1] */ });
```

(`imagine-game.test.ts`, new cases next to the existing ones)

```ts
it('sends two script requests at once and publishes the first that validates', async () => {
  // generateScript: call 0 resolves a static-check failure after 30 ms, call 1 resolves GOOD after 5 ms
  expect(result.attempts).toBe(2); expect(result.rounds).toBe(1);
});
it('runs a second round with feedback from the better failure, then stops', async () => {
  // round 1: both fail (one PLAYTEST_CHECK with 1 failed check, one SCRIPT_STATIC); round 2 prompt contains the PLAYTEST feedback; both fail again → throws (fallback 'throw')
  expect(generateScript).toHaveBeenCalledTimes(4);
});
it('drops a check that failed the causal control in both candidates before round two', async () => {
  expect(round2Prompt).not.toContain(JSON.stringify(droppedCheck));
  expect(events).toContainEqual(expect.objectContaining({ event: 'plan_check_dropped' }));
});
it('keeps every check when the candidates fail on different checks', async () => { /* Review Focus 3 */ });
it('programs without a plan when the planner is unavailable twice', async () => {
  // planGame rejects with status 503 twice → generateScript still called; prompt lacks 'Acceptance plan'; event game_plan_skipped
});
it('does not start a round the budget cannot hold', async () => {
  // budget with hardMs such that canStart(190000) is false → generateScript never called → throws (until Task 8: template)
});
it('counts transient 429s on both candidates as one failed round and sends one candidate in the next', async () => { /* Review Focus 2: round 2 makes exactly one generateScript call */ });
it('never substitutes a template on a voice edit', async () => { /* Review Focus 5: compileBehavior(..., { fallback: 'throw' }) rejects */ });
```

- [ ] **Step 2: Run to verify they fail** — `./node_modules/.bin/vitest run test/candidates.test.ts test/imagine-game.test.ts` → FAIL.
- [ ] **Step 3: Implement `raceCandidates`** with one `AbortController` per candidate; validation happens inside `make`, so the first `ok` resolves the race.
- [ ] **Step 4: Rewrite the script loop in `compileBehavior`**
  - Plan: as today, but a second planner failure or second invalid plan sets `plan = undefined` and logs `game_plan_skipped` instead of throwing.
  - Rounds: `for round in 1..2`: if `!budget.canStart(190000)` break; `raceCandidates(deps.candidates ?? 2, (signal) => generate + gate + plan journeys)`; a win returns; otherwise choose the better failure (fewest failed checks, then latest failing `check.at`, then `SCRIPT_*` before `PLAYTEST_*`), compute `lint = feedbackLint(source)`, `feedback = retryFeedback(failure, source, lint)`; if every candidate's diagnostic is `PLAYTEST_CAUSAL` on the same `{scenario, index}`, `plan = withoutCheck(plan, …)` and add one line to feedback naming the dropped check.
  - Degrade on rate limits: when every candidate of a round failed with `isRateLimited(error)`, the next round sends one candidate. `deps.candidates` defaults to `Number(process.env.GAME_CANDIDATES ?? 2)` wired in `main.ts` (add `GAME_CANDIDATES: z.coerce.number().int().min(1).max(3).default(2)` to the env schema).
  - After the rounds: `options.fallback === 'throw'` → `throw new GameGenerationError(failure, diagnostic)`; `'template'` → Task 8 (until then, throw).
- [ ] **Step 5: Run the whole builder unit suite** → PASS; update the existing tests that counted calls (`keeps one genuine validation repair … at most three calls` becomes at most four across two rounds).
- [ ] **Step 6: Commit and open PR 2** — `git commit -m "feat(builder): two script candidates per round inside one time budget"`.

---

### Task 7: The hero rule

**Files:**
- Create: `services/builder/src/hero.ts`
- Modify: `services/builder/src/prompts/v1.ts` (scene prompt receives the companion look when `job.companionId` is set)
- Modify: `services/builder/src/imagine-game.ts` (`imagineGame` calls `ensureHero` after `buildScene`, before `onScene`)
- Test: `services/builder/test/hero.test.ts`

**Interfaces:**
- Consumes: `BuildWorldJob.companionId` (Task 1), `CHARACTERS[id].look` from `@just-imagine/protocol`.
- Produces:
  ```ts
  export function heroProblem(doc: SceneDoc): string | null;   // null when heroEntityId names a non-static sprite entity
  export function ensureHero(doc: SceneDoc, job: BuildWorldJob): SceneDoc; // returns a validated doc; inserts the companion hero when heroProblem(doc) !== null and job.companionId is set
  export function companionHeroEntity(companionId: CompanionId, material: string): Entity; // id = companionId, tags ['hero', companionId], description = CHARACTERS[id].look, 1.0 x 1.0 m at x 3, y = ground top - 0.5 (or 7.5), kind 'sprite', no character metadata
  ```

- [ ] **Step 1: Write the failing tests**

```ts
it('accepts a dynamic sprite hero and rejects a static or missing one', () => {
  expect(heroProblem(flies)).toBeNull();
  expect(heroProblem({ ...flies, learning: { ...flies.learning, heroEntityId: 'owl' } })).toMatch(/static/);
  expect(heroProblem({ ...flies, learning: { ...flies.learning, heroEntityId: 'nobody' } })).toMatch(/missing/);
});
it('inserts the companion as the hero when the scene has none and the job names a companion', () => {
  const doc = ensureHero(withStaticHero, job('catch apples', { companionId: 'mishti' }));
  expect(doc.learning.heroEntityId).toBe('mishti');
  expect(doc.entities.find((e) => e.id === 'mishti')).toMatchObject({ tags: expect.arrayContaining(['hero']), description: CHARACTERS.mishti.look });
  expect(validateScene(doc).ok).toBe(true);
});
it('leaves a good scene untouched and a bad one without a companion untouched', () => { /* same object identity / unchanged */ });
it('tells the scene model the companion look', () => {
  expect(scenePromptV1(job('x', { companionId: 'bhombol' }))).toContain(CHARACTERS.bhombol.look);
  expect(scenePromptV1(job('x'))).not.toContain(CHARACTERS.bhombol.look);
});
```

- [ ] **Step 2: Run to verify they fail** → FAIL, module missing.
- [ ] **Step 3: Implement `hero.ts`** and the prompt line: `When the child names no character, the hero is the child's friend: create a sprite entity with id "${companionId}", tags ["hero","${companionId}"], description "${look}", and set learning.heroEntityId to it. It has no character metadata.`
- [ ] **Step 4: Run** → PASS; builder suite PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(builder): the child's friend becomes the hero when nobody is named"`.

---

### Task 8: Template games

**Files:**
- Create: `services/builder/src/templates/collect.ts`, `services/builder/src/templates/tap-toy.ts`, `services/builder/src/templates/index.ts`
- Modify: `services/builder/src/imagine-game.ts` (`compileBehavior` fallback branch)
- Test: `services/builder/test/templates.test.ts`, `services/builder/test/imagine-game.test.ts`

**Interfaces:**
- Consumes: `gateScript`, `withScript` (make `withScript` exported), `GameplayPlan` (for `intent`).
- Produces:
  ```ts
  // templates/index.ts
  export type TemplateKind = 'collect' | 'tap-toy';
  export function chooseTemplate(doc: SceneDoc, mode: 'game' | 'freeplay', intent?: string): TemplateKind;
  export function templateSource(kind: TemplateKind, doc: SceneDoc, language: 'en' | 'bn', mode: 'game' | 'freeplay'): string;
  export async function templateGame(doc: SceneDoc, job: BuildWorldJob, plan: GameplayPlan | undefined, deps: Pick<ImagineGameDeps, 'moderate' | 'seconds'>): Promise<{ doc: SceneDoc; kind: TemplateKind }>;
  // tries chooseTemplate's kind, then 'tap-toy' in game mode, then 'tap-toy' in freeplay; each through gateScript; throws only if all three fail
  ```
  `chooseTemplate` returns `'collect'` when (`mode === 'game'` or `/catch|collect|gather|pick|find|reach/i.test(intent ?? '')`) and the scene has at least one non-static sprite entity other than the hero; otherwise `'tap-toy'`.
  Fixed strings (en | bn): collect label `Catch 5 ${name}!` | `৫টা ${name} ধরো!`; collect greeting `Tap where I should go, or tap a ${name}!` | `কোথায় যাব ট্যাপ করো, বা একটা ${name} ট্যাপ করো!`; collect win `You caught them all! Keep playing!` | `সব ধরে ফেলেছ! খেলতে থাকো!`; toy greeting `Tap anything and see what happens!` | `যেকোনো কিছুতে ট্যাপ করে দেখো কী হয়!`; toy label `Tap 10 things!` | `১০টা জিনিসে ট্যাপ করো!`; toy win `Ten taps! Hooray!` | `দশটা ট্যাপ! হুররে!`. `name` is the most common `entity.name` among the targets, lowercased, or `things` | `জিনিস` when absent.
  Mechanics (the brief, spec 6.9): collect — tap on empty stage gives the hero a bounded impulse toward the tap along the ground; tap on a target removes it with `sound('pop')`, `celebrate('sparkle')`, `score(1)`, `hud({score, label})`; at 5, `celebrate('confetti')`, `say(win)`, no `game.win`, play continues (targets respawn from a template entity every 2 s up to the original count). tap toy — tap any body: `impulse {x:0, y:-4}` + `sound('boing')`; drag: `move`; collision above impulse 2: `sound('pop')`; first tap: `say(greeting)`; in `game` mode every tenth tap on a non-hero body scores and celebrates.
  `compileBehavior` with `{ fallback: 'template' }`: after the rounds fail (or cannot start), `const t = await templateGame(doc, job, plan, deps)`; log `game_fallback` `{ reason: 'template', template: t.kind }` at WARNING; return `{ doc: t.doc, kind: 'game', attempts, rounds, fallback: true, fallbackReason: 'template' }`.

- [ ] **Step 1: Write the failing tests**

```ts
const recorded = ['game-quality-planets', 'game-quality-portal'].map((name) => [name, SceneDocSchema.parse(JSON.parse(readFileSync(new URL(`./recordings/${name}.json`, import.meta.url), 'utf8')).doc)] as const);
describe.each([...Object.entries(FIXTURE_WORLDS), ...Object.entries(LAB_WORLDS), ...Object.entries(GAME_WORLDS), ...recorded])('template on %s', (key, doc) => {
  it.each(['collect', 'tap-toy'] as const)('%s passes the gate in game mode when choosable, and tap-toy in freeplay', async (kind) => {
    const scene = sceneOnly(doc);
    if (kind === 'collect' && chooseTemplate(scene, 'game') !== 'collect') return;
    expect(await gateScript(scene, templateSource(kind, scene, 'en', 'game'), { language: 'en', requireGoal: true })).toBeNull();
    expect(await gateScript(scene, templateSource(kind, scene, 'bn', 'freeplay'), { language: 'bn', requireGoal: false })).toBeNull();
  });
});
it('never picks collect for a lone hero on the ground', () => { expect(chooseTemplate(loneHero, 'game')).toBe('tap-toy'); }); // Review Focus 1
it('mirrors the target name in child words', () => { expect(templateSource('collect', flies, 'en', 'game')).toContain('Catch 5 fly!'.replace('fly', 'flies') /* use entity.name */); });
it('every fixed string passes the blocklist', () => { for (const s of ALL_TEMPLATE_STRINGS) expect(findBlockedTerm(s)).toBeNull(); });
it('falls back to a template after two failed rounds on a build, honestly flagged', async () => {
  const result = await imagineGame(job('catch flies'), { ...deps, generateScript: alwaysStatic });
  expect(result).toMatchObject({ kind: 'game', fallback: true, fallbackReason: 'template' });
  expect(result.doc.game?.script.source).toContain('Catch 5');
});
```

Replace the existing test `reports a failed game instead of publishing an unrelated plain scene` with the one above (the rule is now "never silently substitute").

- [ ] **Step 2: Run to verify they fail** → FAIL, modules missing.
- [ ] **Step 3: Write the two template scripts** as string builders (plain JavaScript against the Game API; ids and strings interpolated with `JSON.stringify`); `templates/index.ts`; the `compileBehavior` branch.
- [ ] **Step 4: Run** → PASS on all seven fixtures; builder suite PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(builder): a designed template game is the last resort, never a failure"`.

---

### Task 9: Art starts with the scene; a missing run cycle never fails a world

**Files:**
- Create: `services/builder/src/art-phase.ts`
- Modify: `services/builder/src/worker.ts:139` (lock `960000`), `:160-290` (build path), `:381-416` (patch path), `:470-520` (patch art)
- Modify: `services/builder/src/motion.ts:25-30`
- Test: `services/builder/test/art-phase.test.ts`, `services/builder/test/motion-art.integration.test.ts` (emulator), `services/builder/test/worker.integration.test.ts` (emulator)

**Interfaces:**
- Consumes: `BuildBudget.deadlineFor(ART_PHASE_MS)`, `ImagineGameDeps.onScene` (Task 6).
- Produces:
  ```ts
  // art-phase.ts
  export interface ArtRequest { id: string; description: string; kind: string; hero: boolean; locomotion?: Locomotion }
  export type ArtOutcome = { status: 'ready'; asset: Awaited<ReturnType<BuilderWorker['asset']>> } | { status: 'failed' } | { status: 'generating' };
  export function startArt(requests: ArtRequest[], generate: (request: ArtRequest) => Promise<ArtOutcome['asset']>, options: { deadline: number; concurrency?: number /* 4 */; now?: () => number; onUpdate?: (id: string, outcome: ArtOutcome) => void; stop?: () => Promise<boolean> /* kill switch */ }): { outcomes: Map<string, ArtOutcome>; done: Promise<void> };
  export function applyArt(world: WorldDoc, outcomes: Map<string, ArtOutcome>): WorldDoc; // same mapping as worker.ts:246-266 today, incl. applyPaintedFloor
  // motion.ts
  export function dropMissingMotion(doc: SceneDoc): string[]; // removes `locomotion` from entities without motion artwork; returns their ids
  ```
  Worker build path: `imagineGame(job, { ..., budget, onScene: (doc) => { art = startArt(requestsFor(doc), …, { deadline: budget.deadlineFor(ART_PHASE_MS) }) } })`; after the game is built, publish `building` with `applyArt`, then on each `onUpdate` publish again, `await art.done`, `dropMissingMotion` (log `art_locomotion_dropped` `{ ids }`), publish `ready`. One repair attempt for a `MotionRegistrationError` stays inside `generate` (as today) and is bounded by the deadline. If `Date.now() > budget.hard` when art is still pending, log `build_deadline_hit` `{ phase: 'art' }`, mark pending outcomes `failed`, publish `ready`. The patch path and `paintEdit` use `dropMissingMotion` instead of `requireMotionArtwork`; `requireMotionArtwork` is deleted.

- [ ] **Step 1: Write the failing tests** (`art-phase.test.ts`, fake `generate`, fake clock)

```ts
it('runs four at a time, reports each outcome, and stops starting new work after the deadline', async () => { /* 6 requests, generate resolves after 10 ms, deadline passes after the 4th → outcomes: 4 ready, 2 failed */ });
it('applies ready outcomes to the backdrop, mid layer and entities and leaves failed ones as failed', () => { /* applyArt on fixtureWorldDoc */ });
it('drops locomotion only from moving sprites without animation art', () => {
  const ids = dropMissingMotion(docWithRunnerWithoutSheetAndRollerWithAsset);
  expect(ids).toEqual(['runner']); expect(doc.entities.find((e) => e.id === 'runner')!.locomotion).toBeUndefined();
});
```

(`worker.integration.test.ts`, under the emulator)

```ts
it('publishes building with art that finished during scripting, then ready, never failed, when a sheet is missing', async () => { /* fake models: scene → script wins after art for the backdrop resolved; hero sheet throws → world ready, hero.locomotion undefined, job complete */ });
it('publishes ready with partial art when the hard deadline passes during art', async () => { /* Review Focus 4: budget with tiny hardMs; expect world.status 'ready', build_deadline_hit logged */ });
```

- [ ] **Step 2: Run to verify they fail** — unit file FAIL (module missing); integration FAIL under `FIRESTORE_EMULATOR_HOST`.
- [ ] **Step 3: Implement `art-phase.ts`, `dropMissingMotion`, and rewire `worker.ts`** (move the request list builder from `worker.ts:206-240` into a `requestsFor(doc, plan)` helper in `art-phase.ts`).
- [ ] **Step 4: Run unit + integration** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(builder): art starts with the scene and a missing run cycle never fails a world"`.

---

### Task 10: The fallback ladder in the worker, honestly recorded

**Files:**
- Modify: `services/builder/src/worker.ts` (build path try/catch, final transaction), `services/builder/src/main.ts:128-139` (`/jobs` catch)
- Modify: `services/builder/src/revisions.ts:93-100` (`initialCreation` accepts `fallback`)
- Test: `services/builder/test/worker.integration.test.ts`

**Interfaces:**
- Consumes: `ImagineGameResult.fallbackReason` (Task 8), `nearestConceptFixture` (`fallback.ts`), `templateGame` (Task 8), `Creation.fallback` (Task 1).
- Produces: job document `{ status: 'fallback', fallbackReason: 'template' | 'sample', finishedAt }` instead of `complete` when the world fell back; `world.creation.fallback` set the same; `SceneValidationError` from `imagineGame` on a build → `nearestConceptFixture(job)` then `templateGame(sample, job, undefined, deps)` → continue with art, reason `'sample'`, log `game_fallback { reason: 'sample' }`. A `GameGenerationError` can no longer escape a build (only patches), so `main.ts` keeps returning `failed` for patches only.

- [ ] **Step 1: Write the failing tests** (emulator)

```ts
it('ends in status fallback with reason template and a ready world when every script fails', async () => {
  expect((await jobRef.get()).data()).toMatchObject({ status: 'fallback', fallbackReason: 'template' });
  expect((await worldRef.get()).data()).toMatchObject({ status: 'ready', creation: expect.objectContaining({ fallback: 'template' }) });
});
it('publishes the nearest sample world with a template game when the scene never validates', async () => { /* generateScene always invalid → status fallback, reason sample, world ready */ });
it('still fails a voice edit whose behaviour never validates and keeps the previous world', async () => { /* patch job → job failed, world unchanged */ });
```

- [ ] **Step 2: Run to verify they fail** → FAIL.
- [ ] **Step 3: Implement** the catch around `imagineGame` and the final transaction; `initialCreation(job, fallback?)`.
- [ ] **Step 4: Run the builder unit and integration suites, typecheck, lint** → PASS.
- [ ] **Step 5: Commit and open PR 3** — `git commit -m "feat(builder): every build ends in a playable world with its fallback recorded"`.

---

### Task 11: Gateway: the friend on the job, the honest line, the 900 s deadline

**Files:**
- Modify: `services/gateway/src/gateway.ts:636-671` (build_world), `:528-546` (observeJob)
- Modify: `services/gateway/src/contracts.ts:65` (`watchJob?(id, callback: (status: string, detail?: { fallbackReason?: 'template' | 'sample' }) => void)`), `services/gateway/src/store.ts:380-390` (reads `fallbackReason`), `:290-294` (`dispatchDeadline: { seconds: 900 }`)
- Test: `services/gateway/test/gateway.test.ts`, `services/gateway/test/store.integration.test.ts`

**Interfaces:**
- Consumes: `BuildWorldJob.companionId` (Task 1); `session.record.characterId` (`session.ts:24`).
- Produces: every build job carries `companionId`: the mic holder when `CompanionIdSchema.safeParse(session.record.characterId).success`, else `identity.child.companion?.characterId`, else `DEFAULT_CHARACTER`; on job status `fallback` the gateway injects one of two lines into the Live context and never sends `worldJob … status: 'failed'`:
  - template: `The child's exact game could not be built. A simpler version with their own characters and scene was made instead. Say honestly: "I made a simpler version of your game. Tell me what to change." Offer to change it with modify_world.`
  - sample: the existing "could not be painted" line.

- [ ] **Step 1: Write the failing tests**

```ts
it('puts the mic-holding companion on a build job, or the child\'s own companion when a guide holds the mic', async () => { /* record.characterId 'mishti' → 'mishti'; 'pori' with child.companion 'chandni' → 'chandni'; 'pori' without one → 'bhombol' */ });
it('tells the friend about a template fallback and does not report failure to the browser', async () => {
  store.emitJob('j1', 'fallback', { fallbackReason: 'template' });
  expect(live.text).toHaveBeenCalledWith(expect.stringContaining('simpler version'));
  expect(sent).not.toContainEqual(expect.objectContaining({ type: 'worldJob', status: 'failed' }));
});
it('queues builds with a 900 second dispatch deadline', async () => { /* store.integration: createTask called with dispatchDeadline.seconds 900 */ });
```

- [ ] **Step 2: Run to verify they fail** — `cd services/gateway && ./node_modules/.bin/vitest run test/gateway.test.ts` → FAIL.
- [ ] **Step 3: Implement.**
- [ ] **Step 4: Run gateway unit + integration (emulator), typecheck, lint** → PASS.
- [ ] **Step 5: Commit and open PR 4** — `git commit -m "feat(gateway): the friend joins the build and speaks honestly about a fallback"`.

---

### Task 12: Infrastructure: 900 s builder, alerts on every fallback

**Files:**
- Modify: `infra/terraform/main.tf:10` (builder `timeout = "900s"`)
- Modify: `infra/terraform/observability.tf` (add `game_fallbacks` and `build_deadlines` to the `google_logging_metric.events` map with filters `jsonPayload.event="game_fallback"` and `jsonPayload.event="build_deadline_hit"`; one `google_monitoring_alert_policy` "Just Imagine game fallback or build deadline" with two `conditions`, `COMPARISON_GT` threshold `0`, `duration = "0s"`, `ALIGN_SUM` over `300s`, `notification_channels = var.notification_channels`)
- Test: `terraform fmt -check && terraform validate` (owner runs `terraform plan`/`apply`)

- [ ] **Step 1: Make the changes.**
- [ ] **Step 2: Run** `cd infra/terraform && terraform fmt -check && terraform validate` → clean (if the CLI is absent locally, say so in the PR and ask the owner to run it).
- [ ] **Step 3: Commit and open PR 5** — `git commit -m "feat(infra): a 900 second builder and an alert on every game fallback"`. The PR body tells the owner to apply and that the gateway's 900 s deadline (PR 4) must be deployed with it.

---

### Task 13: Local soak before merging PR 3

**Files:**
- Create: `services/builder/scripts/soak-games.mts` (not bundled; git-ignored output)

- [ ] **Step 1: Write the script** from the scratchpad `repro.mts` pattern: ten wishes (puppy catches apples; kitten ball race; cat cannon knocks blocks; stack blocks taller than a giraffe; moon landing; snail race; a dragon that paints rainbows when tapped; a fish that hides from a shark; a robot that sorts shapes; a conversation-only wish with a talking owl), real `VertexModels` + `GameScriptModel` from `.env.local`'s `GEMINI_API_KEY`, `onScene` stubbed, `budget` real. Print one row per wish: result (`won` / `template` / `sample`), rounds, game-phase seconds, fallback reason.
- [ ] **Step 2: Run** `cd services/builder && set -a && . ../../.env.local && set +a && node --import tsx scripts/soak-games.mts | tee /private/tmp/claude-502/-Users-mubinuiislam-Home-Hackathons-just-imagine/a8ade14c-cd37-41dc-a055-70af82d1ab0c/scratchpad/soak.log`
  Expected: 10 rows, zero errors thrown, median game phase under 90 s, every fallback row carrying a reason. Paste the table in PR 3.
- [ ] **Step 3: If a wish falls back twice in a row**, record its failure diagnostics in the PR as a prompt follow-up; do not change the templates to hide it.

---

### Task 14: When the world is ready, the voice stops and the child is in the game

Added from the owner's request during execution: "after building the world the voice will stop and will be taken to the game". Today `Studio.tsx:287-318` selects the world on `worldJob ready` but the voice session keeps running and the friend keeps talking over the new game.

**Files:**
- Modify: `apps/web/components/Studio.tsx:287-318` (`worldJob` case)
- Test: `apps/web/test/studio-ready.test.tsx` (jsdom; follow `apps/web/test/studio-break.test.tsx` for mounting `Studio` with a fake voice)

**Interfaces:**
- Consumes: `stopVoice()` (`Studio.tsx:734`), `selectWorldId` (`Studio.tsx:226`), `clearBuild` (`apps/web/lib/building.ts`).
- Produces: on `worldJob` with `status: 'ready'` for the world this session asked for, the Studio calls `stopVoice()` before `selectWorldId(message.worldId)`, so the voice indicator leaves the `live` state and the game HUD mounts with the world; a `ready` for a world the child did not ask for in this session (badge from another screen) only clears the badge as today. No new visible element and no copy change; the existing "Your game is ready!" badge copy is reused if a caption is needed.

- [ ] **Step 1: Write the failing test**

```tsx
it('stops the voice and shows the game when the world the child asked for is ready', async () => {
  // mount Studio with the fake voice; send worldJob queued then ready for worldId 'w_1' with a GAME_WORLDS fixture published
  expect(voice.stop).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('game-hud')).toBeInTheDocument();
  expect(screen.queryByRole('button', { name: /stop/i })).toBeNull(); // the dock is no longer live
});
it('leaves the voice alone when a ready arrives for a world this session did not build', async () => { expect(voice.stop).not.toHaveBeenCalled(); });
```

- [ ] **Step 2: Run to verify it fails** — `cd apps/web && ./node_modules/.bin/vitest run test/studio-ready.test.tsx` → FAIL (voice not stopped).
- [ ] **Step 3: Implement** in the `worldJob` case: when `message.status === 'ready' && showStartedAt !== undefined` (the build started in this session), call `stopVoice()` before selecting the world.
- [ ] **Step 4: Run the web unit suite, typecheck, lint** → PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(web): the voice stops and the game opens the moment the world is ready"`.

---

### Task 15: The whole journey, end to end

Added from the owner's request: "the start to end journey need to be very stable and smooth".

**Files:**
- Modify: `packages/fixtures/src/fake-gateway.ts` (a scripted build: on `build_world`-style wish text containing "game", emit `worldJob` `queued` → `placeholders` → `ready` 300 ms apart and publish `GAME_WORLDS.catchTheFlies` under the new world id through the fake world source)
- Create: `apps/web/e2e/journey.spec.ts` (fake mode, same harness as `apps/web/e2e/generated-game.spec.ts`)

**Interfaces:**
- Consumes: the fake gateway and fake world source in `packages/fixtures`, Task 14's behaviour.

- [ ] **Step 1: Write the failing e2e test**

```ts
test('a child asks for a game, waits, the voice stops, and the game is playable', async ({ page }) => {
  // sign in as the fake child, start voice, type/say "a game where a frog catches flies"
  // expect the building state, then within 2 s: the dock is not live, the game HUD shows the fly score, tapping a fly changes the score
});
```

- [ ] **Step 2: Run to verify it fails** — `cd apps/web && npx playwright test e2e/journey.spec.ts` (fake mode per `apps/web/e2e/README` or the existing specs' setup) → FAIL (no scripted build in the fake gateway).
- [ ] **Step 3: Implement the scripted build in the fake gateway**; keep every existing fake flow unchanged (run `e2e/generated-game.spec.ts` and `e2e/flows.spec.ts` too).
- [ ] **Step 4: Run** the new spec and the two existing ones → PASS.
- [ ] **Step 5: Commit and open PR 6** — `git commit -m "test(web): the child's journey from wish to playable game, end to end"`.

---

## Self-review

- Spec coverage: 6.1 → Task 3; 6.2, 6.3 → Task 4; 6.4 → Tasks 1, 7, 11; 6.5 → Tasks 5 (schema call), 9 (art), review-parallel plan is **not** implemented (saves ~5 s, adds a wasted call on review failure; left out deliberately, noted here); 6.6 → Tasks 5, 6; 6.7 → Tasks 2, 9, 11, 12; 6.8 → Tasks 6 (plan skipped), 8, 9, 10, 11; 6.9 → Task 8; 6.10 → Tasks 6, 8, 9, 10, 12; verification 10 → Task 13 and the integration tests.
- Type consistency: `GenerateScript` (Task 5) is what Task 6 races; `ImagineGameResult.fallbackReason` (Task 6/8) is what Task 10 writes; `watchJob` detail (Task 11) matches the job fields Task 10 writes; `BuildBudget` names match across Tasks 2, 6, 9.
- Proportion: code appears only as tests and signatures; template mechanics and strings are pinned because the spec fixes them.
