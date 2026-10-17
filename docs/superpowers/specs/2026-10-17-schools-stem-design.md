# Just Imagine Schools: design spec

Date: 2026-10-17. Status: draft for review. Author: Claude Code with the user (two grilling rounds, 2026-10-16 and 2026-10-17).

## 1. Purpose

Just Imagine is a family product today. A parent account holds children aged 6 to 13, who build worlds in Studio and play the Learning Worlds stories. This spec adds a second product line on the same platform:

- A **super admin panel** where the operator manages families and schools and publishes global content: worlds and games, story packs, and STEM lessons.
- **Schools**: one admin teacher per school manages classes and students and assembles interactive lessons for the students.
- **Students in NCTB classes 9 and 10** (SSC science group) learn Physics, Chemistry and Mathematics through Brilliant-style simulations, a virtual chemistry lab, and a Gemini Live tutor that explains what the student is doing. They finish each topic with a quiz and can see class and school leaderboards. Everything works in Bangla and English.

Success for the hackathon demo, around 2026-11-24, is one thin vertical slice covering every role:

- the super admin creates a school and invites its teacher;
- the teacher imports a class, prints PINs and publishes a lesson in both languages;
- a student signs in with a PIN, works through a physics sim with the tutor's help, mixes reagents in the lab, passes a quiz and appears on the leaderboard.

## 2. Decisions

| # | Decision |
|---|---|
| D1 | One Next.js app. New route groups: `/school/*` for the teacher and `/study/*` for the student. The existing `/admin` console is extended. |
| D2 | Audience: NCTB classes 9 and 10, SSC science group. Subjects: Physics, Chemistry, and Mathematics (General and Higher). |
| D3 | Roles. **Super admin** is the existing `admin: true` claim. **Admin teacher** is `role: 'schoolAdmin'`. **Student** is `role: 'student'`. The `role` field allows a separate `teacher` role later without migration. |
| D4 | Students sign in with school code + username + PIN. The API mints a Firebase custom token. Teachers print PIN sheets and reset PINs. |
| D5 | Catalog plus authoring. We ship curated, tested simulations. A teacher assembles a lesson: intro, sim with chosen parameters and guiding prompts, quiz. `gemini-3.8-flash` drafts the text; the teacher edits and publishes. Prompt-to-sim generation is out of scope for this round. |
| D6 | Chemistry outcomes come from a curated reaction table. A bench pair not in the table goes to `gemini-3.8-flash` with a strict schema and an atom-balance check. The result is labelled "AI predicted" and cached. |
| D7 | Leaderboards per class and per school, weekly (week starts Sunday, Asia/Dhaka) and all-time. They show first name and avatar only. Points come from quizzes; each item pays once, on its first correct answer. |
| D8 | The demo is a thin slice across all three subjects (section 10.4). |
| D9 | The tutor is a subject persona on the existing gateway. Voice is off by default; the student starts it with Ask or types into a text box, as in Studio. |
| D10 | Design follows the system Codex built (`apps/web/DESIGN.md`, "The Theatre Built From the Mark"). The new screens extend its rooms, tokens and type and add no new palette (section 15). This replaces the earlier idea of a separate direction for students. |
| D11 | The teacher writes a lesson in one language and Gemini drafts the other. The teacher must approve both before publishing. Each student picks a language. |
| D12 | Schools are not billed. The super admin sets seats and daily voice quotas by hand. Stripe stays family-only. |
| D13 | Schools live in a separate `schools/{schoolId}` tree. The family model (`users/{uid}`, `children`) is untouched. |
| D14 | Global content the super admin publishes: worlds promoted into a catalog (or generated from the panel), story packs (form editor and JSON upload), and global STEM lessons. |
| D15 | Work happens in the same working tree as Codex. New code goes in new files; each shared file gets one anchored insertion, claimed in `CHECKPOINT.md` first. Commits are path-scoped. |
| D16 | STEM lessons are for schools only in v1. `lesson.scope` allows opening them to families later. |
| D17 | Demo sims. Physics: motion graphs (Ch 2), a cart showing Newton's second law with friction (Ch 3), an Ohm's-law circuit (Ch 11). Math: y = mx + c, the unit circle. Chemistry lab: about 20 reactions from Ch 7 (chemical reactions) and Ch 9 (acid-base balance). |
| D18 | Quiz items are MCQ, numeric with tolerance, and sim tasks (reach a target state). The server grades all of them and holds the keys. |
| D19 | Claude Code writes the gateway tutor module; Codex reviews it and every protocol addition. |
| D20 | The admin teacher accepts an email invite, then signs in with a password or Google through the existing `AuthForm`. |

## 3. Changes to earlier decisions

The 2026-10-15 design spec is changed as follows. Each change was settled in a grilling round, as `CLAUDE.md` requires.

- **§18:** "teacher or classroom mode" moves from out of scope to in scope for the school product. "Multiplayer or shared worlds" stays out of scope. Leaderboards are aggregates, not shared play.
- **§20 rows 3 and 12 (age bands):** the family bands `6-7 | 8-10 | 11-13` are unchanged. School students are described by `grade: 9 | 10`, not an age band, and never pass through `AgeBandSchema`.
- **§20 row 16 ("no typed chat"):** a school student may type to the tutor. Children in the family product keep the existing input rules.
- **§20 row 5 (Live sessions held server-side in the gateway):** unchanged. The tutor uses the same gateway, Vertex AI in `us-central1`, and `gemini-3.8-live`.
- **`CLAUDE.md`:** the opening line still says "children aged 6 to 10". It should name both product lines once this spec is approved.

## 4. Roles and authentication

### 4.1 Principals

| Principal | Firebase identity | Claims | Created by |
|---|---|---|---|
| Super admin | Existing email or Google account | `admin: true` | `pnpm admin:grant` (exists) |
| Admin teacher | Email/password or Google account | `role: 'schoolAdmin'`, `schoolId` | Invite acceptance (section 4.3) |
| Student | Custom-token user, uid `st_<schoolId>_<studentId>` | `role: 'student'`, `schoolId`, `studentId`, `classId` | `POST /v1/study/login` |

A parent account never carries `role`. A school principal never gets a `users/{uid}` document. The `/api/session` route creates `users/{uid}` only for parent sign-up, and the school sign-in pages do not call it.

### 4.2 Guards

These go in `packages/server-core/src/auth.ts` as additive exports beside `requireAdmin`. All of them verify the token with the revocation check.

- `requireSchoolAdmin(idToken, schoolId?)`: role `schoolAdmin` and a matching `schoolId`. A super admin also passes, so the operator can act inside any school.
- `requireStudent(idToken)`: role `student`. Returns `{ uid, schoolId, studentId, classId }`.
- `isSchoolSuspended(schoolId)`: reads `schools/{id}.status`. It fails closed on read errors, like `isAccountSuspended`.

### 4.3 Teacher invite

1. The super admin creates a school, then an invite: `schools/{id}/invites/{inviteId}` holding `{ email, tokenHash, expiresAt (7 days), createdBy }`.
2. The panel shows a copyable invite link, `/school/join?invite=<token>`. With an email configured, the API also asks Firebase Auth to send its email sign-in link to that address. The raw token is shown once and only its SHA-256 hash is stored.
3. The teacher opens the link and signs in or signs up through the existing `AuthForm` (password or Google). The form's parent-consent branch is skipped for this flow.
4. `POST /v1/school/invites/accept { token }` checks the hash, the expiry and that the email matches. It sets claims `{ role: 'schoolAdmin', schoolId }`, writes `schools/{id}/members/{uid}`, deletes the invite and writes an audit entry. The client refreshes its ID token.

### 4.4 Student sign-in

- The teacher creates students one at a time or by CSV (firstName, username, classId). The API generates a six-digit PIN and stores only `scrypt(pin, salt)` in `schools/{id}/studentSecrets/{studentId}`. Clients can never read that collection.
- The PIN is returned once, when the student is created or the PIN is reset. The PIN-sheet view is printable: one card per student with name, school code, username, PIN, and the `/study` URL as text and a QR code.
- `POST /v1/study/login { schoolCode, username, pin }` (unauthenticated):
  - finds the school by `code` and refuses suspended schools;
  - checks the PIN in constant time;
  - after 5 failures per username it locks that username for 15 minutes, and each school is limited to 60 failures per minute across all usernames;
  - on success it calls `createCustomToken(uid, claims)`; the browser calls `signInWithCustomToken`.
- Changing a student's class or resetting their PIN revokes their refresh tokens, so new claims take effect on the next sign-in.
- Session handling: a school principal's browser holds a Firebase Auth session and sends ID tokens to the API, as the child screens do today. No `__session` cookie is needed. `/school/*` and `/study/*` layouts guard on the client from claims; the API is the actual enforcement point.

## 5. Data model

All schemas go in a new file, `packages/protocol/src/school.ts`, exported with one line from `index.ts`. They follow the patterns of `admin.ts` and `learn.ts`: Zod 4 strict objects, a `schoolPaths` helper whose segments are checked with `DocumentIdSchema`, and `EpochMsSchema` timestamps.

| Path | Schema | Key fields | Writer |
|---|---|---|---|
| `schools/{schoolId}` | `SchoolDocSchema` | `name`, `nameBn`, `code` (6 uppercase characters, unique), `status: active\|suspended`, `seats`, `voiceSecondsPerDay`, `createdAt` | API (admin) |
| `schoolCodes/{code}` | `SchoolCodeDocSchema` | `schoolId` (makes the code unique and lets login find the school) | API |
| `schools/{id}/members/{uid}` | `SchoolMemberDocSchema` | `role: schoolAdmin`, `email`, `displayName`, `joinedAt` | API |
| `schools/{id}/invites/{inviteId}` | `SchoolInviteDocSchema` | `email`, `tokenHash`, `expiresAt`, `createdBy` | API |
| `schools/{id}/classes/{classId}` | `SchoolClassDocSchema` | `grade: 9\|10`, `section`, `name`, `createdAt` | API |
| `schools/{id}/students/{studentId}` | `StudentDocSchema` | `firstName`, `username` (unique per school), `classId`, `avatar`, `language: en\|bn`, `pointsAll`, `pointsWeek: { weekKey, points }`, `createdAt` | API |
| `schools/{id}/studentSecrets/{studentId}` | `StudentSecretDocSchema` | `pinHash`, `salt`, `failedAttempts`, `lockedUntil` | API |
| `lessons/{lessonId}` | `LessonDocSchema` | `scope: global\|school\|class`, `schoolId?`, `classIds[]`, `subject`, `grade`, `chapterRef`, `title: {en,bn}`, `steps[]`, `status: draft\|published\|archived`, `sourceLanguage`, `approved: {en,bn}`, `authorUid`, `revision`, `updatedAt` | API |
| `lessonKeys/{lessonId}` | `LessonKeysDocSchema` | answer keys per quiz item, check keys, hints | API |
| `schools/{id}/attempts/{studentId_lessonId}` | `AttemptDocSchema` | `itemResults{ itemId: {correct, firstCorrectAt, tries} }`, `pointsAwarded`, `completedAt` | API |
| `schools/{id}/boards/{boardId}` | `BoardDocSchema` | `boardId` = `class_<classId>_week_<yyyymmdd>`, `class_<classId>_all`, `school_week_<yyyymmdd>` or `school_all`; `entries[≤50]: {studentId, firstName, avatar, points}`, `updatedAt` | API |
| `schoolUsageDaily/{schoolId}_{yyyymmdd}` | `SchoolUsageDailyDocSchema` | `voiceSeconds`, `aiDrafts`, `aiReactions` | Gateway, API |
| `catalog/{entryId}` | `CatalogEntryDocSchema` | `kind: world\|storyPack`, `status: draft\|published\|retired`, `title: {en,bn}`, `ageBands[]`, `worldId?` / `pack?`, `publishedBy`, `publishedAt` | API (admin) |
| `aiReactions/{pairHash}` | `AiReactionDocSchema` | the cached `ReactionResult` plus `model`, `createdAt` | API |

The admin audit `target.kind` enum gains `school`, `catalog` and `lesson`. `AdminAuditActionSchema` gains `school.create`, `school.update`, `school.suspend`, `school.invite`, `catalog.publish`, `catalog.retire`, `lesson.publish` and `lesson.archive`.

**Rules.** These blocks are appended to `firestore.rules`. Client writes stay denied everywhere.

- `schools/{id}` and its classes and students: readable by members of that school (claim `schoolId == id`, role `schoolAdmin`).
- A student can read their own student doc and their school's doc.
- `boards`: readable by a student whose claim `schoolId` matches. A class board also needs `classId` to match. Teachers of the school can read all boards.
- `lessons`: readable when `status == 'published'` and the reader's claims match the scope:
  - `global` for any school principal;
  - `school` when `schoolId` matches;
  - `class` when `schoolId` matches and `classIds` contains the claim's `classId`.
  - Teachers can also read drafts in their own school.
- `lessonKeys`, `studentSecrets`, `invites`, `schoolCodes`, `aiReactions`, `catalog` drafts: `allow read, write: if false`.
- Published `catalog` entries are readable by any signed-in parent. Family gallery wiring is a Codex handoff (section 17).

**Indexes.** `lessons(scope, schoolId, status, subject, grade)`, `lessons(schoolId, classIds array-contains, status)`, `students(classId, firstName)`.

## 6. API surface

New route modules are registered with one line each in `services/api/src/app.ts`, following `registerAdminRoutes`. Each module gets its own store class and does not use the parent `store.ts`, so the `consentAt` and deletion-lock checks that apply to parents never apply to school principals. Request and response schemas live in `school.ts`, with route tables `SCHOOL_ROUTES`, `STUDY_ROUTES` and `ADMIN_SCHOOL_ROUTES`.

**Super admin** (`services/api/src/admin-schools.ts`, `admin-catalog.ts`, `admin-lessons.ts`; `requireAdmin`; every mutation is audited with a reason):

- `GET|POST /v1/admin/schools`, `GET|PATCH /v1/admin/schools/:schoolId` (name, seats, voice quota, status).
- `POST /v1/admin/schools/:schoolId/invites`, `DELETE /v1/admin/schools/:schoolId/invites/:inviteId`.
- `GET /v1/admin/catalog`, `POST /v1/admin/catalog/worlds { worldId }` (promote), `POST /v1/admin/catalog/worlds/generate { prompt, ageBand }` (S1 stretch, section 7), `POST /v1/admin/catalog/packs` (JSON upload validated by the `learning-content` pack schema), `PATCH /v1/admin/catalog/:entryId` (editor saves, publish, retire).
- `GET|POST|PATCH /v1/admin/lessons` for global lessons. Same body shapes as the teacher's lesson routes, with `scope: 'global'`.

**Teacher** (`services/api/src/school/*.ts`; `requireSchoolAdmin`):

- `POST /v1/school/invites/accept`, `GET /v1/school/me`.
- `GET|POST|PATCH|DELETE /v1/school/classes`.
- `GET|POST /v1/school/students`, `POST /v1/school/students/import` (CSV; returns PINs once), `PATCH /v1/school/students/:id`, `POST /v1/school/students/:id/reset-pin`, `DELETE /v1/school/students/:id`. Seats are enforced on create and import.
- `GET|POST|PATCH /v1/school/lessons`, `POST /v1/school/lessons/:id/draft` (AI drafting), `POST /v1/school/lessons/:id/translate`, `POST /v1/school/lessons/:id/approve { language }`, `POST /v1/school/lessons/:id/publish`, `POST /v1/school/lessons/:id/copy` (copy a global lesson into the school).
- `GET /v1/school/results?classId&lessonId` (per-student item results; never transcripts).

**Student** (`services/api/src/school/study.ts`; `requireStudent` except login):

- `POST /v1/study/login`.
- `POST /v1/study/lessons/:id/check { itemId, answer }` (in-lesson check; graded but pays no points), `POST /v1/study/lessons/:id/quiz { answers[] }` (graded; pays points; updates boards).
- `POST /v1/study/react { reagents[], conditions }` (chemistry fallback, section 10.3).
- Lessons and boards are read directly from Firestore under the rules, so they update live. Nothing in the school product travels over the WebSocket except the tutor's audio, captions and the observation data in section 14.

## 7. Super admin panel

The panel extends the console in `apps/web/app/admin/(console)` and `components/admin/*`. It keeps `AdminShell`, the admin parts, `admin.css` and the appearance-aware tokens.

- **Families** (exists). Unchanged.
- **Schools** (new):
  - a table of name, code, status, seats used and total, teachers, students, and voice minutes today;
  - Create school (name in English and Bangla; the code is generated);
  - a school drawer with seats and quota fields, Suspend/Reinstate with a reason, the invite list, and Invite teacher (shows the link once).
- **Catalog** (new): tabs for Worlds and Story packs.
  - **Worlds**: promote a world by id from the existing world list, see its thumbnail and title, publish or retire. Generate from a prompt (stretch): the panel enqueues a builder job owned by a dedicated system principal (`uid: 'catalog'`, `childId: 'catalog'`). This needs a small builder change, so it is listed as a Codex handoff and is the first thing cut if time is short.
  - **Story packs**: upload JSON (validated, with errors listed by path) or edit in a form (pack meta, chapters, facts, challenges with answer key and points, characters, all bilingual), then publish or retire. Published packs are stored in `catalog`. Merging them into the child Learn area and the gateway persona is a Codex handoff.
- **Lessons** (new): the same lesson editor teachers use (section 11), with scope fixed to `global`.
- **Overview** (exists): gains school counts and school voice minutes.

The privacy rule from quality spec §9b extends to schools. The super admin sees school names, teacher emails and student counts. Student names are visible only inside a school drawer, for support, and transcripts are never stored or shown.

## 8. Teacher console (`/school/*`)

These are parent-room screens (section 15):

- **Sign-in and join**: `AuthForm` in teacher mode.
- **Home**: classes, recent lesson activity, quick links.
- **Classes**: create, rename, delete when empty. Each class has a roster and a board.
- **Students**: add one, CSV import with a preview and row errors, edit, move class, reset PIN, remove; print PIN sheet. The seat counter shows used and total.
- **Lessons**: the library has School and Global tabs, filtered by subject, grade and chapter. A global lesson can be copied into the school. Create opens the editor (section 11). Publish asks for a scope (whole school or chosen classes).
- **Results**: per class and lesson, completion and per-item correctness, first-try rate, and who has not started.
- **Leaderboard**: the same component students see, plus the class picker.

## 9. Student experience (`/study/*`)

- **Sign-in**: school code, username and PIN on large keypad fields. Language toggle (English / বাংলা).
- **Home**: the three subjects, each opening Grade → Chapter → Lesson cards showing progress and points. A "This week" strip shows the student's points and class rank.
- **Lesson player**, a sequence of steps:
  - **Intro**: short text with an optional diagram.
  - **Explore**: the sim fills the stage. Its parameter controls sit beside it, never over it, matching Studio's lab placement rule. Teacher prompts appear as cards ("Make the cart just start moving. What force did you need?"), and the tutor dock is always reachable.
  - **Check**: an ungraded in-lesson question with instant feedback.
  - **Quiz**: graded items. A results screen shows correct answers with explanations and the points earned.
- **Chemistry lab**, a lesson step or an open lab from the Chemistry home:
  - a bench of reagent bottles and solid jars, a beaker, a burner, indicator droppers and a pH meter;
  - the student drags reagents into the beaker and can heat it;
  - the result shows the visual change, the balanced equation, the products and observations. AI-predicted results carry a visible label.
- **Leaderboard**: class and school tabs, This week and All time. The student's own row is pinned.

## 10. STEM content and simulations

### 10.1 Packages

- **`packages/stem-content`** (new): data only.
  - The NCTB taxonomy: subjects, grades and chapters with bilingual titles.
  - The sim registry: id, subject, chapters, a Zod `params` schema with ranges and units, an `observable` state schema, and named task predicates with typed arguments.
  - The reagent table and reaction table.
  - The seed global lessons.
- **`packages/stem-sims`** (new): pure, deterministic TypeScript models with no DOM. Each model exposes `init(params)`, `step(state, dt)` or a closed-form `at(t)`, `observe(state)` and `predicates`.
  - Models are exact analytic physics, not Rapier. The game runtime has no graph or text drawing, forces or joints, and its stage and prompts are built for young children. Exact formulas also make server re-checking possible.
  - The same package runs in the browser and in the API. The API re-runs a model to verify a sim-task answer (section 12), so a student cannot claim a target state they did not reach.
- **Views**: `apps/web/components/stem/*`, using React with SVG for graphs and controls and Canvas where motion needs it. Views follow the design system (section 15).

### 10.2 Demo sims

| Sim id | Subject, NCTB chapter | Params | Observable | Task predicates |
|---|---|---|---|---|
| `motion-graphs` | Physics Ch 2, Motion | initial velocity 0–20 m/s, acceleration −5 to 5 m/s², duration 2–20 s | t, x, v; x–t and v–t plots | `stopsAt(x, tol)`, `reachesSpeed(v, tol)`, `areaUnderVtEquals(d)` |
| `newton-cart` | Physics Ch 3, Force | mass 0.5–10 kg, applied force 0–60 N, μs 0–0.8, μk 0–0.8 | a, v, x, friction force, net force vectors | `justMoves()` (force within 2% of μs·m·g), `accelerationEquals(a, tol)` |
| `ohms-circuit` | Physics Ch 11, Current electricity | EMF 1.5–12 V; up to 3 resistors 1–100 Ω in series or parallel; ammeter and voltmeter positions | I, V across each element, P per bulb, bulb brightness | `currentEquals(I, tol)`, `powerAtLeast(element, P)` |
| `linear-graph` | General Math (graphs of linear equations); Higher Math coordinate geometry | m −10 to 10, c −10 to 10, or two draggable points | line, slope triangle, intercepts | `lineThrough(points)`, `slopeEquals(m)`, `interceptEquals(c)` |
| `unit-circle` | General Math trigonometric ratios; Higher Math trigonometry | angle 0–360° (drag) | sin, cos, tan projections; sine/cosine traces | `angleWithin(range)`, `sinEquals(v, tol)` |
| `chem-lab` | Chemistry Ch 7, Chemical reactions; Ch 9, Acid-base balance | bench reagent set; volumes and concentrations; heat on/off; indicator | beaker contents, colour, pH, gas, precipitate, temperature change, equation | `solutionColour(c)`, `pHBetween(a, b)`, `producedGas(g)`, `formedPrecipitate(p)` |

The chapter numbers match the 2012-curriculum SSC books used for the 2026 exams (Physics: Ch 2 Motion, Ch 3 Force, Ch 11 Current electricity; Chemistry: Ch 7 Chemical reactions, Ch 9 Acid-base balance). They were checked against secondary sources, because `nctb.gov.bd` could not be fetched (TLS error). S3 starts by confirming the chapter titles against the official NCTB books, and the Math chapter references are set at that point.

### 10.3 Chemistry lab

**Reaction table** (`stem-content`), about 20 entries. A teacher with chemistry training reviews it before the demo.

| Group | Reactions |
|---|---|
| Neutralisation | HCl + NaOH; H₂SO₄ + NaOH; HCl + KOH |
| Metal + acid → H₂ | Zn + HCl; Mg + HCl; Fe + dilute H₂SO₄ |
| Carbonate + acid → CO₂ | CaCO₃ + HCl; Na₂CO₃ + HCl; NaHCO₃ + HCl |
| Precipitation | AgNO₃ + NaCl (white AgCl); BaCl₂ + Na₂SO₄ (white BaSO₄); CuSO₄ + NaOH (blue Cu(OH)₂); FeCl₃ + NaOH (red-brown Fe(OH)₃) |
| Displacement | Fe + CuSO₄ (blue to green, copper deposit); Zn + CuSO₄ |
| Combination, exothermic | CaO + H₂O → Ca(OH)₂ |
| Limewater test | CO₂ + Ca(OH)₂ (milky CaCO₃) |
| Catalysed decomposition | 2H₂O₂ → 2H₂O + O₂ with MnO₂ |
| Thermal decomposition | CuCO₃ → CuO + CO₂ (heat) |
| Indicators | litmus, phenolphthalein and methyl orange colour by pH band |

**ReactionResult schema:** `{ equation, products[{formula, state, nameEn, nameBn}], observations{ colourTo?, gas?, precipitate?, tempChange: up|down|none }, source: 'table'|'ai', explanation{en,bn} }`.

**Lookup:** the key is the unordered reagent set plus conditions (`heat`, `catalyst`).

**AI fallback** (`POST /v1/study/react`):

1. The student can only choose reagents on the bench, which is a closed list in `stem-content`. Free-text chemicals are impossible, so the model only ever sees combinations of known school reagents.
2. The cache `aiReactions/{sha256(sorted reagents + conditions)}` is checked first.
3. Otherwise the API calls `gemini-3.8-flash` with a JSON schema and a school-chemistry system prompt. The prompt refuses to give hazardous procedures and answers "no observable reaction" when that is the truth.
4. The response is parsed with Zod. `atomBalance(equation)` in `stem-sims` (formula parser with groups and hydrates) must show every element balanced. Each reactant must be one of the chosen reagents, and the observation flags must match the products (a gas product implies `gas`, a solid product implies `precipitate`). Any failure returns "no reaction we can show yet" and nothing is cached.
5. A valid result is cached, counted in `schoolUsageDaily.aiReactions`, and returned with `source: 'ai'`. The UI labels it "AI predicted".

### 10.4 Demo slice

- **Global lessons (7):** one each for motion graphs, Newton's cart, Ohm's circuit, the linear graph and the unit circle, plus two chemistry lessons (acids, bases and indicators; metals, carbonates and precipitates). Each has intro, explore, check and a 5-item quiz.
- **Demo school:** "Dhaka Demo High School", classes 9-A and 10-A, 30 students, one teacher, seeded by `scripts/seed-schools.mjs` in the emulator and on staging. The demo family (`parent@justimagine.test`, Ari) stays untouched.

## 11. Lessons and authoring

**Lesson step union (`LessonStepSchema`):**

- `intro { body: {en,bn}, diagram? }`
- `explore { simId, params (validated by that sim's schema), lockedParams[], prompts[{en,bn}] }`
- `check { item }`
- `quiz { items[] }`
- `lab { reagentSet[], goal?: {en,bn} }`

**Quiz item union (`QuizItemSchema`):** answer keys never appear in `lessons/{id}`; they live in `lessonKeys/{id}`.

- `mcq { prompt, options[2..5] }`
- `numeric { prompt, unit }` (key: value plus absolute or relative tolerance)
- `simTask { prompt, simId, startParams, editableParams[] }` (key: predicate id plus arguments)
- Each item carries `points 1..10` and up to 2 hints `{en,bn}`. The hints live in the keys document and are released on request.

**Editor flow:**

1. Pick subject, grade and chapter (from the taxonomy).
2. Add steps. An explore step picks a sim from those registered for that chapter, then sets its parameters on a live preview and chooses which ones to lock.
3. **Draft with AI.** `POST /draft` sends the chapter, the sim's description, its param ranges and the teacher's notes to `gemini-3.8-flash` and gets back a schema-checked intro, prompts and quiz items with keys and hints. Sim-task drafts may only use that sim's registered predicates. Numeric keys for sim-related items are recomputed by the model package before they are shown. The teacher edits everything.
4. **Translate.** `POST /translate` drafts the other language for every text field. Bangla uses NCTB terminology (for example ত্বরণ, ঘর্ষণ, রোধ).
5. **Approve each language**, then publish with a scope. Publishing increments `revision`. Attempts record the revision they were taken against.

**Validation:** publishing is refused unless every text field exists in both languages, both languages are approved, every step validates, and every quiz item has a key. Model output is data. It is never executed and never written without the teacher's save.

## 12. Quizzes and grading

- **MCQ:** the submitted index is compared with the key.
- **Numeric:** the value is parsed; Bengali digits are accepted and normalised with the existing helper in `learning-content`. It is compared within tolerance.
- **Sim task:** the client submits the final parameters only. The API runs the `stem-sims` model from those parameters and evaluates the predicate. Client-reported state is ignored.
- **Points:** an item pays its points only the first time it is answered correctly. Students may retake a quiz to learn, but a retake never pays again. The same transaction:
  - writes the attempt;
  - updates `student.pointsAll` and `pointsWeek`;
  - updates the four board docs (class week, class all-time, school week, school all-time). Each board keeps the top 50 entries, sorted, and is rewritten whole.
  - Class boards have at most about 60 writers, which is within Firestore's transaction rate. School boards can be sharded later if a school grows past demo scale.
- **Week key:** the date of the most recent Sunday in Asia/Dhaka, as `yyyymmdd`. When a new week starts, `pointsWeek` resets on the student's next award, and the new week's board document starts empty.

## 13. Leaderboards

- Entries hold `firstName`, `avatar` and `points` only. There is no cross-school board (D7).
- Ties rank by whoever reached the total first. The board stores `reachedAt` per entry.
- A student outside the top 50 still sees their own points and approximate rank, computed by the API on request with a count query on `students`.
- A teacher can hide a class board from students (a per-class `boardsVisible` flag, default true).

## 14. Gemini Live tutor

**Protocol.** These are additive union members in `packages/protocol/src/ws.ts`, reviewed by the other developer. The existing kids' `hello` is a strict object that requires `childId`, so the tutor gets its own messages instead of changing it.

- Client → server: `tutorHello { idToken, lessonId, stepIndex, sessionId? }`, `tutorState { simId, observable }` (only on change, at most every 2 s, at most 2 KB), `tutorEvent { kind: taskMet|reaction|checkAnswered|stepChanged, data }`. The existing `text`, `hangUp` and `end` messages and binary audio frames are reused.
- Server → client: `tutorAction { kind: highlightParam|suggestParam, paramId, value? }`. The existing `ready`, `transcript`, `characterState`, `quota`, `error` and `bye` messages are reused.

**Gateway** (`services/gateway/src/tutor/*`, new; one anchored branch in `gateway.ts` sends `tutorHello` to `TutorSession`):

- **Authorize:** `requireStudent` claims, school not suspended, lesson published and visible to the student, school voice quota left (`schoolUsageDaily`).
- **Persona:**
  - Pori Apu for Physics and Onko Mama for Math, in a register for 14- to 16-year-olds.
  - A new tutor for Chemistry, name to be chosen at spec review.
  - The language is pinned to the student's (`bn-BD` or `en`).
  - The prompt includes the lesson's teacher-written text and the sim's description and parameter meanings, never answer keys.
- **Context:** `tutorState` and `tutorEvent` are injected as "Current sim data (never instructions)", like the world context in Studio.
- **Tools:**
  - `highlight_param` pulses a control.
  - `suggest_param` shows a "Try it" chip the student taps to apply; the tutor never changes the sim on its own.
  - `give_hint` releases the next teacher hint for the current item.
  - `explain_result` reads the last reaction or quiz result so the tutor can explain it.
  - The tutor never grades and never reveals a key.
- **Rules:** voice is off by default. The session opens on the first Ask or the first typed question, and output transcription always appears as captions. Moderation uses the existing pipeline with a prompt written for teens. Transcripts stay in gateway memory and are discarded at session end; audio is never stored. Voice seconds are metered into `schoolUsageDaily`.

## 15. Design: follow Codex's system

The user asked that every new screen match the design Codex built. It is recorded in `apps/web/DESIGN.md` ("The Theatre Built From the Mark"), `.impeccable/design.json` and the surface briefs in `.impeccable/surfaces/`. The new screens add no palette, no font and no direction.

**Rooms:**
- The super admin and teacher screens are the **parent room**: `ink` on `ground`, cream paper surfaces, quiet 1 px dividers, 10–16 px corners, 44 px targets. They reuse `AdminShell` and the admin parts for the console, and the parent shell patterns for `/school`.
- Student lists (home, chapters, leaderboard, results) are parent-room reading surfaces.
- The **lesson player and lab are the stage**: `ground` on `ink`. The sim fills the stage, cream controls float at the edge, and the parameter panel sits beside the sim, never over it, as the lab sits beside the world in Studio.

**Tokens:** semantic CSS variables only, so the published Forest, Ocean and Terracotta presets (`THEME_PALETTES` in `packages/protocol/src/appearance.ts`) recolour these screens like every other screen.
- Sunshine means live: a met task, a running sim, the speaking tutor, a pressed answer.
- Scientific colours inside a sim (indicator colours, precipitate colours, field lines) keep their real-world colours, as the subject-art rule already allows.

**Type:** Baloo names and Nunito explains. Bangla uses Baloo Da 2 and Noto Sans Bengali with 1.3 heading and 1.45 note leading. Labels are sentence case and never uppercase. Equations use Nunito with tabular figures. Subscripts are real `<sub>` elements, so chemical formulas read correctly in both languages.

**Characters:** the tutors use the shared registered pose presentation (the Tooth Town acting standard) in the existing square slot. A new Chemistry tutor must be produced at the same craft level before it ships.

**Icons:** `UiIcon` (24 px view box, 1.9 px rounded stroke). No emoji or glyph fonts in chrome.

**Process:** run the `impeccable` skill against this system (not a new direction) to write surface briefs for `admin-schools`, `school-console`, `study-home`, `lesson-player` and `chem-lab` before building them. Audit and polish each surface before calling it done. Teen register is a matter of copy, density and target sizes (44 px controls, 52 px stage pills), not a different look.

## 16. Privacy, safety, quotas

- Student profiles hold first name, username, avatar, class and language. There is no email, birth date or photo.
- No raw audio is stored. Transcripts exist only in gateway memory. Teacher results show answers and correctness, never conversation.
- Leaderboards are scoped to class and school and show first name and avatar only.
- Every AI output (drafts, translations, reactions) is checked against a schema before use. Drafts reach students only after a teacher saves and approves them.
- Quotas per school: voice seconds per day (set by the super admin), AI drafts per day (default 200) and AI reactions per day (default 500). The kill switch (`config/runtime.killSwitch`) also stops tutor sessions and AI calls.
- Suspending a school blocks student login, tutor sessions and teacher mutations, and teachers can still read. Deleting a school is a scripted operator action this round, not a panel button.

## 17. Ownership, coordination and handoffs

**Claude Code owns (new files):**
- `packages/protocol/src/school.ts`
- `packages/stem-content/**`, `packages/stem-sims/**`
- `services/api/src/school/**`, `services/api/src/admin-{schools,catalog,lessons}.ts`
- `services/gateway/src/tutor/**`
- `apps/web/app/(school)/**`, `apps/web/app/(study)/**`, `apps/web/components/{school,study,stem}/**`
- the new admin pages and panels
- `apps/web/lib/i18n/study/{en,bn}.ts` (its own parity test)
- `scripts/seed-schools.mjs`, and the tests beside each of these

**Anchored single insertions.** Each is claimed in `CHECKPOINT.md` before editing, and the file is re-read immediately before.

| File | Insertion |
|---|---|
| `packages/protocol/src/index.ts` | one export line |
| `packages/protocol/src/ws.ts` | three client and one server union members |
| `packages/protocol/src/admin.ts` | audit enum values |
| `packages/server-core/src/auth.ts` | three guards |
| `services/api/src/app.ts` | four `register*Routes` lines |
| `services/gateway/src/gateway.ts` | one `tutorHello` branch |
| `firestore.rules`, `firestore.indexes.json` | appended blocks |
| `apps/web/components/admin/AdminShell.tsx` | three nav entries |

**Handoffs to Codex** (Codex-owned files):
1. Show published `catalog` worlds in the family gallery and Studio.
2. Merge published `catalog` story packs into the child Learn area and the gateway's learn persona.
3. The builder's system-owner path for catalog generation (D14 stretch).
4. Review the `ws.ts`, `admin.ts` and `gateway.ts` insertions.

## 18. Testing and acceptance

- **Unit (vitest):**
  - every `stem-sims` model against hand-computed values;
  - `atomBalance` against balanced, unbalanced, hydrate and bracketed cases;
  - every reaction-table entry's equation balances;
  - schema round-trips;
  - week-key arithmetic around Saturday and Sunday midnight in Dhaka;
  - grading for each item type, including sim-task re-checks with forged state.
- **API under the Firebase emulators:**
  - login lockout and rate limit;
  - invite accept with an expired or wrong-email token;
  - seat enforcement;
  - a student can't read another class's lesson or board (rules tests);
  - points pay once per item;
  - board top-50 ordering and tie-break;
  - every admin mutation writes an audit entry.
- **Gateway:** the tutor never receives keys; `suggest_param` never mutates without the client tapping; quota stop; transcripts are dropped at session end.
- **Playwright flows:** super admin creates a school and invites; teacher joins, imports a CSV and prints PINs; teacher authors, translates and publishes; student logs in, plays the cart sim, passes the quiz and sees the board; student mixes HCl + NaOH with phenolphthalein; a Bangla run of the student flow. Viewports are a 1280×800 laptop, an 1180×820 iPad landscape and a phone.
- **Design:** an impeccable audit and polish per surface, with captures in all three presets.

## 19. Phases

| Phase | Scope | Exit |
|---|---|---|
| S0 Foundations | `school.ts`, guards, rules, indexes, API module skeletons, emulator tests | rules and guard tests green |
| S1 Super admin | Schools, invites, Catalog (promote, pack editor and upload), global lessons list | Playwright: create school and invite; publish a pack |
| S2 Teacher console | join, classes, roster and CSV, PIN sheet and reset, student login | Playwright: teacher join to student login |
| S3 Content and sims | taxonomy (official chapter check), 5 sim models + views, reagent and reaction table, mixer, AI fallback | model tests and chemistry tests green; sims render in the three presets |
| S4 Lessons | surface briefs (impeccable), editor, AI draft and translate, approve and publish, student home and lesson player | a lesson authored in English, published in both languages, played in Bangla |
| S5 Quizzes and boards | grading, attempts, points, boards, results page | points-once and board tests; Playwright: quiz to board |
| S6 Tutor | protocol members, gateway tutor module, web tutor dock | a real Live session explains the cart sim in Bangla and English |
| S7 Demo | seed school, seven global lessons, full flows, Codex handoffs, checkpoint | all school Playwright flows green on staging data |

S3 does not depend on S1 or S2 and can run in parallel with them. S6 needs S4's lesson player.

## 20. To confirm at spec review

1. The Chemistry tutor's name and look. The default proposal is a new guide drawn to the Tooth Town standard; alternatively Pori Apu covers both Physics and Chemistry.
2. Whether invite emails are actually sent (needs Firebase email-link configuration on the project) or the copyable link is enough for the demo.
3. Who reviews the reaction table and the Bangla terminology: a chemistry or science teacher the team can reach.

## Sources

- SSC physics chapter list: [neonbati.com](https://neonbati.com/education/ssc/ssc-physics-5/), [aparsclassroom](http://ssc25.aparsclassroom.com/Physics), [abswer.com physics guide](https://abswer.com/ssc-class-9-10-physics-guide-book/)
- SSC chemistry chapters: [Cantonment Public School syllabus 2025](https://cpscs.edu.bd/wp-content/uploads/2025/03/Ten-English-Version-Syllabus-2025.pdf), [abswer.com EV chemistry guide](https://www.abswer.com/2025/02/ev-class-9-10-chemistry-guide-ssc.html)
- 2026 SSC short syllabus and group return: [bdnews24](https://bdnews24.com/education/5b17d23b6b8e), [TBS News](https://www.tbsnews.net/node/1034146), [aloghor.com](https://aloghor.com/ssc-2026-syllabus/)
- Brilliant lesson model: [Brilliant lessons (official Notion)](https://brilliantorg.notion.site/About-Brilliant-lessons-f90ec481d92c4f0fb28c5f5d346db90d), [skillscouter review](https://skillscouter.com/brilliant-review-math-science-coding/)
- Reference sims and labs: [PhET](https://phet.colorado.edu/en/search?q=G), [ChemCollective virtual lab](https://chemcollective.org/assets/modules/about_us/pdf/research/bcce04-vlab.pdf)
