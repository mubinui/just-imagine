# Schools S0: foundations implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Put the school product's shared contracts in place. That means:

- the `school.ts` protocol: claims, documents, the lesson and quiz contract, paths, the week key and board ids;
- the admin audit enums;
- the server-core role guards;
- Firestore rules and indexes;
- an API module that authenticates teachers and students.

**Architecture:**

- **Claims carry identity.** A teacher holds `role: 'schoolAdmin'` and `schoolId`. A student holds `role`, `schoolId`, `studentId` and `classId`. The existing `admin: true` stays the super admin.
- **Rules enforce reads.** Firestore rules check those claims for every client read; every write stays server-only.
- **The API checks the same claims.** A new route module guards teacher and student requests, encapsulated so the parent and admin routes are unaffected.
- **Shared files get one anchored insertion each.**

**Tech stack:** TypeScript strict ESM, Zod 4, Fastify 5, firebase-admin 13, Firestore and Auth emulators, vitest 3.

**Spec:** `docs/superpowers/specs/2026-10-17-schools-stem-design.md` (§4, §5, §6, §17). Master plan: `docs/superpowers/plans/2026-10-17-schools-stem-master.md`.

## Global constraints

- Run pnpm as `npx -y pnpm@10.34.7` when `pnpm` is not on PATH.
- Tests go in `test/` beside `src/`, named `<unit>.test.ts`. Firestore-backed tests are named `*.integration.test.ts` under `services/api`.
- **Never stop or restart the running demo emulators (8080/9099).** Emulator tests run through `scripts/test-emulators-for.mjs` (Task 3) on 8085/9095.
- **Shared files with Codex's uncommitted hunks.** `packages/protocol/src/index.ts` and `services/api/src/app.ts` currently carry uncommitted edits by Codex. Commit **only your insertion** in them:
  1. Run `git show HEAD:<path> > "$SCRATCH/<name>"`.
  2. Apply the identical insertion to that copy.
  3. Stage the copy as `<path>` with `git update-index --cacheinfo 100644,$(git hash-object -w "$SCRATCH/<name>"),<path>`.
  4. Run plain `git commit` (no `--` paths). The working-tree file keeps Codex's hunks plus yours.

  Before staging, confirm `git diff --cached --stat` is empty. `$SCRATCH` is the session scratchpad directory.
- Re-read each shared file immediately before editing it, and claim it in `CHECKPOINT.md` first (the claim is already recorded in the 2026-10-17 Schools note).
- `firestore.rules`, `firestore.indexes.json`, `packages/protocol/src/admin.ts` and `packages/server-core/src/auth.ts` are clean at HEAD `ca5ef86`. Path-scoped commits are fine for them, but run `git diff -- <path>` first. If Codex has edited one since, use the staging procedure above.
- Zod: `z.object` for Firestore documents (tolerant of unknown fields), `z.strictObject` for request bodies and authored lesson content.
- Use Conventional Commits. Messages end with prose and never carry Claude or Anthropic attribution.

## Review focus

1. **A student reads another class's lesson or board, or anything in another school.** Expect 403 from the rules. Task 4 pins it.
2. **Token claims alone forge a student.** For example `role: 'student'` set on an arbitrary uid. Expect `requireStudent` to refuse unless the uid is `studentUid(schoolId, studentId)`. Task 3 pins it.
3. **A teacher sends `?schoolId=<another school>`.** Expect 403. A super admin may act in any school. Task 3 and Task 5 pin it.
4. **The school document is missing or unreadable.** Expect `isSchoolSuspended` to fail closed (`true`). Task 3 pins it.
5. **A week rolls over at Dhaka midnight, not UTC midnight.** Saturday 23:59 and Sunday 00:00 Asia/Dhaka fall in different weeks. Task 1 pins it.

---

### Task 1: `packages/protocol/src/school.ts`, the school contract

**Files:**

- Create: `packages/protocol/src/school.ts`
- Modify: `packages/protocol/src/index.ts` (one line, `export * from './school';`, after `export * from './admin';`; staged with the procedure in Global constraints)
- Test: `packages/protocol/test/school.test.ts`

**Interfaces:**

- Consumes: `AvatarSchema`, `LanguageSchema` (`./firestore`); `AgeBandSchema` (`./bands`); `DateKeySchema`, `DocumentIdSchema`, `EpochMsSchema` (`./primitives`).
- Produces, used by S1–S6:
  - **Claims:** `SchoolClaimsSchema`, `SchoolClaims`, `schoolClaimsOf(token)`, `studentUid(schoolId, studentId)`.
  - **Identifiers:** `SchoolCodeSchema`, `StudentUsernameSchema`, `StudentPinSchema`, `SchoolGradeSchema`, `SchoolSubjectSchema`, `BilingualTextSchema`.
  - **Documents:** `SchoolDocSchema`, `SchoolCodeDocSchema`, `SchoolMemberDocSchema`, `SchoolInviteDocSchema`, `SchoolClassDocSchema`, `StudentDocSchema`, `StudentSecretDocSchema`, `LessonDocSchema`, `LessonKeysDocSchema`, `AttemptDocSchema`, `BoardDocSchema`, `SchoolUsageDailyDocSchema`, `CatalogEntryDocSchema`.
  - **Lesson parts:** `QuizItemSchema`, `QuizKeySchema`, `LessonStepSchema`, `missingLanguages(lesson)`.
  - **Leaderboards:** `weekKeyDhaka(epochMs)`, `boardId(ref, period)`.
  - **Paths:** `schoolPaths`.
  - **Routes:** `SCHOOL_ROUTES`, `STUDY_ROUTES`, `SchoolMeResponseSchema`, `StudyMeResponseSchema`.

- [ ] **Step 1: Write the failing test**

`packages/protocol/test/school.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  boardId,
  LessonDocSchema,
  missingLanguages,
  SchoolCodeSchema,
  schoolClaimsOf,
  schoolPaths,
  StudentUsernameSchema,
  studentUid,
  weekKeyDhaka,
  type LessonDoc,
} from '../src/school';

const text = (en: string, bn: string) => ({ en, bn });
const lesson = (overrides: Partial<LessonDoc> = {}): LessonDoc => ({
  scope: 'school',
  schoolId: 's1',
  classIds: [],
  subject: 'physics',
  grade: 9,
  chapterId: 'physics-3',
  title: text('Friction', 'ঘর্ষণ'),
  steps: [
    { kind: 'intro', body: text('Push the cart.', 'গাড়িটি ঠেলো।') },
    {
      kind: 'quiz',
      items: [
        {
          id: 'q1',
          kind: 'mcq',
          prompt: text('Which force opposes motion?', 'কোন বল গতির বিরোধিতা করে?'),
          options: [text('Friction', 'ঘর্ষণ'), text('Gravity', 'অভিকর্ষ')],
          points: 2,
        },
      ],
    },
  ],
  status: 'draft',
  sourceLanguage: 'en',
  approved: { en: true, bn: false },
  authorUid: 't1',
  revision: 0,
  updatedAt: 1,
  ...overrides,
});

describe('school claims', () => {
  it('reads teacher and student claims and ignores everything else', () => {
    expect(schoolClaimsOf({ role: 'schoolAdmin', schoolId: 's1', email: 'x' })).toEqual({
      role: 'schoolAdmin',
      schoolId: 's1',
    });
    expect(
      schoolClaimsOf({ role: 'student', schoolId: 's1', studentId: 'p1', classId: 'c1' }),
    ).toEqual({ role: 'student', schoolId: 's1', studentId: 'p1', classId: 'c1' });
    expect(schoolClaimsOf({ role: 'student', schoolId: 's1', studentId: 'p1' })).toBeNull();
    expect(schoolClaimsOf({ admin: true })).toBeNull();
    expect(schoolClaimsOf(null)).toBeNull();
    expect(studentUid('s1', 'p1')).toBe('st_s1_p1');
  });
});

describe('identifiers', () => {
  it('normalises school codes and usernames and rejects look-alike characters', () => {
    expect(SchoolCodeSchema.parse(' ab2c3d ')).toBe('AB2C3D');
    expect(SchoolCodeSchema.safeParse('AB0C1D').success).toBe(false);
    expect(StudentUsernameSchema.parse(' Rahim.9a ')).toBe('rahim.9a');
    expect(StudentUsernameSchema.safeParse('ab').success).toBe(false);
  });
});

describe('weekKeyDhaka', () => {
  it('starts weeks on Sunday at Dhaka midnight', () => {
    // Saturday 2026-10-17 23:59 in Dhaka is 17:59 UTC.
    expect(weekKeyDhaka(Date.UTC(2026, 9, 17, 17, 59))).toBe('20261011');
    // Sunday 2026-10-18 00:00 in Dhaka is 18:00 UTC on the 17th.
    expect(weekKeyDhaka(Date.UTC(2026, 9, 17, 18, 0))).toBe('20261018');
    expect(weekKeyDhaka(Date.UTC(2026, 9, 24, 17, 59))).toBe('20261018');
  });

  it('builds board ids', () => {
    expect(boardId({ scope: 'class', classId: 'c1' }, { weekKey: '20261018' })).toBe(
      'class_c1_week_20261018',
    );
    expect(boardId({ scope: 'school' }, 'all')).toBe('school_all');
    expect(() => boardId({ scope: 'school' }, { weekKey: '2026-10-18' })).toThrow();
  });
});

describe('paths', () => {
  it('builds paths and refuses unsafe segments', () => {
    expect(schoolPaths.student('s1', 'p1')).toBe('schools/s1/students/p1');
    expect(schoolPaths.attempt('s1', 'p1', 'l1')).toBe('schools/s1/attempts/p1_l1');
    expect(schoolPaths.schoolCode('ab2c3d')).toBe('schoolCodes/AB2C3D');
    expect(schoolPaths.usageDaily('s1', '20261017')).toBe('schoolUsageDaily/s1_20261017');
    expect(() => schoolPaths.school('a/b')).toThrow();
  });
});

describe('lesson contract', () => {
  it('accepts a valid lesson and lists languages still missing', () => {
    const doc = LessonDocSchema.parse(lesson());
    expect(missingLanguages(doc)).toEqual([]);
    const untranslated = lesson({ title: text('Friction', '') });
    expect(missingLanguages(LessonDocSchema.parse(untranslated))).toEqual(['bn']);
  });

  it('enforces scope rules', () => {
    expect(LessonDocSchema.safeParse(lesson({ scope: 'global' })).success).toBe(false);
    expect(LessonDocSchema.safeParse(lesson({ scope: 'global', schoolId: null })).success).toBe(
      true,
    );
    expect(LessonDocSchema.safeParse(lesson({ scope: 'class', classIds: [] })).success).toBe(
      false,
    );
    expect(LessonDocSchema.safeParse(lesson({ scope: 'school', classIds: ['c1'] })).success).toBe(
      false,
    );
  });

  it('rejects duplicate item ids across steps', () => {
    const doc = lesson();
    const quiz = doc.steps[1]!;
    if (quiz.kind !== 'quiz') throw new Error('fixture');
    const dup = lesson({ steps: [...doc.steps, { kind: 'check', item: quiz.items[0]! }] });
    expect(LessonDocSchema.safeParse(dup).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx -y pnpm@10.34.7 --filter @just-imagine/protocol test -- school`
Expected: FAIL, cannot find `../src/school`.

- [ ] **Step 3: Implement**

`packages/protocol/src/school.ts`:

```ts
import { z } from 'zod';
import { AgeBandSchema } from './bands';
import { AvatarSchema, LanguageSchema } from './firestore';
import { DateKeySchema, DocumentIdSchema, EpochMsSchema } from './primitives';

/*
 * Schools product line (docs/superpowers/specs/2026-10-17-schools-stem-design.md §4-§6).
 * Teachers carry `role: 'schoolAdmin'` + `schoolId`; students carry `role: 'student'` +
 * `schoolId`, `studentId`, `classId`; the super admin keeps `admin: true`. Every write is
 * server-only. Answer keys live in `lessonKeys`, never in `lessons`.
 */

// ---------- identifiers and claims ----------

/** Six characters without look-alikes (no I, O, 0 or 1). */
export const SchoolCodeSchema = z
  .string()
  .trim()
  .toUpperCase()
  .regex(/^[A-HJ-NP-Z2-9]{6}$/);
export const StudentUsernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9][a-z0-9._-]{2,31}$/);
export const StudentPinSchema = z.string().regex(/^\d{6}$/);
export const SchoolGradeSchema = z.union([z.literal(9), z.literal(10)]);
export const SchoolSubjectSchema = z.enum(['physics', 'chemistry', 'math']);
export const ChapterIdSchema = z.string().regex(/^[a-z]+(-[a-z]+)*-\d+$/);
/** Both languages; an empty side means "not written yet" and blocks publishing. */
export const BilingualTextSchema = z.strictObject({
  en: z.string().trim().max(4000),
  bn: z.string().trim().max(4000),
});
export type BilingualText = z.infer<typeof BilingualTextSchema>;

export const SchoolAdminClaimsSchema = z.object({
  role: z.literal('schoolAdmin'),
  schoolId: DocumentIdSchema,
});
export const StudentClaimsSchema = z.object({
  role: z.literal('student'),
  schoolId: DocumentIdSchema,
  studentId: DocumentIdSchema,
  classId: DocumentIdSchema,
});
export const SchoolClaimsSchema = z.discriminatedUnion('role', [
  SchoolAdminClaimsSchema,
  StudentClaimsSchema,
]);
export type SchoolClaims = z.infer<typeof SchoolClaimsSchema>;

/** The school claims in a decoded ID token, or null when it carries none (parents, admins). */
export function schoolClaimsOf(
  token: Record<string, unknown> | null | undefined,
): SchoolClaims | null {
  const parsed = SchoolClaimsSchema.safeParse(token ?? {});
  return parsed.success ? parsed.data : null;
}

/** Firebase uid for a student; the api mints custom tokens for exactly this uid. */
export function studentUid(schoolId: string, studentId: string): string {
  return `st_${DocumentIdSchema.parse(schoolId)}_${DocumentIdSchema.parse(studentId)}`;
}

// ---------- school documents ----------

export const SchoolDocSchema = z.object({
  name: z.string().trim().min(2).max(120),
  nameBn: z.string().trim().min(2).max(120),
  code: SchoolCodeSchema,
  status: z.enum(['active', 'suspended']),
  seats: z.number().int().min(1).max(5000),
  voiceSecondsPerDay: z.number().int().min(0).max(864000),
  createdAt: EpochMsSchema,
});
export type SchoolDoc = z.infer<typeof SchoolDocSchema>;
export const SchoolCodeDocSchema = z.object({ schoolId: DocumentIdSchema });
export const SchoolMemberDocSchema = z.object({
  role: z.literal('schoolAdmin'),
  email: z.string().email(),
  displayName: z.string().max(120).nullable(),
  joinedAt: EpochMsSchema,
});
export const SchoolInviteDocSchema = z.object({
  email: z.string().email(),
  /** SHA-256 hex of the one-time token; the raw token is shown once and never stored. */
  tokenHash: z.string().regex(/^[0-9a-f]{64}$/),
  expiresAt: EpochMsSchema,
  createdBy: z.string(),
  createdAt: EpochMsSchema,
});
export const SchoolClassDocSchema = z.object({
  grade: SchoolGradeSchema,
  section: z.string().trim().min(1).max(8),
  name: z.string().trim().min(1).max(40),
  boardsVisible: z.boolean().default(true),
  createdAt: EpochMsSchema,
});
export const StudentDocSchema = z.object({
  firstName: z.string().trim().min(1).max(40),
  username: StudentUsernameSchema,
  classId: DocumentIdSchema,
  avatar: AvatarSchema,
  language: LanguageSchema,
  pointsAll: z.number().int().nonnegative().default(0),
  pointsWeek: z
    .object({ weekKey: DateKeySchema, points: z.number().int().nonnegative() })
    .nullable()
    .default(null),
  createdAt: EpochMsSchema,
});
export type StudentDoc = z.infer<typeof StudentDocSchema>;
/** Server-only (rules deny all client access). */
export const StudentSecretDocSchema = z.object({
  pinHash: z.string().regex(/^[0-9a-f]+$/),
  salt: z.string().regex(/^[0-9a-f]+$/),
  failedAttempts: z.number().int().nonnegative(),
  lockedUntil: EpochMsSchema.nullable(),
});

// ---------- lessons ----------

const ItemIdSchema = z.string().regex(/^[a-z0-9_-]{1,32}$/);
const PointsSchema = z.number().int().min(1).max(10);
const SimRefSchema = z.string().regex(/^[a-z0-9-]{1,64}$/);
const ParamsSchema = z.record(z.string().max(32), z.unknown());
const ReagentIdsSchema = z.array(z.string().regex(/^[a-z0-9-]+$/)).min(1).max(12);

export const QuizItemSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    id: ItemIdSchema,
    kind: z.literal('mcq'),
    prompt: BilingualTextSchema,
    options: z.array(BilingualTextSchema).min(2).max(5),
    points: PointsSchema,
  }),
  z.strictObject({
    id: ItemIdSchema,
    kind: z.literal('numeric'),
    prompt: BilingualTextSchema,
    unit: z.string().max(16),
    points: PointsSchema,
  }),
  z.strictObject({
    id: ItemIdSchema,
    kind: z.literal('simTask'),
    prompt: BilingualTextSchema,
    simId: SimRefSchema,
    startParams: ParamsSchema,
    editableParams: z.array(z.string().max(32)).min(1).max(8),
    points: PointsSchema,
  }),
  z.strictObject({
    id: ItemIdSchema,
    kind: z.literal('labTask'),
    prompt: BilingualTextSchema,
    reagentIds: ReagentIdsSchema,
    points: PointsSchema,
  }),
]);
export type QuizItem = z.infer<typeof QuizItemSchema>;

export const LessonStepSchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('intro'), body: BilingualTextSchema }),
  z.strictObject({
    kind: z.literal('explore'),
    simId: SimRefSchema,
    params: ParamsSchema,
    lockedParams: z.array(z.string().max(32)).max(8),
    prompts: z.array(BilingualTextSchema).max(6),
  }),
  z.strictObject({
    kind: z.literal('lab'),
    reagentIds: ReagentIdsSchema,
    goal: BilingualTextSchema.nullable(),
  }),
  z.strictObject({ kind: z.literal('check'), item: QuizItemSchema }),
  z.strictObject({ kind: z.literal('quiz'), items: z.array(QuizItemSchema).min(1).max(10) }),
]);
export type LessonStep = z.infer<typeof LessonStepSchema>;

function itemsOf(steps: readonly LessonStep[]): QuizItem[] {
  return steps.flatMap((s) => (s.kind === 'quiz' ? s.items : s.kind === 'check' ? [s.item] : []));
}

export const LessonDocSchema = z
  .object({
    scope: z.enum(['global', 'school', 'class']),
    schoolId: DocumentIdSchema.nullable(),
    classIds: z.array(DocumentIdSchema).max(20),
    subject: SchoolSubjectSchema,
    grade: SchoolGradeSchema,
    chapterId: ChapterIdSchema,
    title: BilingualTextSchema,
    steps: z.array(LessonStepSchema).min(1).max(20),
    status: z.enum(['draft', 'published', 'archived']),
    sourceLanguage: LanguageSchema,
    approved: z.object({ en: z.boolean(), bn: z.boolean() }),
    authorUid: z.string(),
    revision: z.number().int().nonnegative(),
    updatedAt: EpochMsSchema,
  })
  .superRefine((l, ctx) => {
    const issue = (message: string, path: string) =>
      ctx.addIssue({ code: 'custom', message, path: [path] });
    if (l.scope === 'global' && l.schoolId !== null)
      issue('A global lesson belongs to no school.', 'schoolId');
    if (l.scope !== 'global' && l.schoolId === null)
      issue('A school or class lesson needs its school.', 'schoolId');
    if (l.scope === 'class' && l.classIds.length === 0)
      issue('A class lesson needs at least one class.', 'classIds');
    if (l.scope !== 'class' && l.classIds.length > 0)
      issue('Only class lessons list classes.', 'classIds');
    const ids = itemsOf(l.steps).map((i) => i.id);
    if (new Set(ids).size !== ids.length) issue('Quiz item ids must be unique.', 'steps');
  });
export type LessonDoc = z.infer<typeof LessonDocSchema>;

function lessonTexts(l: LessonDoc): BilingualText[] {
  const texts: BilingualText[] = [l.title];
  for (const step of l.steps) {
    if (step.kind === 'intro') texts.push(step.body);
    if (step.kind === 'explore') texts.push(...step.prompts);
    if (step.kind === 'lab' && step.goal) texts.push(step.goal);
  }
  for (const item of itemsOf(l.steps)) {
    texts.push(item.prompt);
    if (item.kind === 'mcq') texts.push(...item.options);
  }
  return texts;
}

/** Languages with at least one empty text; publishing requires none. */
export function missingLanguages(l: LessonDoc): ('en' | 'bn')[] {
  const texts = lessonTexts(l);
  return (['en', 'bn'] as const).filter((lang) => texts.some((t) => t[lang] === ''));
}

export const QuizKeySchema = z.discriminatedUnion('kind', [
  z.strictObject({ kind: z.literal('mcq'), answer: z.number().int().min(0).max(4) }),
  z.strictObject({
    kind: z.literal('numeric'),
    value: z.number(),
    tolerance: z.strictObject({ mode: z.enum(['abs', 'rel']), amount: z.number().nonnegative() }),
  }),
  z.strictObject({
    kind: z.literal('simTask'),
    predicate: z.string().min(1).max(64),
    args: z.unknown(),
  }),
  /** `task` is a stem-sims LabTask; the api validates it with LabTaskSchema. */
  z.strictObject({ kind: z.literal('labTask'), task: z.unknown() }),
]);
export type QuizKey = z.infer<typeof QuizKeySchema>;
/** Server-only (rules deny all client access). */
export const LessonKeysDocSchema = z.object({
  revision: z.number().int().nonnegative(),
  items: z.record(
    ItemIdSchema,
    z.object({ key: QuizKeySchema, hints: z.array(BilingualTextSchema).max(2) }),
  ),
});

// ---------- attempts, boards, usage, catalog ----------

export const AttemptDocSchema = z.object({
  studentId: DocumentIdSchema,
  lessonId: DocumentIdSchema,
  revision: z.number().int().nonnegative(),
  items: z.record(
    ItemIdSchema,
    z.object({
      correct: z.boolean(),
      tries: z.number().int().nonnegative(),
      firstCorrectAt: EpochMsSchema.nullable(),
    }),
  ),
  pointsAwarded: z.number().int().nonnegative(),
  completedAt: EpochMsSchema.nullable(),
  updatedAt: EpochMsSchema,
});
export type AttemptDoc = z.infer<typeof AttemptDocSchema>;

export const BoardEntrySchema = z.object({
  studentId: DocumentIdSchema,
  firstName: z.string(),
  avatar: AvatarSchema,
  points: z.number().int().nonnegative(),
  reachedAt: EpochMsSchema,
});
export const BoardDocSchema = z.object({
  scope: z.enum(['class', 'school']),
  classId: DocumentIdSchema.nullable(),
  period: z.enum(['week', 'all']),
  weekKey: DateKeySchema.nullable(),
  entries: z.array(BoardEntrySchema).max(50),
  updatedAt: EpochMsSchema,
});
export type BoardDoc = z.infer<typeof BoardDocSchema>;

export const SchoolUsageDailyDocSchema = z.object({
  schoolId: DocumentIdSchema,
  date: DateKeySchema,
  voiceSeconds: z.number().nonnegative().default(0),
  aiDrafts: z.number().int().nonnegative().default(0),
  aiReactions: z.number().int().nonnegative().default(0),
});

export const CatalogEntryDocSchema = z.object({
  kind: z.enum(['world', 'storyPack']),
  status: z.enum(['draft', 'published', 'retired']),
  title: BilingualTextSchema,
  ageBands: z.array(AgeBandSchema).min(1),
  worldId: DocumentIdSchema.nullable(),
  /** A learning-content pack; validated by the api with the pack schema. */
  pack: z.unknown().nullable(),
  publishedBy: z.string().nullable(),
  publishedAt: EpochMsSchema.nullable(),
  updatedAt: EpochMsSchema,
});

// ---------- weeks and boards ----------

/** Asia/Dhaka is UTC+6 all year (no daylight saving). */
const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000;

/** YYYYMMDD of the Sunday that starts the Dhaka week containing epochMs. */
export function weekKeyDhaka(epochMs: number): string {
  const local = new Date(epochMs + DHAKA_OFFSET_MS);
  const sunday = new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() - local.getUTCDay()),
  );
  return sunday.toISOString().slice(0, 10).replaceAll('-', '');
}

export type BoardRef = { scope: 'class'; classId: string } | { scope: 'school' };
export function boardId(ref: BoardRef, period: { weekKey: string } | 'all'): string {
  const base = ref.scope === 'class' ? `class_${DocumentIdSchema.parse(ref.classId)}` : 'school';
  return period === 'all'
    ? `${base}_all`
    : `${base}_week_${DateKeySchema.parse(period.weekKey)}`;
}

// ---------- paths ----------

const seg = (value: string): string => DocumentIdSchema.parse(value);
export const schoolPaths = {
  schools: () => 'schools',
  school: (schoolId: string) => `schools/${seg(schoolId)}`,
  schoolCode: (code: string) => `schoolCodes/${SchoolCodeSchema.parse(code)}`,
  members: (schoolId: string) => `schools/${seg(schoolId)}/members`,
  member: (schoolId: string, uid: string) => `schools/${seg(schoolId)}/members/${seg(uid)}`,
  invites: (schoolId: string) => `schools/${seg(schoolId)}/invites`,
  invite: (schoolId: string, inviteId: string) =>
    `schools/${seg(schoolId)}/invites/${seg(inviteId)}`,
  classes: (schoolId: string) => `schools/${seg(schoolId)}/classes`,
  schoolClass: (schoolId: string, classId: string) =>
    `schools/${seg(schoolId)}/classes/${seg(classId)}`,
  students: (schoolId: string) => `schools/${seg(schoolId)}/students`,
  student: (schoolId: string, studentId: string) =>
    `schools/${seg(schoolId)}/students/${seg(studentId)}`,
  studentSecret: (schoolId: string, studentId: string) =>
    `schools/${seg(schoolId)}/studentSecrets/${seg(studentId)}`,
  attempts: (schoolId: string) => `schools/${seg(schoolId)}/attempts`,
  attempt: (schoolId: string, studentId: string, lessonId: string) =>
    `schools/${seg(schoolId)}/attempts/${seg(studentId)}_${seg(lessonId)}`,
  boards: (schoolId: string) => `schools/${seg(schoolId)}/boards`,
  board: (schoolId: string, id: string) => `schools/${seg(schoolId)}/boards/${seg(id)}`,
  lessons: () => 'lessons',
  lesson: (lessonId: string) => `lessons/${seg(lessonId)}`,
  lessonKeys: (lessonId: string) => `lessonKeys/${seg(lessonId)}`,
  usageDaily: (schoolId: string, date: string) =>
    `schoolUsageDaily/${seg(schoolId)}_${DateKeySchema.parse(date)}`,
  catalog: () => 'catalog',
  catalogEntry: (entryId: string) => `catalog/${seg(entryId)}`,
} as const;

// ---------- routes (S0 subset; later phases extend these tables) ----------

export const SCHOOL_ROUTES = {
  me: { method: 'GET', path: '/v1/school/me' },
} as const;
export const STUDY_ROUTES = {
  me: { method: 'GET', path: '/v1/study/me' },
} as const;
export const SchoolMeResponseSchema = z.object({
  uid: z.string(),
  schoolId: DocumentIdSchema.nullable(),
  superAdmin: z.boolean(),
});
export const StudyMeResponseSchema = z.object({
  uid: z.string(),
  schoolId: DocumentIdSchema,
  studentId: DocumentIdSchema,
  classId: DocumentIdSchema,
});
```

- [ ] **Step 4: Add the export line, working tree first**

Re-read `packages/protocol/src/index.ts`. Insert `export * from './school';` on the line after `export * from './admin';`.

- [ ] **Step 5: Run the tests, typecheck and lint**

Run: `node_modules/.bin/prettier --write packages/protocol/src/school.ts packages/protocol/test/school.test.ts && npx -y pnpm@10.34.7 --filter @just-imagine/protocol test && npx -y pnpm@10.34.7 --filter @just-imagine/protocol typecheck && npx -y pnpm@10.34.7 --filter @just-imagine/protocol lint`
Expected: all protocol tests PASS, including the new `school.test.ts`.

- [ ] **Step 6: Commit with only your insertion in `index.ts`**

```bash
test -z "$(git diff --cached --name-only)" || { echo "index not clean"; exit 1; }
git show HEAD:packages/protocol/src/index.ts > "$SCRATCH/protocol-index.ts"
# Insert `export * from './school';` after `export * from './admin';` in "$SCRATCH/protocol-index.ts"
# (use the Edit tool on that scratch file; the change must be identical to the working tree's).
git update-index --cacheinfo 100644,"$(git hash-object -w "$SCRATCH/protocol-index.ts")",packages/protocol/src/index.ts
git add packages/protocol/src/school.ts packages/protocol/test/school.test.ts
git diff --cached --stat   # expect exactly these three files
git commit -m "feat(protocol): school claims, documents, lesson contract and paths

Adds the schools contract: teacher and student claims, school, class, student, lesson, answer-key, attempt, board, usage and catalog documents, Dhaka week keys and board ids, and the first school and study route entries."
git diff -- packages/protocol/src/index.ts   # expect only Codex's two language-policy lines
```

---

### Task 2: Admin audit enums for schools, catalog and lessons

**Files:**

- Modify: `packages/protocol/src/admin.ts`: `AdminAuditActionSchema` gains values, and `AdminAuditDocSchema.target.kind` gains values.
- Test: `packages/protocol/test/school-audit.test.ts`

**Interfaces:**

- Produces: audit actions `school.create`, `school.update`, `school.suspend`, `school.reinstate`, `school.invite`, `school.inviteRevoke`, `catalog.publish`, `catalog.retire`, `lesson.publish`, `lesson.archive`; target kinds `school`, `catalog`, `lesson`. S1 writes these.

- [ ] **Step 1: Write the failing test**

`packages/protocol/test/school-audit.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { AdminAuditDocSchema } from '../src/admin';

const entry = (action: string, kind: string) => ({
  actorUid: 'ops',
  actorEmail: 'ops@example.test',
  action,
  target: { kind, id: 's1' },
  before: null,
  after: { status: 'active' },
  reason: 'Pilot school',
  at: 1,
});

describe('admin audit for schools', () => {
  it('accepts school, catalog and lesson actions and targets', () => {
    for (const [action, kind] of [
      ['school.create', 'school'],
      ['school.update', 'school'],
      ['school.suspend', 'school'],
      ['school.reinstate', 'school'],
      ['school.invite', 'school'],
      ['school.inviteRevoke', 'school'],
      ['catalog.publish', 'catalog'],
      ['catalog.retire', 'catalog'],
      ['lesson.publish', 'lesson'],
      ['lesson.archive', 'lesson'],
    ])
      expect(AdminAuditDocSchema.safeParse(entry(action!, kind!)).success).toBe(true);
  });

  it('still rejects unknown actions and targets', () => {
    expect(AdminAuditDocSchema.safeParse(entry('school.explode', 'school')).success).toBe(false);
    expect(AdminAuditDocSchema.safeParse(entry('school.create', 'teacher')).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx -y pnpm@10.34.7 --filter @just-imagine/protocol test -- school-audit`
Expected: FAIL on the first test (`school.create` is not a valid action).

- [ ] **Step 3: Implement**

Run `git diff -- packages/protocol/src/admin.ts` and expect no output. Then re-read the file.

In `AdminAuditActionSchema`, after `'appearance.set',` add:

```ts
  'school.create',
  'school.update',
  'school.suspend',
  'school.reinstate',
  'school.invite',
  'school.inviteRevoke',
  'catalog.publish',
  'catalog.retire',
  'lesson.publish',
  'lesson.archive',
```

In `AdminAuditDocSchema`, change `z.enum(['family', 'world', 'system'])` to `z.enum(['family', 'world', 'system', 'school', 'catalog', 'lesson'])`.

- [ ] **Step 4: Run the tests**

Run: `npx -y pnpm@10.34.7 --filter @just-imagine/protocol test && npx -y pnpm@10.34.7 --filter @just-imagine/protocol typecheck && npx -y pnpm@10.34.7 --filter @just-imagine/api typecheck`
Expected: PASS. The api typecheck must stay green, because `services/api/src/admin.ts` switches on these enums. If a `switch` there becomes non-exhaustive, stop and report it rather than editing Codex-reviewed admin code.

- [ ] **Step 5: Commit**

```bash
git commit -m "feat(protocol): admin audit actions for schools, catalog and lessons

Extends the audit action and target enums so super admin changes to schools, invites, catalog entries and global lessons are recorded like family actions." -- packages/protocol/src/admin.ts packages/protocol/test/school-audit.test.ts
```

---

### Task 3: Role guards in server-core, and an emulator runner for one command

**Files:**

- Create: `scripts/test-emulators-for.mjs`
- Modify: `packages/server-core/src/auth.ts` (additive exports at the end of the file)
- Test: `packages/server-core/test/school-auth.test.ts`

**Interfaces:**

- Consumes: `schoolClaimsOf`, `studentUid`, `SchoolDocSchema`, `schoolPaths` from `@just-imagine/protocol` (Task 1).
- Produces:
  - `SchoolRoleRequiredError` (`code: 'FORBIDDEN'`);
  - `SchoolAdminActor = { uid: string; email: string | null; schoolId: string | null; superAdmin: boolean }`;
  - `StudentActor = { uid: string; schoolId: string; studentId: string; classId: string }`;
  - `requireSchoolAdmin(idToken, schoolId?)`;
  - `requireStudent(idToken)`;
  - `isSchoolSuspended(schoolId)`.
- `server-core`'s `index.ts` already re-exports `./auth`. Confirm with `grep -n "auth" packages/server-core/src/index.ts`.

- [ ] **Step 1: Create the emulator runner**

`scripts/test-emulators-for.mjs`:

```js
// Runs one command inside throwaway Firestore and Auth emulators on the test ports
// (8085/9095), leaving the demo emulators (8080/9099) and their data untouched.
// Usage: node scripts/test-emulators-for.mjs "<command>"
import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, copyFileSync, writeFileSync, rmSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { tmpdir } from 'node:os';

const command = process.argv.slice(2).join(' ');
if (!command) {
  console.error('Usage: node scripts/test-emulators-for.mjs "<command>"');
  process.exit(2);
}
const java = resolve('.tools/amazon-corretto-21.jdk/Contents/Home');
const env = {
  ...process.env,
  DEBUG: '',
  ...(!process.env.JAVA_HOME && existsSync(java) ? { JAVA_HOME: java } : {}),
};
const directory = mkdtempSync(join(tmpdir(), 'just-imagine-tests-'));
for (const file of ['firestore.rules', 'firestore.indexes.json'])
  copyFileSync(resolve(file), join(directory, file));
const config = join(directory, 'firebase.json');
writeFileSync(
  config,
  JSON.stringify({
    emulators: {
      firestore: { port: 8085, websocketPort: 9155 },
      auth: { port: 9095 },
      hub: { port: 4405 },
      logging: { port: 4505 },
      ui: { enabled: false },
      singleProjectMode: true,
    },
    firestore: { rules: 'firestore.rules', indexes: 'firestore.indexes.json' },
  }),
);
let status = 1;
try {
  const result = spawnSync(
    resolve('node_modules/.bin/firebase'),
    [
      'emulators:exec',
      '--config',
      config,
      '--only',
      'firestore,auth',
      '--project',
      'demo-just-imagine',
      command,
    ],
    { stdio: 'inherit', env },
  );
  status = result.status ?? 1;
} finally {
  rmSync(directory, { recursive: true, force: true });
}
process.exit(status);
```

- [ ] **Step 2: Write the failing test**

`packages/server-core/test/school-auth.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import './emulator';
import { adminAuth, db } from '../src/firebase';
import {
  AuthError,
  isSchoolSuspended,
  requireSchoolAdmin,
  requireStudent,
  SchoolRoleRequiredError,
} from '../src/auth';

async function tokenFor(uid: string, claims: Record<string, unknown> = {}): Promise<string> {
  const custom = await adminAuth().createCustomToken(uid, claims);
  const res = await fetch(
    `http://${process.env['FIREBASE_AUTH_EMULATOR_HOST']}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: custom, returnSecureToken: true }),
    },
  );
  const body = (await res.json()) as { idToken?: string };
  if (!body.idToken) throw new Error('no idToken from auth emulator');
  return body.idToken;
}

const student = { role: 'student', schoolId: 'sa1', studentId: 'p1', classId: 'c1' };
const teacher = { role: 'schoolAdmin', schoolId: 'sa1' };

describe('requireSchoolAdmin', () => {
  it('accepts a teacher for their own school and refuses other schools', async () => {
    const token = await tokenFor('t_sa1', teacher);
    await expect(requireSchoolAdmin(token)).resolves.toMatchObject({
      uid: 't_sa1',
      schoolId: 'sa1',
      superAdmin: false,
    });
    await expect(requireSchoolAdmin(token, 'sa1')).resolves.toMatchObject({ schoolId: 'sa1' });
    await expect(requireSchoolAdmin(token, 'sa2')).rejects.toBeInstanceOf(
      SchoolRoleRequiredError,
    );
  });

  it('lets the super admin act inside any school', async () => {
    const token = await tokenFor('ops_sa', { admin: true });
    await expect(requireSchoolAdmin(token, 'sa9')).resolves.toMatchObject({
      schoolId: 'sa9',
      superAdmin: true,
    });
  });

  it('refuses students, parents and garbage', async () => {
    await expect(
      requireSchoolAdmin(await tokenFor('st_sa1_p1', student)),
    ).rejects.toBeInstanceOf(SchoolRoleRequiredError);
    await expect(requireSchoolAdmin(await tokenFor('parent_sa'))).rejects.toBeInstanceOf(
      SchoolRoleRequiredError,
    );
    await expect(requireSchoolAdmin('nope')).rejects.toBeInstanceOf(AuthError);
  });
});

describe('requireStudent', () => {
  it('accepts a student whose uid matches their claims', async () => {
    await expect(requireStudent(await tokenFor('st_sa1_p1', student))).resolves.toEqual({
      uid: 'st_sa1_p1',
      schoolId: 'sa1',
      studentId: 'p1',
      classId: 'c1',
    });
  });

  it('refuses student claims on a uid that is not the student uid', async () => {
    await expect(requireStudent(await tokenFor('someone_else', student))).rejects.toBeInstanceOf(
      SchoolRoleRequiredError,
    );
  });

  it('refuses teachers', async () => {
    await expect(requireStudent(await tokenFor('t_sa1b', teacher))).rejects.toBeInstanceOf(
      SchoolRoleRequiredError,
    );
  });
});

describe('isSchoolSuspended', () => {
  it('fails closed for a missing school and reads status otherwise', async () => {
    const base = {
      name: 'Test School',
      nameBn: 'টেস্ট স্কুল',
      code: 'AB2C3D',
      seats: 40,
      voiceSecondsPerDay: 3600,
      createdAt: 1,
    };
    await db().doc('schools/sa_active').set({ ...base, status: 'active' });
    await db().doc('schools/sa_paused').set({ ...base, status: 'suspended' });
    expect(await isSchoolSuspended('sa_active')).toBe(false);
    expect(await isSchoolSuspended('sa_paused')).toBe(true);
    expect(await isSchoolSuspended('sa_missing')).toBe(true);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `node scripts/test-emulators-for.mjs "npx -y pnpm@10.34.7 --filter @just-imagine/server-core exec vitest run test/school-auth.test.ts"`
Expected: FAIL, `requireSchoolAdmin` is not exported from `../src/auth`.

- [ ] **Step 4: Implement**

Run `git diff -- packages/server-core/src/auth.ts` and expect no output. Re-read the file, then append:

```ts
// ---------- schools (docs/superpowers/specs/2026-10-17-schools-stem-design.md §4.2) ----------

/** The token is valid but lacks the school role this route needs. */
export class SchoolRoleRequiredError extends Error {
  readonly code = 'FORBIDDEN' as const;
  constructor(message = 'school role required') {
    super(message);
    this.name = 'SchoolRoleRequiredError';
  }
}

export interface SchoolAdminActor {
  uid: string;
  email: string | null;
  /** Null only for a super admin who did not name a school. */
  schoolId: string | null;
  superAdmin: boolean;
}
export interface StudentActor {
  uid: string;
  schoolId: string;
  studentId: string;
  classId: string;
}

async function decodeChecked(idToken: string) {
  try {
    return await adminAuth().verifyIdToken(idToken, true);
  } catch (e) {
    throw new AuthError(e instanceof Error ? e.message : 'invalid token');
  }
}

/**
 * A teacher of `schoolId` (or of their own school when omitted), or the super admin acting
 * inside `schoolId`. Throws AuthError for bad tokens and SchoolRoleRequiredError otherwise.
 */
export async function requireSchoolAdmin(
  idToken: string,
  schoolId?: string,
): Promise<SchoolAdminActor> {
  const decoded = await decodeChecked(idToken);
  const email = decoded.email ?? null;
  if (isAdmin(decoded))
    return { uid: decoded.uid, email, schoolId: schoolId ?? null, superAdmin: true };
  const claims = schoolClaimsOf(decoded);
  if (claims?.role !== 'schoolAdmin' || (schoolId !== undefined && schoolId !== claims.schoolId))
    throw new SchoolRoleRequiredError();
  return { uid: decoded.uid, email, schoolId: claims.schoolId, superAdmin: false };
}

/** A student whose uid is exactly the one the api mints for their claims. */
export async function requireStudent(idToken: string): Promise<StudentActor> {
  const decoded = await decodeChecked(idToken);
  const claims = schoolClaimsOf(decoded);
  if (claims?.role !== 'student' || decoded.uid !== studentUid(claims.schoolId, claims.studentId))
    throw new SchoolRoleRequiredError();
  return {
    uid: decoded.uid,
    schoolId: claims.schoolId,
    studentId: claims.studentId,
    classId: claims.classId,
  };
}

/** True when the school is suspended or missing. Read errors propagate (callers fail closed). */
export async function isSchoolSuspended(schoolId: string): Promise<boolean> {
  const snap = await db().doc(schoolPaths.school(schoolId)).get();
  if (!snap.exists) return true;
  return SchoolDocSchema.parse(snap.data()).status === 'suspended';
}
```

Extend the existing protocol import at the top of `auth.ts` to:

```ts
import {
  AdminFlagsDocSchema,
  adminPaths,
  SchoolDocSchema,
  schoolClaimsOf,
  schoolPaths,
  studentUid,
} from '@just-imagine/protocol';
```

- [ ] **Step 5: Run the tests**

Run: `node scripts/test-emulators-for.mjs "npx -y pnpm@10.34.7 --filter @just-imagine/server-core exec vitest run test/school-auth.test.ts test/auth.test.ts" && npx -y pnpm@10.34.7 --filter @just-imagine/server-core typecheck && npx -y pnpm@10.34.7 --filter @just-imagine/server-core lint`
Expected: all PASS, including the existing `auth.test.ts`.

- [ ] **Step 6: Commit**

```bash
git add scripts/test-emulators-for.mjs packages/server-core/test/school-auth.test.ts
git commit -m "feat(server-core): teacher and student guards and school suspension check

requireSchoolAdmin admits a school's teacher or the super admin acting in a named school, requireStudent admits only the uid minted for the student's claims, and isSchoolSuspended fails closed for a missing school. Adds a runner for one command inside throwaway test emulators." -- scripts/test-emulators-for.mjs packages/server-core/src/auth.ts packages/server-core/test/school-auth.test.ts
```

---

### Task 4: Firestore rules and indexes for schools and lessons

**Files:**

- Modify: `firestore.rules`: one block inserted immediately before `match /{document=**} { allow write: if false; }`.
- Modify: `firestore.indexes.json`: three entries appended to `indexes`.
- Test: `services/api/test/school-rules.integration.test.ts`

**Interfaces:**

- Consumes: the claim names from Task 1. Board docs carry `scope` and `classId`; attempt docs carry `studentId`; lessons carry `scope`, `schoolId`, `classIds` and `status`.
- Produces: the read rules S2, S4 and S5 rely on. Client list queries on `lessons` must filter so that every returned document is readable (S4 notes this).

- [ ] **Step 1: Write the failing test**

`services/api/test/school-rules.integration.test.ts`:

```ts
import { it, expect, beforeAll } from 'vitest';
import { adminAuth, db } from '@just-imagine/server-core';
process.env['GOOGLE_CLOUD_PROJECT'] = 'demo-just-imagine';

async function idToken(uid: string, claims: Record<string, unknown>) {
  const custom = await adminAuth().createCustomToken(uid, claims);
  const res = await fetch(
    `http://${process.env['FIREBASE_AUTH_EMULATOR_HOST']}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: custom, returnSecureToken: true }),
    },
  );
  return ((await res.json()) as { idToken: string }).idToken;
}

const base = () =>
  `http://${process.env['FIRESTORE_EMULATOR_HOST']}/v1/projects/demo-just-imagine/databases/(default)/documents/`;
async function status(path: string, token: string | null) {
  const headers: Record<string, string> = token ? { authorization: `Bearer ${token}` } : {};
  return (await fetch(base() + path, { headers })).status;
}

const tokens: Record<string, string> = {};
beforeAll(async () => {
  if (!process.env['FIRESTORE_EMULATOR_HOST']) throw new Error('Emulators required');
  const school = { name: 'Rules School', nameBn: 'রুলস স্কুল', code: 'RU2S3S', status: 'active', seats: 10, voiceSecondsPerDay: 0, createdAt: 1 };
  await db().doc('schools/rs1').set(school);
  await db().doc('schools/rs2').set({ ...school, code: 'RU2S3T' });
  await db().doc('schools/rs1/members/rt1').set({ role: 'schoolAdmin', email: 't@example.test', displayName: null, joinedAt: 1 });
  await db().doc('schools/rs1/classes/c1').set({ grade: 9, section: 'A', name: '9-A', createdAt: 1 });
  await db().doc('schools/rs1/classes/c2').set({ grade: 9, section: 'B', name: '9-B', createdAt: 1 });
  await db().doc('schools/rs1/students/p1').set({ firstName: 'Rahim', username: 'rahim', classId: 'c1', avatar: 'fox', language: 'bn', createdAt: 1 });
  await db().doc('schools/rs1/students/p2').set({ firstName: 'Karim', username: 'karim', classId: 'c2', avatar: 'owl', language: 'en', createdAt: 1 });
  await db().doc('schools/rs1/studentSecrets/p1').set({ pinHash: 'aa', salt: 'bb', failedAttempts: 0, lockedUntil: null });
  await db().doc('schools/rs1/invites/i1').set({ email: 't@example.test', tokenHash: 'a'.repeat(64), expiresAt: 9, createdBy: 'ops', createdAt: 1 });
  await db().doc('schools/rs1/attempts/p1_l1').set({ studentId: 'p1', lessonId: 'l1' });
  await db().doc('schools/rs1/attempts/p2_l1').set({ studentId: 'p2', lessonId: 'l1' });
  await db().doc('schools/rs1/boards/class_c1_all').set({ scope: 'class', classId: 'c1', period: 'all', weekKey: null, entries: [], updatedAt: 1 });
  await db().doc('schools/rs1/boards/class_c2_all').set({ scope: 'class', classId: 'c2', period: 'all', weekKey: null, entries: [], updatedAt: 1 });
  await db().doc('schools/rs1/boards/school_all').set({ scope: 'school', classId: null, period: 'all', weekKey: null, entries: [], updatedAt: 1 });
  const lesson = (scope: string, schoolId: string | null, classIds: string[], status: string) => ({ scope, schoolId, classIds, status });
  await db().doc('lessons/lg_pub').set(lesson('global', null, [], 'published'));
  await db().doc('lessons/lg_draft').set(lesson('global', null, [], 'draft'));
  await db().doc('lessons/ls_pub').set(lesson('school', 'rs1', [], 'published'));
  await db().doc('lessons/ls_draft').set(lesson('school', 'rs1', [], 'draft'));
  await db().doc('lessons/lc1_pub').set(lesson('class', 'rs1', ['c1'], 'published'));
  await db().doc('lessons/lother_pub').set(lesson('school', 'rs2', [], 'published'));
  await db().doc('lessonKeys/lg_pub').set({ revision: 0, items: {} });
  await db().doc('schoolCodes/RU2S3S').set({ schoolId: 'rs1' });
  tokens['teacher'] = await idToken('rt1', { role: 'schoolAdmin', schoolId: 'rs1' });
  tokens['student'] = await idToken('st_rs1_p1', { role: 'student', schoolId: 'rs1', studentId: 'p1', classId: 'c1' });
  tokens['otherSchoolStudent'] = await idToken('st_rs2_q1', { role: 'student', schoolId: 'rs2', studentId: 'q1', classId: 'k1' });
  tokens['admin'] = await idToken('rops', { admin: true });
  tokens['parent'] = await idToken('rparent', {});
});

it('lets a teacher read their own school tree but not secrets or invites', async () => {
  const t = tokens['teacher']!;
  expect(await status('schools/rs1', t)).toBe(200);
  expect(await status('schools/rs1/members/rt1', t)).toBe(200);
  expect(await status('schools/rs1/classes/c2', t)).toBe(200);
  expect(await status('schools/rs1/students/p2', t)).toBe(200);
  expect(await status('schools/rs1/attempts/p2_l1', t)).toBe(200);
  expect(await status('schools/rs1/boards/class_c2_all', t)).toBe(200);
  expect(await status('schools/rs1/studentSecrets/p1', t)).toBe(403);
  expect(await status('schools/rs1/invites/i1', t)).toBe(403);
  expect(await status('schools/rs2', t)).toBe(403);
});

it('confines a student to their own record, class and boards', async () => {
  const s = tokens['student']!;
  expect(await status('schools/rs1', s)).toBe(200);
  expect(await status('schools/rs1/students/p1', s)).toBe(200);
  expect(await status('schools/rs1/students/p2', s)).toBe(403);
  expect(await status('schools/rs1/classes/c1', s)).toBe(200);
  expect(await status('schools/rs1/classes/c2', s)).toBe(403);
  expect(await status('schools/rs1/attempts/p1_l1', s)).toBe(200);
  expect(await status('schools/rs1/attempts/p2_l1', s)).toBe(403);
  expect(await status('schools/rs1/boards/class_c1_all', s)).toBe(200);
  expect(await status('schools/rs1/boards/class_c2_all', s)).toBe(403);
  expect(await status('schools/rs1/boards/school_all', s)).toBe(200);
  expect(await status('schools/rs1/members/rt1', s)).toBe(403);
  expect(await status('schools/rs1/studentSecrets/p1', s)).toBe(403);
  expect(await status('schools/rs2', s)).toBe(403);
});

it('shows lessons only within scope and only published ones to students', async () => {
  const s = tokens['student']!;
  expect(await status('lessons/lg_pub', s)).toBe(200);
  expect(await status('lessons/lg_draft', s)).toBe(403);
  expect(await status('lessons/ls_pub', s)).toBe(200);
  expect(await status('lessons/ls_draft', s)).toBe(403);
  expect(await status('lessons/lc1_pub', s)).toBe(200);
  expect(await status('lessons/lother_pub', s)).toBe(403);
  const o = tokens['otherSchoolStudent']!;
  expect(await status('lessons/ls_pub', o)).toBe(403);
  expect(await status('lessons/lc1_pub', o)).toBe(403);
  const t = tokens['teacher']!;
  expect(await status('lessons/ls_draft', t)).toBe(200);
  expect(await status('lessons/lg_pub', t)).toBe(200);
  expect(await status('lessons/lg_draft', t)).toBe(403);
  expect(await status('lessons/lother_pub', t)).toBe(403);
});

it('keeps answer keys, school codes and every school path closed to everyone else', async () => {
  for (const who of ['teacher', 'student', 'admin', 'parent'])
    expect(await status('lessonKeys/lg_pub', tokens[who]!)).toBe(403);
  expect(await status('schoolCodes/RU2S3S', tokens['student']!)).toBe(403);
  expect(await status('schools/rs1', tokens['parent']!)).toBe(403);
  expect(await status('lessons/lg_pub', tokens['parent']!)).toBe(403);
  expect(await status('schools/rs1', null)).toBe(403);
});

it('denies every client write', async () => {
  const res = await fetch(base() + 'schools/rs1/students/p1', {
    method: 'PATCH',
    headers: { authorization: `Bearer ${tokens['teacher']}`, 'content-type': 'application/json' },
    body: JSON.stringify({ fields: { firstName: { stringValue: 'X' } } }),
  });
  expect(res.status).toBe(403);
});
```

Run `node_modules/.bin/prettier --write services/api/test/school-rules.integration.test.ts` after writing; the compact `set` calls above get expanded.

- [ ] **Step 2: Run the test to verify it fails**

Run: `node scripts/test-emulators-for.mjs "npx -y pnpm@10.34.7 --filter @just-imagine/api exec vitest run test/school-rules.integration.test.ts"`
Expected: FAIL. Every school and lesson read returns 403, because no rule allows them yet.

- [ ] **Step 3: Implement the rules**

Run `git diff -- firestore.rules` and expect no output. Re-read the file. Insert immediately before the line `    match /{document=**} { allow write: if false; }`:

```
    // Schools (docs/superpowers/specs/2026-10-17-schools-stem-design.md §5). The api sets
    // claims: teachers role + schoolId; students role + schoolId + studentId + classId.
    // Invites, studentSecrets, lessonKeys, schoolCodes, usage and catalog have no allow rule,
    // so every client read is denied; all writes stay server-only.
    function claim(key) { return request.auth.token.get(key, ''); }
    function teacherOf(schoolId) {
      return request.auth != null && claim('role') == 'schoolAdmin' && claim('schoolId') == schoolId;
    }
    function studentOf(schoolId) {
      return request.auth != null && claim('role') == 'student' && claim('schoolId') == schoolId;
    }
    match /schools/{schoolId} {
      allow read: if teacherOf(schoolId) || studentOf(schoolId);
      match /members/{uid} { allow read: if teacherOf(schoolId); }
      match /classes/{classId} {
        allow read: if teacherOf(schoolId) || (studentOf(schoolId) && claim('classId') == classId);
      }
      match /students/{studentId} {
        allow read: if teacherOf(schoolId) || (studentOf(schoolId) && claim('studentId') == studentId);
      }
      match /attempts/{attemptId} {
        allow read: if teacherOf(schoolId)
          || (studentOf(schoolId) && resource.data.studentId == claim('studentId'));
      }
      match /boards/{boardId} {
        allow read: if teacherOf(schoolId)
          || (studentOf(schoolId)
              && (resource.data.scope == 'school' || resource.data.classId == claim('classId')));
      }
    }
    function lessonReadable(lesson) {
      return request.auth != null && (
        (claim('role') == 'schoolAdmin'
          && ((lesson.scope == 'global' && lesson.status == 'published')
              || (lesson.scope != 'global' && lesson.schoolId == claim('schoolId'))))
        || (claim('role') == 'student' && lesson.status == 'published'
          && (lesson.scope == 'global'
              || (lesson.scope == 'school' && lesson.schoolId == claim('schoolId'))
              || (lesson.scope == 'class' && lesson.schoolId == claim('schoolId')
                  && claim('classId') in lesson.classIds))));
    }
    match /lessons/{lessonId} { allow read: if lessonReadable(resource.data); }
```

- [ ] **Step 4: Add the indexes**

Run `git diff -- firestore.indexes.json` and expect no output. Append these objects to the `indexes` array:

```json
    {
      "collectionGroup": "lessons",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "scope", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "subject", "order": "ASCENDING" },
        { "fieldPath": "grade", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "lessons",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "schoolId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "subject", "order": "ASCENDING" },
        { "fieldPath": "grade", "order": "ASCENDING" }
      ]
    },
    {
      "collectionGroup": "students",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "classId", "order": "ASCENDING" },
        { "fieldPath": "firstName", "order": "ASCENDING" }
      ]
    }
```

Run `node_modules/.bin/prettier --write firestore.indexes.json` so its formatting matches the file's existing style.

- [ ] **Step 5: Run the tests**

Run: `node scripts/test-emulators-for.mjs "npx -y pnpm@10.34.7 --filter @just-imagine/api exec vitest run test/school-rules.integration.test.ts test/admin-rules.integration.test.ts test/rules.integration.test.ts"`
Expected: all PASS. The two existing rules suites must stay green.

- [ ] **Step 6: Commit**

```bash
git commit -m "feat(firestore): read rules and indexes for schools and lessons

Teachers read their own school tree, students read only their own record, class, attempts and boards, and lessons are visible only within their global, school or class scope and to students only once published. Secrets, invites, answer keys and school codes stay closed to every client." -- firestore.rules firestore.indexes.json services/api/test/school-rules.integration.test.ts
```

---

### Task 5: School and study API route modules

**Files:**

- Create: `services/api/src/school/routes.ts`
- Modify: `services/api/src/app.ts`. Three anchored insertions (an import, one `ApiOptions` field, one call), staged with the procedure in Global constraints.
- Test: `services/api/test/school-routes.test.ts`

**Interfaces:**

- Consumes: `requireSchoolAdmin`, `requireStudent`, `isSchoolSuspended`, `SchoolRoleRequiredError`, `SchoolAdminActor`, `StudentActor` (Task 3); `SCHOOL_ROUTES`, `STUDY_ROUTES`, `DocumentIdSchema` (Task 1).
- Produces:
  - `SchoolRouteOptions = { verifySchoolAdmin?, verifyStudent?, isSchoolSuspended? }`;
  - `registerSchoolRoutes(app, options?)`;
  - Fastify request decorations `schoolActor` and `studentActor`.
- S1, S2 and S5 add their routes inside these two encapsulated scopes by extending `registerSchoolRoutes`.

- [ ] **Step 1: Write the failing test**

`services/api/test/school-routes.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SchoolRoleRequiredError } from '@just-imagine/server-core';
import { createApi } from '../src/app';
import type { ApiStore } from '../src/store';

function harness() {
  const store = new Proxy(
    {},
    { get: () => async () => ({ uid: 'parent' }) },
  ) as ApiStore;
  return createApi({
    store,
    origins: [],
    verifyToken: async () => ({ uid: 'parent' }),
    isSuspended: async () => false,
    admin: { verifyAdmin: async () => ({ uid: 'ops', email: null }) },
    school: {
      verifySchoolAdmin: async (token, schoolId) => {
        if (token === 'teacher') {
          if (schoolId !== undefined && schoolId !== 's1') throw new SchoolRoleRequiredError();
          return { uid: 't1', email: 't@example.test', schoolId: 's1', superAdmin: false };
        }
        if (token === 'admin')
          return { uid: 'ops', email: null, schoolId: schoolId ?? null, superAdmin: true };
        if (token === 'student') throw new SchoolRoleRequiredError();
        throw new Error('internal detail: bad token');
      },
      verifyStudent: async (token) => {
        if (token === 'student' || token === 'paused')
          return {
            uid: 'st_s1_p1',
            schoolId: token === 'paused' ? 's2' : 's1',
            studentId: 'p1',
            classId: 'c1',
          };
        if (token === 'teacher') throw new SchoolRoleRequiredError();
        throw new Error('internal detail: bad token');
      },
      isSchoolSuspended: async (schoolId) => schoolId === 's2',
    },
  });
}
const get = (app: ReturnType<typeof harness>, url: string, token?: string) =>
  app.inject({ url, headers: token ? { authorization: `Bearer ${token}` } : {} });

describe('teacher scope', () => {
  it('requires a token and the school role', async () => {
    const app = harness();
    expect((await get(app, '/v1/school/me')).statusCode).toBe(401);
    const bad = await get(app, '/v1/school/me', 'garbage');
    expect(bad.statusCode).toBe(401);
    expect(bad.body).not.toContain('internal detail');
    const student = await get(app, '/v1/school/me', 'student');
    expect(student.statusCode).toBe(403);
    expect(student.json().error.code).toBe('FORBIDDEN');
    await app.close();
  });

  it('answers for a teacher, refuses another school, and lets the super admin choose one', async () => {
    const app = harness();
    const me = await get(app, '/v1/school/me', 'teacher');
    expect(me.statusCode).toBe(200);
    expect(me.json()).toEqual({ uid: 't1', schoolId: 's1', superAdmin: false });
    expect((await get(app, '/v1/school/me?schoolId=s2', 'teacher')).statusCode).toBe(403);
    expect((await get(app, '/v1/school/me?schoolId=s9', 'admin')).json()).toEqual({
      uid: 'ops',
      schoolId: 's9',
      superAdmin: true,
    });
    expect((await get(app, '/v1/school/me?schoolId=a%2Fb', 'admin')).statusCode).toBe(400);
    await app.close();
  });
});

describe('student scope', () => {
  it('answers for a student and refuses teachers and paused schools', async () => {
    const app = harness();
    const me = await get(app, '/v1/study/me', 'student');
    expect(me.statusCode).toBe(200);
    expect(me.json()).toEqual({ uid: 'st_s1_p1', schoolId: 's1', studentId: 'p1', classId: 'c1' });
    expect((await get(app, '/v1/study/me', 'teacher')).statusCode).toBe(403);
    const paused = await get(app, '/v1/study/me', 'paused');
    expect(paused.statusCode).toBe(403);
    expect(paused.json().error.message).toContain('paused');
    expect((await get(app, '/v1/study/me')).statusCode).toBe(401);
    await app.close();
  });
});

describe('isolation', () => {
  it('leaves parent routes untouched', async () => {
    const app = harness();
    expect((await get(app, '/v1/me', 'parent')).statusCode).toBe(200);
    await app.close();
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `node scripts/test-emulators-for.mjs "npx -y pnpm@10.34.7 --filter @just-imagine/api exec vitest run test/school-routes.test.ts"`
Expected: FAIL. TypeScript or vitest reports that `school` is not an `ApiOptions` field, or `/v1/school/me` returns 404.

- [ ] **Step 3: Implement the module**

`services/api/src/school/routes.ts`:

```ts
import type { FastifyInstance, FastifyRequest } from 'fastify';
import { z } from 'zod';
import { DocumentIdSchema, SCHOOL_ROUTES, STUDY_ROUTES } from '@just-imagine/protocol';
import {
  isSchoolSuspended,
  requireSchoolAdmin,
  requireStudent,
  SchoolRoleRequiredError,
  type SchoolAdminActor,
  type StudentActor,
} from '@just-imagine/server-core';
import { ApiFault } from '../errors';

declare module 'fastify' {
  interface FastifyRequest {
    schoolActor: SchoolAdminActor | null;
    studentActor: StudentActor | null;
  }
}

/** Injectable for tests; defaults verify Firebase ID tokens and read Firestore. */
export interface SchoolRouteOptions {
  verifySchoolAdmin?: (idToken: string, schoolId?: string) => Promise<SchoolAdminActor>;
  verifyStudent?: (idToken: string) => Promise<StudentActor>;
  isSchoolSuspended?: (schoolId: string) => Promise<boolean>;
}

const SchoolQuerySchema = z.object({ schoolId: DocumentIdSchema.optional() });

function bearer(req: FastifyRequest): string {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer '))
    throw new ApiFault(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  return header.slice(7);
}

function roleFault(error: unknown, forbidden: string): ApiFault {
  return error instanceof SchoolRoleRequiredError
    ? new ApiFault(403, 'FORBIDDEN', forbidden)
    : new ApiFault(401, 'UNAUTHENTICATED', 'Sign in again to continue.');
}

export function schoolActor(req: FastifyRequest): SchoolAdminActor {
  if (!req.schoolActor) throw new ApiFault(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  return req.schoolActor;
}
export function studentActor(req: FastifyRequest): StudentActor {
  if (!req.studentActor) throw new ApiFault(401, 'UNAUTHENTICATED', 'Sign in to continue.');
  return req.studentActor;
}

/**
 * Teacher routes (`/v1/school/*`) and student routes (`/v1/study/*`), each in its own
 * encapsulated scope so their guards never touch parent or admin routes. A super admin may
 * use teacher routes inside any school by passing `?schoolId=`.
 */
export function registerSchoolRoutes(app: FastifyInstance, options: SchoolRouteOptions = {}) {
  const verifySchoolAdmin = options.verifySchoolAdmin ?? requireSchoolAdmin;
  const verifyStudent = options.verifyStudent ?? requireStudent;
  const suspended = options.isSchoolSuspended ?? isSchoolSuspended;

  app.register(async (routes) => {
    routes.decorateRequest('schoolActor', null);
    routes.addHook('preHandler', async (req) => {
      const token = bearer(req);
      const { schoolId } = SchoolQuerySchema.parse(req.query ?? {});
      try {
        req.schoolActor = await verifySchoolAdmin(token, schoolId);
      } catch (error) {
        throw roleFault(error, 'This account is not a school administrator.');
      }
    });
    routes.get(SCHOOL_ROUTES.me.path, (req) => {
      const actor = schoolActor(req);
      return { uid: actor.uid, schoolId: actor.schoolId, superAdmin: actor.superAdmin };
    });
  });

  app.register(async (routes) => {
    routes.decorateRequest('studentActor', null);
    routes.addHook('preHandler', async (req) => {
      const token = bearer(req);
      try {
        req.studentActor = await verifyStudent(token);
      } catch (error) {
        throw roleFault(error, 'This is not a student account.');
      }
      if (await suspended(req.studentActor.schoolId))
        throw new ApiFault(403, 'FORBIDDEN', 'Your school is paused right now. Please ask your teacher.');
    });
    routes.get(STUDY_ROUTES.me.path, (req) => {
      const s = studentActor(req);
      return { uid: s.uid, schoolId: s.schoolId, studentId: s.studentId, classId: s.classId };
    });
  });
}
```

**Note on the 400 case:** `SchoolQuerySchema.parse` throws a `ZodError` inside the preHandler. The app's error handler turns `ZodError` into 400 `INVALID_ARGUMENT`, which the `a%2Fb` test expects.

- [ ] **Step 4: Register the module in `app.ts`, working tree first**

Re-read `services/api/src/app.ts`, then make three insertions:

1. After the line `import { FirestoreLearnStore, learnRoutes, type LearnStore } from './learn';` add:
   ```ts
   import { registerSchoolRoutes, type SchoolRouteOptions } from './school/routes';
   ```
2. In `interface ApiOptions`, after `stories?: FirestoreStoryStore;` add:
   ```ts
     /** Teacher (`/v1/school/*`) and student (`/v1/study/*`) routes; defaults use Firebase. */
     school?: SchoolRouteOptions;
   ```
3. Immediately after the closing `);` of the `registerAdminRoutes(...)` call add:
   ```ts
     registerSchoolRoutes(app, options.school);
   ```

- [ ] **Step 5: Run the tests, typecheck and lint**

Run: `node_modules/.bin/prettier --write services/api/src/school services/api/test/school-routes.test.ts && node scripts/test-emulators-for.mjs "npx -y pnpm@10.34.7 --filter @just-imagine/api exec vitest run test/school-routes.test.ts test/admin.test.ts test/app.test.ts" && npx -y pnpm@10.34.7 --filter @just-imagine/api typecheck && npx -y pnpm@10.34.7 --filter @just-imagine/api lint`
Expected: all PASS. The existing admin and app suites must stay green.

- [ ] **Step 6: Commit with only your insertions in `app.ts`**

```bash
test -z "$(git diff --cached --name-only)" || { echo "index not clean"; exit 1; }
git show HEAD:services/api/src/app.ts > "$SCRATCH/api-app.ts"
# Apply the same three insertions from Step 4 to "$SCRATCH/api-app.ts" with the Edit tool.
git update-index --cacheinfo 100644,"$(git hash-object -w "$SCRATCH/api-app.ts")",services/api/src/app.ts
git add services/api/src/school/routes.ts services/api/test/school-routes.test.ts
git diff --cached --stat   # expect exactly these three files
git diff --cached -- services/api/src/app.ts   # expect only the three insertions
git commit -m "feat(api): teacher and student route scopes

Adds encapsulated /v1/school and /v1/study scopes with their own guards, so teachers act only in their school (the super admin in any named school), students are refused while their school is paused, and parent and admin routes are unaffected."
git diff -- services/api/src/app.ts   # expect only Codex's uncommitted hunks
```

---

### Task 6: Whole-phase verification and handoff notes

**Files:**

- Modify: `CHECKPOINT.md` (append), `TODO.md` (tick S0)

- [ ] **Step 1: Run every affected suite**

Run:

```bash
npx -y pnpm@10.34.7 --filter @just-imagine/protocol test
node scripts/test-emulators-for.mjs "npx -y pnpm@10.34.7 --filter @just-imagine/server-core exec vitest run && npx -y pnpm@10.34.7 --filter @just-imagine/api test"
npx -y pnpm@10.34.7 --filter @just-imagine/protocol --filter @just-imagine/server-core --filter @just-imagine/api typecheck
npx -y pnpm@10.34.7 --filter @just-imagine/protocol --filter @just-imagine/server-core --filter @just-imagine/api lint
node_modules/.bin/prettier --check packages/protocol services/api/src/school firestore.indexes.json scripts/test-emulators-for.mjs
```

Expected: everything passes. If a pre-existing suite fails, check whether it also fails at HEAD without your changes, using `git stash` **only on your own new files**. Never stash Codex's work. Report the result honestly rather than fixing Codex's code.

- [ ] **Step 2: Record**

Append to `CHECKPOINT.md`:

```markdown

## Parallel session notes (Claude Code, 2026-10-17) — Schools S0 foundations landed

Committed: `packages/protocol/src/school.ts` (+ export line), admin audit enums for school/catalog/lesson, server-core `requireSchoolAdmin` / `requireStudent` / `isSchoolSuspended`, Firestore rules and indexes for `schools/**` and `lessons`, `services/api/src/school/routes.ts` registered in `app.ts` (three insertions), and `scripts/test-emulators-for.mjs` (one command inside throwaway emulators on 8085/9095). Codex: please review the `index.ts`, `admin.ts`, `auth.ts`, rules and `app.ts` insertions; your uncommitted hunks in `index.ts` and `app.ts` were left unstaged and are still in the working tree.
```

In `TODO.md`, change `- [ ] S0 Foundations:` to `- [x] S0 Foundations:`.

These two files stay uncommitted (they hold Codex's hunks).

---

## Self-review notes

- **Spec coverage:**

  | Spec section | Covered by |
  |---|---|
  | §4.1 principals | Tasks 1 and 3 |
  | §4.2 guards | Task 3 |
  | §5 data model | Task 1 (all documents and paths) and Task 4 (rules and indexes) |
  | §6 module layout and registration | Task 5 |
  | §17 anchored insertions | Tasks 1, 2, 4 and 5 |

- **Deferred deliberately:**

  | Item | Moved to |
  |---|---|
  | Invite acceptance, student login (§4.3, §4.4) | S1 and S2 |
  | Per-class `boardsVisible` enforcement | S5, which stores it; the board rule will read the class document then |
  | `AiReactionDoc` | S5, beside the fallback |
  | `tutor*` WebSocket messages | S6 |

- **Contract additions over the spec:**
  - A `labTask` quiz item kind and key, so chemistry goals are graded like sim tasks.
  - `boardsVisible` on classes.
  - `scope` and `classId` on board documents, so rules can scope reads without parsing ids.
  - These are recorded here for the spec's next revision.
- **Type consistency:** `SchoolAdminActor`, `StudentActor`, `schoolClaimsOf`, `studentUid`, `schoolPaths.*`, `registerSchoolRoutes` and `SchoolRouteOptions` are spelled identically across tasks.
