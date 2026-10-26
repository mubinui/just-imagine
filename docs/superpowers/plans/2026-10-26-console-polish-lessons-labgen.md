# Console polish, example lessons and teacher lab generation — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every teacher, student and operator screen is free of overflow, collisions and clipped text on phone, iPad and laptop/desktop; every one of the 22 simulations has a complete bilingual example lesson; a teacher (and an operator) can describe a lab in words and get a validated, reviewable simulation step and graded task from `gemini-4-argon`.

**Architecture:** Three independent branches, each a pull request to `main` that the product owner merges and deploys. (A) CSS fixes by root cause, guarded by a detector-based Playwright spec. (B) Seventeen new lessons in the existing seed format, enforced by the existing quality test. (C) A new authoring endpoint that asks `gemini-4-argon` to choose and configure one of the lesson chapter's tested simulations, re-validates the result with `validateLesson(..., publish = true)` and returns it for the teacher to accept; it never writes a lesson and never generates code.

**Tech Stack:** Next.js (apps/web), Express API (services/api), Zod 4, `@google/genai` on Vertex AI, Vitest, Playwright, Firebase emulators.

**Spec:** `docs/superpowers/specs/2026-10-18-stem-simulation-library-design.md` (Teacher experience §5 "Generate", Quality bar) and `docs/superpowers/specs/2026-10-17-schools-stem-design.md`. Product-owner decisions of 2026-10-26: one example lesson per simulation; generation exactly as the library spec says; devices phone 390×844, iPad 820×1180 and 1180×820, laptops 1280×800, 1440×900, 1728×1117 and desktop 1920×1080; PRs, owner deploys and runs the seed refresh.

## Global Constraints

- Every model call goes through Vertex AI with Application Default Credentials (`vertexModelLocation()`); a local run may use `GEMINI_API_KEY` only when `LOCAL_DEV=1` (existing `vertexSchoolModel` rule). No key reaches the browser.
- Lab generation model: `process.env['SCENE_MODEL'] || 'gemini-4-argon'` (same variable `services/api/src/admin.ts:726` reports).
- No generated code is executed anywhere; generation only selects a registered `SimId`, its parameters, locks, prompts and a registered predicate.
- Generation never saves: it returns a proposal; nothing changes until the teacher accepts, and accepting only edits the unsaved editor state.
- TypeScript strict with `noUncheckedIndexedAccess`, ESM, Zod 4 at every boundary. Tests in `test/` named `<unit>.test.ts`; web browser checks in `apps/web/e2e/`.
- Branches `fix/web-console-layout`, `feat/school-example-lessons`, `feat/school-lab-generation`. Conventional Commits. Commit messages and PR bodies end with prose and carry no Claude or Anthropic attribution.
- `packages/protocol` changes (Task C1) need the other developer's review on the PR.
- UI matches `apps/web/DESIGN.md`; spacing scale 8-12-16-24-32-48; one control height 48 px; Bangla and English both legible.

## Review Focus

1. A teacher writes the lab description in Bangla → the proposal still has complete English and Bangla prompts (Task C2 test `accepts a Bangla description`).
2. The lesson's chapter has no simulation (e.g. Reflection of light) → the generate control is disabled with an explanation, and the endpoint answers 400 "This chapter has no simulations yet" without calling the model (C2, C3).
3. The model proposes an out-of-range parameter, an unknown predicate, a task already solved at its start or an example answer that fails → one repair retry with the validation message, then a 503 that leaves the lesson unchanged (C2).
4. The teacher clicks Generate twice or edits the lesson while waiting → only the latest proposal is shown; accepting gives the task a quiz item id that does not collide with existing ids (C3).
5. Long Bangla text and long single-line values (step previews, chapter names in selects) at 390 px and 1920 px → no horizontal overflow or clipped selects (A tasks, detector spec).

---

## Part A — Console layout (branch `fix/web-console-layout`)

Found with a detector-driven Playwright audit (every teacher, student and operator page, every lesson and student step, closed and expanded, at all seven sizes) plus review of every screenshot. Each root cause has a case in `apps/web/e2e/console-layout.spec.ts`, which renders the shipped stylesheets.

- [x] A1 Step list grid column took the one-line preview's min-content width → `grid-template-columns: minmax(0, 1fr)`.
- [x] A2 Editor sections had no shared spacing (publication checks, audit reason and details card touched) → one 24 px rhythm on the editor's children; the teacher overview grid and the appearance preview get their own spacing.
- [x] A3 Chapter select cut long names on tablets → chapter gets its own full-width row; maths chapters grouped by General and Higher Mathematics; selects end overflow with an ellipsis.
- [x] A4 Phone navigation (teacher six, student three destinations) and lesson step tabs scrolled sideways with a hidden scrollbar → three-column tile grid; numbered stepper with a current-step caption.
- [x] A5 Prompts ran together; Import CSV, catalog tabs and the correct-answer radio were under 44 px → paragraph spacing and 44 px targets.
- Detector findings checked and rejected as intended design: segmented controls, list rows and stat strips with shared dividers, the header/side-nav frame, closed `<details>` content (Chrome keeps its layout boxes), visually hidden labels.

## Part B — Example lessons (branch `feat/school-example-lessons`)

Simulations without an example lesson (computed from `DEMO_LESSONS` on 2026-10-26): physics `projectile`, `vector-addition`, `incline`, `pendulum`, `spring`, `collision`, `orbit`; chemistry `ph-indicator`, `titration`, `flame-test`, `reaction-rate`, `gas-law`; maths `function-grapher`, `derivative`, `riemann-area`, `probability`, `trig-waves`. Seventeen lessons, 24 in total.

### Task B1: Move the lesson builders into a kit

**Files:**
- Create: `services/api/src/school/demo-lesson-kit.ts`
- Modify: `services/api/src/school/demo-lessons.ts`

**Interfaces:**
- Produces: `t`, `hints`, `mcq`, `numeric`, `task`, `explore`, `lesson(slug, subject, chapterId, title, body, play, questions, support)` and `type Support`, `type Question` exported from `demo-lesson-kit.ts`. `lesson` now takes its `Support` as the last argument instead of reading the module-level `SUPPORT` map.

- [ ] **Step 1:** Move the builders unchanged except for the `support` parameter; `demo-lessons.ts` keeps the seven lessons and their `SUPPORT` entries and passes `SUPPORT[slug]`.
- [ ] **Step 2:** Run `pnpm --filter @just-imagine/api exec vitest run test/demo-lesson-quality.test.ts` — expected PASS, unchanged.
- [ ] **Step 3:** Commit `refactor(api): move the example lesson builders into a kit`.

### Task B2: Physics example lessons (7)

**Files:**
- Create: `services/api/src/school/demo-lessons-physics.ts`
- Modify: `services/api/src/school/demo-lessons.ts` (append `...PHYSICS_LESSONS` to `DEMO_LESSONS`)
- Test: `services/api/test/demo-lesson-quality.test.ts`

Chapters: `projectile` physics-2, `vector-addition` physics-3, `incline` physics-3, `collision` physics-3, `orbit` physics-3, `pendulum` physics-4, `spring` physics-4.

Each lesson meets the existing bar: intro with Learning goals / Worked example / Model assumptions / Watch out in both languages; three Predict / Observe / Explain prompts (Bangla আগে অনুমান / দেখো / ব্যাখ্যা); a distinct practice check; five quiz items including exactly one `simTask` whose start is unsolved and whose `exampleAnswer` meets the predicate; two distinct, non-revealing hints per item; numeric keys equal to the model's own `solve()` reading or a closed-form value; `revision` 2; `approved` both.

- [ ] **Step 1: Extend the quality test first.** Make the per-lesson tables data-driven so they cover every entry: `failures[slug]` (a failing counterexample per new task), `expected[slug][itemId]` (independent calculations for every numeric key, written as arithmetic in the test, e.g. `(20 ** 2 * Math.sin(2 * 40 * Math.PI / 180)) / 9.8`). Replace the fixed counts with `expect(DEMO_LESSONS).toHaveLength(14)` for this task, `allHints.length === 6 * 2 * DEMO_LESSONS.length` and unique, and an answer-position balance check `max(positions) - min(positions) <= 1`.
- [ ] **Step 2:** Run the test — expected FAIL on the length (7 ≠ 14).
- [ ] **Step 3:** Write the seven lessons. Parameters must parse with each model's `params` schema; read each model file in `packages/stem-sims/src/physics/` for parameter names, ranges and predicate argument schemas before writing.
- [ ] **Step 4:** Run the test — expected PASS. Also run `pnpm --filter @just-imagine/api typecheck`.
- [ ] **Step 5:** Commit `feat(api): physics example lessons for every physics simulation`.

### Task B3: Chemistry example lessons (5)

As B2 with `demo-lessons-chemistry.ts`, `CHEMISTRY_LESSONS`, length 19. Chapters: `gas-law` chemistry-2, `flame-test` chemistry-3, `titration` chemistry-6, `reaction-rate` chemistry-7, `ph-indicator` chemistry-9. Indicator colours and flame colours must match the model tables in `packages/stem-sims/src/chem/`. Commit `feat(api): chemistry example lessons for every chemistry simulation`.

### Task B4: Mathematics example lessons (5)

As B2 with `demo-lessons-math.ts`, `MATH_LESSONS`, length 24. Chapters: `function-grapher` math-gm-2, `riemann-area` math-gm-16, `trig-waves` math-gm-9, `derivative` math-hm-11, `probability` math-hm-14. Grade 9 for general maths, 10 for higher maths. Probability keys use theoretical values, never simulated frequencies. Commit `feat(api): mathematics example lessons for every maths simulation`.

### Task B5: Seed refresh and end-to-end check

- [ ] **Step 1:** Against the local stack (emulators 8080/9099, project `demo-just-imagine-local`): `node scripts/seed-schools.mjs --refresh-lessons`. Expected: "Seeded … lessons", 24 global lessons, the original 7 keep their ids (`schoolSeeds/demo.lessonIds`).
- [ ] **Step 2:** As the demo teacher, Shared lessons shows 24; copy, publish and assign one lesson per subject to class 9-A; as `student01` open each, run its simulation, answer the task with the example answer and see it marked correct.
- [ ] **Step 3:** Open a PR. The body tells the owner to run `node scripts/seed-schools.mjs --staging --refresh-lessons` with production credentials after deploying.

## Part C — Teacher lab generation (branch `feat/school-lab-generation`)

### Task C1: Request and proposal contracts

**Files:**
- Modify: `packages/protocol/src/school.ts` (after `LessonTextAssistResponseSchema`)
- Test: `packages/protocol/test/school.test.ts`

**Interfaces:**
- Produces:
  - `LabGenerateRequestSchema = z.object({ subject, grade, chapterId, title: BilingualTextSchema, description: z.string().trim().min(8).max(800), language: LanguageSchema })`
  - `LabProposalSchema = z.object({ step: <explore step schema>, task: z.object({ item: <simTask QuizItem schema>, key: <simTask QuizKey schema> }).nullable(), summary: BilingualTextSchema })`
  - types `LabGenerateRequest`, `LabProposal`. Reuse the existing explore-step and simTask schemas by extracting them to named consts (`ExploreStepSchema`, `SimTaskItemSchema`, `SimTaskKeySchema`) that `LessonStepSchema`, `QuizItemSchema` and `QuizKeySchema` then reference, so the shapes cannot drift.

- [ ] **Step 1:** Tests: a valid request parses; a 7-character description fails; a proposal with `task: null` parses; a proposal whose step `kind` is `'lab'` fails.
- [ ] **Step 2:** Run — FAIL (exports missing). **Step 3:** Implement. **Step 4:** Run protocol tests and `pnpm typecheck` — PASS. **Step 5:** Commit `feat(protocol): lab generation request and proposal`.

### Task C2: Generation endpoint

**Files:**
- Create: `services/api/src/school/lab-generation.ts`
- Modify: `services/api/src/school/ai.ts` (model factory), `services/api/src/school/routes.ts`, `services/api/src/admin-lessons.ts`
- Test: `services/api/test/lab-generation.test.ts`

**Interfaces:**
- Consumes: `LabGenerateRequestSchema`, `LabProposalSchema` (C1); `validateLesson` (`school/lessons.ts`); `reserveAi`, `modelResult` (`school/ai.ts`).
- Produces:
  - `schoolModelFor(modelId: string): SchoolModel` in `ai.ts`; `vertexSchoolModel = schoolModelFor(process.env['FAST_MODEL'] ?? 'gemini-3.8-flash')` keeps today's behaviour; `labModel = schoolModelFor(process.env['SCENE_MODEL'] || 'gemini-4-argon')`, `maxOutputTokens` 16000, 90 s timeout.
  - `generateLab(actor: SchoolAdminActor, input: unknown, model: SchoolModel = labModel): Promise<LabProposal>`.
  - Routes `POST /v1/school/lab/generate` (teacher) and `POST /v1/admin/lab/generate` (operator; body also carries `reason`, validated like `lesson-text/assist`).

Behaviour: reject a chapter outside the subject (400 "Choose a chapter in this subject."), a chapter with no sims (400 "This chapter has no simulations yet."), a non-teacher, non-operator actor (403); reserve `aiDrafts` for school actors; build the prompt from the chapter's simulations only, each with `z.toJSONSchema(model.params)` and its predicate names with argument schemas, and the teacher's description as quoted data; parse with `LabProposalSchema`; check both languages of every text with `lessonTextUsesLanguage`; build a candidate lesson `{ chapterId, subject, steps: [step, ...(task ? [{ kind: 'quiz', items: [task.item] }] : [])] }` with keys `{ [task.item.id]: { key: task.key, hints: [] } }` and run `validateLesson(candidate, keys, true)`; on failure send one repair prompt that quotes the validation message; on a second failure 503 "AI could not build a valid lab from this description. Your lesson is unchanged; try rephrasing." A task without `exampleAnswer` is rejected (the witness is required for generated tasks).

- [ ] **Step 1: Tests with a fake `SchoolModel`** (pattern: existing authoring tests):
  - `returns a validated proposal for a projectile description` (physics-2; fake returns projectile with angle locked out; expect `step.simId === 'projectile'` and `task.key.exampleAnswer` meets the predicate via `checkLockedSimTask`).
  - `accepts a Bangla description` (language `bn`; proposal prompts have both languages).
  - `refuses a chapter with no simulations without calling the model` (physics-8; fake model call count 0; 400).
  - `retries once when the first proposal uses a simulation outside the chapter, then succeeds` (call count 2; second prompt contains "not assigned to this chapter").
  - `fails with 503 after two invalid proposals and never writes` (Firestore lesson docs unchanged).
  - `rejects a task already solved at its start` and `rejects a task without an example answer`.
  - `quotes the description as data` (prompt contains `JSON.stringify(description)` and the injection sentence from `buildTextAssistPrompt`).
  - `charges one aiDrafts unit per request` (usage doc +1).
- [ ] **Step 2:** Run `pnpm --filter @just-imagine/api exec vitest run test/lab-generation.test.ts` under the emulator runner — FAIL (module missing).
- [ ] **Step 3:** Implement. **Step 4:** Run the file and the whole api suite — PASS. **Step 5:** Commit `feat(api): teachers describe a lab and gemini-4-argon configures a tested simulation`.

### Task C3: "Describe a lab" in the lesson editor

**Files:**
- Create: `apps/web/components/school/LabGenerator.tsx`, `apps/web/components/school/LabGenerator.module.css`
- Modify: `apps/web/components/school/Lessons.tsx` (add-steps group), `apps/web/lib/school/console-copy.ts` (en + bn copy)
- Test: `apps/web/test/school-lab-generator.test.tsx`, `apps/web/e2e/` local-stack spec extended in Task C4

**Interfaces:**
- Consumes: `POST {school|admin}/lab/generate` (C2), `LabProposalSchema` (C1), the editor's `change(lesson)` and `keys` setter, `editor.reason` for operators.
- Produces: `<LabGenerator lesson={lesson} keys={keys} admin={admin} reason={reason} onAccept={(steps, keyEntries) => void} />`.

Behaviour: a "+ Lab from a description" button in the add-steps group opens a panel with a textarea (8–800 characters, counter), Generate, and the elapsed-seconds progress the editor already shows for AI tasks. While a request runs the button is busy; a newer request supersedes an older one (generation counter, as `LessonTextAssist`). The proposal preview shows the simulation name (`simLabel`), each parameter with its value and unit, which are locked, the prompts in the editing language and the task in plain words; Accept appends the explore step and, when there is a task, a quiz step with the item renamed to the first free id `lab1`, `lab2`, … and its key added; Discard closes it. Disabled with the reason when the chapter has no simulations, when the lesson has 19+ steps, or (operator) when the audit reason is under 3 characters. Accepting marks the lesson dirty and clears approvals the same way other edits do.

- [ ] **Step 1:** Component tests (Testing Library, existing `school-ui.test.tsx` setup): renders disabled with the no-simulation message for physics-8; shows a proposal from a mocked request; Accept calls `onAccept` with a quiz item id `lab2` when `lab1` exists; a superseded response is ignored.
- [ ] **Step 2:** Run — FAIL. **Step 3:** Implement; run `impeccable` (polish + harden) on the panel at phone, iPad and desktop sizes. **Step 4:** Run web unit tests, lint, typecheck — PASS. **Step 5:** Commit `feat(web): describe a lab in the lesson editor`.

### Task C4: Real-model check on the local stack

- [ ] **Step 1:** Rebuild the local stack; as the demo teacher in a draft lesson, generate from three descriptions: physics-2 "a ball launched from a cliff, students find the angle for the longest range"; chemistry-9 in Bangla "সূচক দিয়ে অম্লের pH খুঁজে বের করো"; math-hm-14 "roll two dice many times and compare with theory". Record the proposals.
- [ ] **Step 2:** Accept each, approve both languages, publish, assign to 9-A; as `student01` solve each task; confirm grading marks it correct and that a wrong answer is marked wrong.
- [ ] **Step 3:** Repeat one generation as the operator (with an audit reason) and confirm the audit log entry.
- [ ] **Step 4:** Open the PR, noting the protocol change for the other developer's review.
