import { describe, expect, it } from 'vitest';
import type { LessonKeysDocSchema } from '@just-imagine/protocol';
import type { z } from 'zod';
import {
  classNameIssue,
  copiedLessonIds,
  filterStudents,
  lessonDraftIssues,
  parseJsonDraft,
  publishBlockers,
  rememberNotice,
  takeNotice,
  usernameIssue,
} from '../lib/school/console';
import type { Lesson } from '../lib/school/types';

const student = (id: string, firstName: string, classId = 'c1', username = id) => ({
  id,
  firstName,
  username,
  classId,
});

describe('student roster list', () => {
  it('sorts names naturally, so Student 2 comes before Student 10', () => {
    const list = [
      student('a', 'Student 10'),
      student('b', 'student 2'),
      student('c', 'Student 1'),
      student('d', 'Amina'),
    ];
    expect(filterStudents(list, {}).map((s) => s.firstName)).toEqual([
      'Amina',
      'Student 1',
      'student 2',
      'Student 10',
    ]);
  });

  it('searches names and usernames and filters by class', () => {
    const list = [
      student('a', 'রহিম', 'c1', 'rahim'),
      student('b', 'Karim', 'c2', 'karim.9b'),
      student('c', 'Mina', 'c1', 'mina'),
    ];
    expect(filterStudents(list, { query: ' RAH ' }).map((s) => s.id)).toEqual(['a']);
    expect(filterStudents(list, { query: '9b' }).map((s) => s.id)).toEqual(['b']);
    expect(filterStudents(list, { query: 'রহ' }).map((s) => s.id)).toEqual(['a']);
    expect(filterStudents(list, { classId: 'c1' }).map((s) => s.id)).toEqual(['c', 'a']);
  });
});

describe('class names', () => {
  const classes = [
    { id: 'c1', name: '9-A' },
    { id: 'c2', name: 'Science 10' },
  ];
  it('rejects blank, too long and duplicate names, ignoring case and spacing', () => {
    expect(classNameIssue('  ', classes)).toBe('empty');
    expect(classNameIssue('x'.repeat(41), classes)).toBe('tooLong');
    expect(classNameIssue(' 9-a ', classes)).toBe('duplicate');
    expect(classNameIssue('9-A', classes, 'c1')).toBeNull();
    expect(classNameIssue('9-B', classes)).toBeNull();
  });
});

describe('usernames', () => {
  const students = [student('a', 'Rahim', 'c1', 'rahim')];
  it('explains the rule and catches duplicates before the request', () => {
    expect(usernameIssue('', students)).toBe('required');
    expect(usernameIssue('ab', students)).toBe('format');
    expect(usernameIssue('.dot', students)).toBe('format');
    expect(usernameIssue('রহিম', students)).toBe('format');
    expect(usernameIssue(' Rahim ', students)).toBe('taken');
    expect(usernameIssue('rahim', students, 'a')).toBeNull();
    expect(usernameIssue('mina_9.a', students)).toBeNull();
  });
});

const text = (en: string, bn = en) => ({ en, bn });
const lesson = (over: Partial<Lesson> = {}): Lesson => ({
  id: 'w1',
  scope: 'school',
  schoolId: 's1',
  classIds: [],
  subject: 'physics',
  grade: 9,
  chapterId: 'physics-3',
  title: text('Friction', 'ঘর্ষণ'),
  steps: [
    { kind: 'intro', body: text('Push.', 'ঠেলো।') },
    {
      kind: 'quiz',
      items: [
        {
          id: 'q1',
          kind: 'mcq',
          prompt: text('Which force?', 'কোন বল?'),
          options: [text('Friction', 'ঘর্ষণ'), text('Gravity', 'অভিকর্ষ')],
          points: 2,
        },
      ],
    },
  ],
  status: 'draft',
  sourceLanguage: 'en',
  approved: { en: true, bn: true },
  authorUid: 't',
  revision: 3,
  updatedAt: 1,
  ...over,
});
const keys: z.infer<typeof LessonKeysDocSchema> = {
  revision: 3,
  items: {
    q1: {
      key: { kind: 'mcq', answer: 0 },
      hints: [text('Think about rubbing.', 'ঘষার কথা ভাবো।')],
    },
  },
};

describe('publish readiness', () => {
  it('lists every reason a lesson cannot be published yet', () => {
    expect(publishBlockers({ lesson: lesson(), keys, dirty: false, isNew: false })).toEqual([]);
    expect(publishBlockers({ lesson: lesson(), keys, dirty: true, isNew: false })).toEqual([
      'unsaved',
    ]);
    expect(
      publishBlockers({
        lesson: lesson({ approved: { en: false, bn: true } }),
        keys,
        dirty: false,
        isNew: false,
      }),
    ).toEqual(['approveEn']);
    const codes = publishBlockers({
      lesson: lesson({ approved: { en: false, bn: false }, title: text('', '') }),
      keys,
      dirty: false,
      isNew: false,
    });
    expect(codes).toContain('checks');
    expect(codes).toContain('approveEn');
    expect(codes).toContain('approveBn');
    expect(publishBlockers({ lesson: lesson(), keys, dirty: false, isNew: true })).toEqual(['new']);
    expect(
      publishBlockers({
        lesson: lesson({ status: 'published' }),
        keys,
        dirty: false,
        isNew: false,
      }),
    ).toEqual(['published']);
  });
});

describe('creating a lesson', () => {
  it('points at the first field to fix instead of sending an invalid request', () => {
    expect(lessonDraftIssues(lesson())).toEqual([]);
    expect(lessonDraftIssues(lesson({ title: text('', '') }))[0]).toEqual({
      field: 'title',
      code: 'title',
    });
    const wrongSim = lesson({
      chapterId: 'physics-1',
      steps: [
        {
          kind: 'explore',
          simId: 'newton-cart',
          params: {},
          lockedParams: [],
          prompts: [],
        },
      ],
    });
    expect(lessonDraftIssues(wrongSim)).toContainEqual({ field: 'step-0', code: 'simChapter' });
    const lab = lesson({ steps: [{ kind: 'lab', reagentIds: ['hcl'], goal: null }] });
    expect(lessonDraftIssues(lab)).toContainEqual({ field: 'step-0', code: 'labChapter' });
    const badPoints = lesson({
      steps: [
        {
          kind: 'check',
          item: { id: 'q1', kind: 'numeric', prompt: text('?'), unit: '', points: 0 },
        },
      ],
    });
    expect(lessonDraftIssues(badPoints)).toContainEqual({ field: 'item-q1', code: 'points' });
  });
});

describe('structured answer fields', () => {
  it('keeps partial JSON as text and only accepts it once it parses', () => {
    expect(parseJsonDraft('[{"x": 0, "y"')).toEqual({ ok: false });
    expect(parseJsonDraft('[{"x": 0, "y": 1}]')).toEqual({ ok: true, value: [{ x: 0, y: 1 }] });
  });
});

describe('shared lesson copies', () => {
  it('finds which shared lessons this school already copied, including older copies', () => {
    const shared = lesson({ id: 'g1', scope: 'global', title: text('Motion', 'গতি') });
    const old = lesson({ id: 'g2', scope: 'global', title: text('Circuits', 'বর্তনী') });
    const school = [
      lesson({ id: 's1', copiedFrom: 'g1' }),
      lesson({ id: 's2', title: text('Circuits', 'বর্তনী'), chapterId: old.chapterId }),
      lesson({ id: 's3', copiedFrom: 'g9', status: 'archived' }),
    ];
    expect(copiedLessonIds(school, [shared, old])).toEqual(
      new Map([
        ['g1', 's1'],
        ['g2', 's2'],
      ]),
    );
  });
});

describe('notices across a route replace', () => {
  it('hands a saved notice to the next page once', () => {
    const store = new Map<string, string>();
    const storage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, v),
      removeItem: (k: string) => void store.delete(k),
    };
    rememberNotice('lesson:w1', 'Saved', storage);
    expect(takeNotice('lesson:w1', storage)).toBe('Saved');
    expect(takeNotice('lesson:w1', storage)).toBe('');
  });
});
