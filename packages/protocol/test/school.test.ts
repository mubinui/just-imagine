import { describe, it, expect } from 'vitest';
import {
  boardId,
  LessonDocSchema,
  LessonFieldsSchema,
  missingLanguages,
  refineLesson,
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
    expect(LessonDocSchema.safeParse(lesson({ scope: 'class', classIds: [] })).success).toBe(false);
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

  it('exposes refinement-free fields so create and patch bodies can be derived', () => {
    const Body = LessonFieldsSchema.omit({ authorUid: true, revision: true, updatedAt: true });
    const { authorUid: _a, revision: _r, updatedAt: _u, ...body } = lesson();
    expect(Body.parse(body)).toEqual(body);
    expect(Body.safeParse({ ...body, revision: 3 }).success).toBe(true);
    expect(() => LessonFieldsSchema.partial()).not.toThrow();
    const Checked = Body.superRefine(refineLesson);
    expect(Checked.safeParse({ ...body, scope: 'class', classIds: [] }).success).toBe(false);
    expect(Checked.safeParse(body).success).toBe(true);
  });
});
