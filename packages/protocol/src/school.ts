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

/** Text proposals only: applying, saving and approving remain explicit teacher actions. */
export const LessonTextAssistRequestSchema = z.object({
  subject: SchoolSubjectSchema,
  grade: SchoolGradeSchema,
  chapterId: ChapterIdSchema,
  title: BilingualTextSchema,
  field: z.enum(['title', 'explanation', 'instruction', 'goal', 'question', 'option', 'hint']),
  language: LanguageSchema,
  text: z.string().max(4000),
  instruction: z.string().trim().max(800).default(''),
  context: z.string().max(4000).default(''),
});
export type LessonTextAssistRequest = z.infer<typeof LessonTextAssistRequestSchema>;
export const LessonTextAssistResponseSchema = z.object({
  text: z.string().trim().min(1).max(4000),
});
export type LessonTextAssistResponse = z.infer<typeof LessonTextAssistResponseSchema>;

export const SchoolAdminClaimsSchema = z.object({
  role: z.literal('schoolAdmin'),
  schoolId: DocumentIdSchema,
});
export const StudentClaimsSchema = z.object({
  role: z.literal('student'),
  authVersion: z.number().int().nonnegative().default(0),
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
  authVersion: z.number().int().nonnegative().default(0),
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
const ReagentIdsSchema = z
  .array(z.string().regex(/^[a-z0-9-]+$/))
  .min(1)
  .max(12);

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

/** Lesson fields without cross-field checks, so `.omit()`/`.partial()` work for request bodies. */
export const LessonFieldsSchema = z.object({
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
});
export type LessonFields = z.infer<typeof LessonFieldsSchema>;

/** Cross-field lesson checks; apply with `.superRefine(refineLesson)` to bodies derived above. */
export function refineLesson(
  l: Pick<LessonFields, 'scope' | 'schoolId' | 'classIds' | 'steps'>,
  ctx: z.RefinementCtx,
): void {
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
}

export const LessonDocSchema = LessonFieldsSchema.superRefine(refineLesson);
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
    computedFrom: z
      .object({ simId: SimRefSchema, params: ParamsSchema, observable: z.string().max(64) })
      .optional(),
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
      answer: z.unknown().optional(),
      tries: z.number().int().nonnegative(),
      firstCorrectAt: EpochMsSchema.nullable(),
      // Absent on legacy records: the historical attempt cannot be reconstructed.
      firstCorrectTry: z.number().int().positive().optional(),
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
  return period === 'all' ? `${base}_all` : `${base}_week_${DateKeySchema.parse(period.weekKey)}`;
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
  classes: { method: 'GET', path: '/v1/school/classes' },
  students: { method: 'GET', path: '/v1/school/students' },
  importStudents: { method: 'POST', path: '/v1/school/students/import' },
  lessons: { method: 'GET', path: '/v1/school/lessons' },
  results: { method: 'GET', path: '/v1/school/results' },
  boards: { method: 'GET', path: '/v1/school/boards' },
  acceptInvite: { method: 'POST', path: '/v1/school/invites/accept' },
} as const;
export const STUDY_ROUTES = {
  me: { method: 'GET', path: '/v1/study/me' },
  login: { method: 'POST', path: '/v1/study/login' },
  preferences: { method: 'PATCH', path: '/v1/study/me' },
  lessons: { method: 'GET', path: '/v1/study/lessons' },
  check: { method: 'POST', path: '/v1/study/lessons/:id/check' },
  quiz: { method: 'POST', path: '/v1/study/lessons/:id/quiz' },
  hint: { method: 'POST', path: '/v1/study/lessons/:id/hint' },
  react: { method: 'POST', path: '/v1/study/react' },
  boards: { method: 'GET', path: '/v1/study/boards' },
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

export const ADMIN_SCHOOL_ROUTES = {
  schools: { method: 'GET', path: '/v1/admin/schools' },
  createSchool: { method: 'POST', path: '/v1/admin/schools' },
  catalog: { method: 'GET', path: '/v1/admin/catalog' },
  lessons: { method: 'GET', path: '/v1/admin/lessons' },
} as const;
