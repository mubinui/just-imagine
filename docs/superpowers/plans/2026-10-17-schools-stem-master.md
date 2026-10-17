# Schools + STEM: master plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement each phase plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the school product line described in the spec: super admin schools and catalog, the teacher console, PIN student sign-in, NCTB class 9–10 sims and chemistry lab, lessons, quizzes, leaderboards and the Gemini Live tutor.

**Architecture:** Schools live in a new `schools/{id}` tree beside the untouched family model. Pure, deterministic sim and chemistry models in `packages/stem-sims` run in the browser and in the API, so the server can re-check sim answers. Curriculum data lives in `packages/stem-content`. New API route modules, new web route groups and a gateway tutor module are added; each shared file gets one anchored insertion.

**Tech stack:** TypeScript strict (ESM, `noUncheckedIndexedAccess`), Zod 4, Fastify 5, firebase-admin 13, Firestore and Auth emulators, Next.js app router, vitest 3, Playwright.

**Spec:** `docs/superpowers/specs/2026-10-17-schools-stem-design.md`

## Global constraints

- Node `>=22.12.0`. Run pnpm as `npx -y pnpm@10.34.7` when `pnpm` is not on PATH.
- Package names are `@just-imagine/<dir>`. Tests go in `test/` beside `src/` and are named `<unit>.test.ts`.
- Zod 4 at every boundary; every Firestore document has a schema in `packages/protocol`.
- Every model call goes through Vertex AI in `us-central1`. Models: drafting, translation, chemistry fallback and moderation use `gemini-3.8-flash`; the tutor uses `gemini-3.8-live`.
- No raw audio is stored. Transcripts live only in gateway memory. Student profiles hold first name, username, avatar, class and language only.
- Client Firestore writes stay denied. All writes go through the API with the Admin SDK.
- Shared files get one anchored insertion each, claimed in `CHECKPOINT.md` first, and are re-read immediately before editing: `packages/protocol/src/index.ts`, `ws.ts`, `admin.ts`, `packages/server-core/src/auth.ts`, `services/api/src/app.ts`, `services/gateway/src/gateway.ts`, `firestore.rules`, `firestore.indexes.json`, `apps/web/components/admin/AdminShell.tsx`.
- Commits are path-scoped (`git commit -- <paths>`) because Codex has uncommitted work in the same tree. Use Conventional Commits. Messages end with prose and never carry Claude or Anthropic attribution.
- UI follows `apps/web/DESIGN.md`. Use semantic CSS variables only, Baloo to name things and Nunito to explain them, Baloo Da 2 and Noto Sans Bengali for Bangla, sentence case, `UiIcon`, and no new palette.
- Every user-facing string exists in English and Bangla. Student strings go in `apps/web/lib/i18n/study/{en,bn}.ts` with their own parity test.

## Phase plans

| Phase | Plan file | Depends on | Status |
|---|---|---|---|
| S0 Foundations | `2026-10-17-schools-s0-foundations.md` | – | done (branch `feat/schools-stem`) |
| S3 Sims and chemistry models | `2026-10-17-schools-s3-sims.md` | – | done (merged into `feat/schools-stem`) |
| S1 Super admin | written when S0 lands | S0 | – |
| S2 Teacher console and student login | written when S0 lands | S0 | – |
| S4 Lessons, sim views, player | written when S0 and S3 land | S0, S3 | – |
| S5 Quizzes, chemistry AI fallback, leaderboards | written with S4 | S0, S3, S4 | – |
| S6 Tutor | written with S4 | S4 | – |
| S7 Demo seed, flows, handoffs | last | all | – |

**Changes from spec §19:**
- **Sim views move from S3 to S4.** Their surface briefs come from the impeccable pass in S4, and S3 stays a pure, UI-free package.
- **The chemistry AI fallback endpoint moves from S3 to S5.** It needs the S0 student guard and the study API module. S3 delivers `atomBalance`, which S5 uses.
- **The sim registry lives in `stem-sims`.** Each model owns its params schema and predicates, and `stem-content` maps chapters to sim ids. This keeps code out of the data package.

S0 and S3 have no shared files and can run in parallel.

## Review focus (whole programme)

1. **Students crossing boundaries:** a student reading another class's lesson or board, or another school's anything. Expect a rules denial. S0 Task 4 covers it.
2. **Forged sim answers:** a student submitting a sim-task "state" they never reached. Expect the server to grade from parameters only. S3 Task 5 and S5.
3. **PIN guessing:** expect lockout after 5 failures and the per-school limit. S2.
4. **Points farming:** expect each item to pay once across retakes. S5.
5. **Bangla input:** Bengali digits in numeric answers, and Bangla names in CSV imports. Expect them normalised and accepted. S2 and S5.

## Contract notes for later phases (from the S0 + S3 final review)

Every later phase plan must start from these notes.

**Routes and auth (S1, S2)**

- **Two routes live outside the guarded scopes.**
  - `POST /v1/school/invites/accept` is called by someone who does not have the teacher role yet. It needs its own scope that uses plain `verifyIdToken`.
  - `POST /v1/study/login` is unauthenticated and rate-limited. The `/v1/school/*` and `/v1/study/*` preHandlers from S0 must not cover either route. Spec §6 lists accept under the teacher guard, which contradicts §4.3. Follow §4.3.
- **Invite lookup.** Encode `schoolId` and `inviteId` in the invite token, so accepting needs no collection-group query on `invites.tokenHash`. Lowercase emails before comparing them.
- **Suspension blocks teacher mutations** (spec §16). The S0 teacher hook only authenticates. S2 adds a suspension check for non-GET teacher routes.
- **A super admin may name any `?schoolId`**, including one that does not exist. Handlers must handle a null `schoolId` and a missing school.

**Ids**

- Ids come only from `newId(prefix)` in server-core. Composite ids join parts with `_`: the attempt doc id `<studentId>_<lessonId>`, `studentUid`, board ids and the usage doc id. They are unambiguous only because every part has the fixed `prefix_ulid` form. Never accept client-chosen ids, and never split a composite id back into its parts.

**Lessons (S4)**

- **Firestore queries decide the indexes.** Rules are not filters.
  - A student's lesson queries must include the scope: `scope == 'school'`, or `scope == 'class'` together with `classIds array-contains <own class>`, plus `status == 'published'`.
  - Teachers can query `where schoolId == <own>`.
  - Write the indexes from the actual S4 queries, including a `classIds` array-contains index. Do not patch the S0 indexes.
- **Publish validates every answer key against its item.**
  - MCQ answer within the option count.
  - simTask predicate and args through `SIMS[simId].predicates[p].args` (`justMoves` takes `{}`).
  - labTask through `LabTaskSchema`, with min ≤ max for `pHBetween` and `angleWithin`.
  - `explore.params` through the sim's params schema.
  - `simId` in `SIM_IDS`, and `editableParams` are real param keys.
- **Derive bodies from `LessonFieldsSchema`, then apply the exported refinement.** `LessonDocSchema` carries a refinement, so it cannot be `.omit()`-ed or `.partial()`-ed.
- **Check the NCTB chapter titles against the official books before S4 stores any lesson.** Chapter ids are positional (`physics-<n>`), so a correction would renumber ids under lessons already stored.

**Grading, chemistry and leaderboards (S4, S5)**

- **Grade only through the locked entry points.** Use `checkLockedSimTask(item, submitted, task)` and `gradeLabSubmission(item, submitted, task, REAGENTS, REACTIONS)`, never `checkSimTask` with raw submitted params.
- **Chemistry display.**
  - Bench pairs missing from the 20-reaction table return `reaction: null`. Before the S5 AI fallback exists, the lab must not present that as "no reaction".
  - Give every reaction a `phAfter` in the chemistry teacher's review, and drop the lone-reagent pH fallback when a reaction matched.
  - The AI fallback goes through `isBalanced` and caps coefficients at 20 or less.
  - Views format `-0` and values below 1e-9 as `0`.
- **Leaderboards.** Students get 404, not 403, for boards and attempts that do not exist yet. The rules split `get` from `list` for this, and class boards honour `boardsVisible`. Tell Codex why when handing over the rules.
