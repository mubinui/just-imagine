import { describe, expect, it } from 'vitest';
import {
  lessonPublicationChecks,
  lessonTextUsesLanguage,
  preservesLessonNumbers,
  preservesLessonFacts,
} from '../src/lesson-quality';
import { LessonDocSchema, LessonKeysDocSchema } from '../src/school';
const text = (en: string, bn: string) => ({ en, bn });
const lesson = () =>
  LessonDocSchema.parse({
    scope: 'global',
    schoolId: null,
    classIds: [],
    subject: 'physics',
    grade: 9,
    chapterId: 'physics-3',
    title: text('Force and motion', 'বল ও গতি'),
    sourceLanguage: 'en',
    status: 'draft',
    approved: { en: false, bn: false },
    authorUid: 'teacher',
    revision: 0,
    updatedAt: 1,
    steps: [
      {
        kind: 'intro',
        body: text('An unbalanced force changes velocity.', 'লব্ধি বল বেগের পরিবর্তন ঘটায়।'),
      },
      {
        kind: 'explore',
        simId: 'newton-cart',
        params: {},
        lockedParams: [],
        prompts: [
          text(
            'Predict, change the force, then compare the acceleration.',
            'অনুমান করো, বল বদলাও, তারপর ত্বরণ তুলনা করো।',
          ),
        ],
      },
      {
        kind: 'quiz',
        items: [
          {
            id: 'q1',
            kind: 'mcq',
            prompt: text('Which quantity changes?', 'কোন রাশি বদলায়?'),
            options: [text('Velocity', 'বেগ'), text('Mass', 'ভর')],
            points: 2,
          },
        ],
      },
    ],
  });
const keys = () =>
  LessonKeysDocSchema.parse({
    revision: 0,
    items: {
      q1: {
        key: { kind: 'mcq', answer: 0 },
        hints: [text('Use the definition of acceleration.', 'ত্বরণের সংজ্ঞা ব্যবহার করো।')],
      },
    },
  });
describe('lesson publication readiness', () => {
  it('distinguishes automated readiness from optional pedagogical recommendations', () => {
    const report = lessonPublicationChecks(lesson(), keys());
    expect(report.ready).toBe(true);
    expect(report.issues).toEqual([{ code: 'no-practice', severity: 'warning' }]);
  });
  it('blocks empty, placeholder and wrong-language content including private hints', () => {
    const l = lesson(),
      k = keys();
    l.title.bn = 'Force and motion';
    l.steps[0] = { kind: 'intro', body: text('TODO.', '') };
    k.items.q1!.hints[0]!.bn = '';
    const report = lessonPublicationChecks(l, k);
    expect(report.ready).toBe(false);
    expect(report.issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'language', field: 'title', language: 'bn' }),
        expect.objectContaining({ code: 'placeholder', field: 'explanation', language: 'en' }),
        expect.objectContaining({ code: 'empty-text', field: 'hint', language: 'bn' }),
      ]),
    );
  });
  it('blocks indistinguishable options after Unicode/whitespace/case normalization', () => {
    const l = lesson(),
      quiz = l.steps[2];
    if (quiz?.kind !== 'quiz' || quiz.items[0]?.kind !== 'mcq') throw Error('fixture');
    quiz.items[0].options[1] = text(' VELOCITY\u00a0', ' বেগ ');
    expect(
      lessonPublicationChecks(l, keys()).issues.filter((i) => i.code === 'duplicate-option'),
    ).toHaveLength(2);
  });
  it('requires teaching before a quiz, useful activity instructions and a private task witness', () => {
    const l = lesson(),
      k = keys();
    l.steps.shift();
    l.steps[0] = {
      kind: 'explore',
      simId: 'newton-cart',
      params: {},
      lockedParams: [],
      prompts: [],
    };
    const quiz = l.steps[1];
    if (quiz?.kind !== 'quiz') throw Error('fixture');
    quiz.items.push({
      id: 'task',
      kind: 'simTask',
      simId: 'newton-cart',
      startParams: {},
      editableParams: ['force'],
      prompt: text('Adjust the force.', 'বল বদলাও।'),
      points: 2,
    });
    k.items.task = {
      key: { kind: 'simTask', predicate: 'justMoves', args: {} },
      hints: [text('Compare static friction.', 'স্থিতি ঘর্ষণ তুলনা করো।')],
    };
    expect(lessonPublicationChecks(l, k).issues.map((i) => i.code)).toEqual(
      expect.arrayContaining(['missing-intro', 'missing-instruction', 'missing-example']),
    );
    l.steps = [l.steps[0]!];
    expect(lessonPublicationChecks(l, k).issues.some((i) => i.code === 'missing-quiz')).toBe(true);
  });
  it('requires a stated lab goal and rejects repeated graded questions across sections', () => {
    const l = lesson();
    l.steps.push({ kind: 'lab', reagentIds: ['hcl'], goal: null });
    const quiz = l.steps[2];
    if (quiz?.kind !== 'quiz') throw Error('fixture');
    l.steps.push({ kind: 'quiz', items: [{ ...quiz.items[0]!, id: 'q2' }] });
    const k = keys();
    k.items.q2 = structuredClone(k.items.q1!);
    expect(lessonPublicationChecks(l, k).issues.map((i) => i.code)).toEqual(
      expect.arrayContaining(['missing-goal', 'duplicate-question']),
    );
  });
});
describe('scientific prose guards', () => {
  it('keeps common SI units attached to their values across script changes', () => {
    expect(preservesLessonFacts('Mass 2 kg, force 10 N', 'ভর ২ কেজি, বল ১০ নিউটন')).toBe(true);
    expect(preservesLessonFacts('Mass 2 kg, force 10 N', 'ভর ১০ kg, বল ২ N')).toBe(false);
    expect(preservesLessonFacts('Speed 12 m/s', 'বেগ ১২ km/h')).toBe(false);
  });
  it('permits formulas, SI notation and Greek variables without accepting English prose as Bangla', () => {
    expect(lessonTextUsesLanguage('HCl + NaOH → NaCl + H₂O', 'bn')).toBe(true);
    expect(lessonTextUsesLanguage('sin θ = ০.৫', 'bn')).toBe(true);
    expect(lessonTextUsesLanguage('Force changes motion.', 'bn')).toBe(false);
    expect(lessonTextUsesLanguage('The mass is ২ kg.', 'bn')).toBe(false);
    expect(lessonTextUsesLanguage('বল changes motion.', 'en')).toBe(false);
  });
  it('preserves numeric facts across scripts/notation but rejects altered, missing or extra facts', () => {
    expect(
      preservesLessonNumbers('v=12.0 m/s after 4 s; a=−2 m/s²', '৪ s পরে v=১২ m/s; a=-২ m/s²'),
    ).toBe(true);
    expect(preservesLessonNumbers('mass 2 kg, force 10 N', 'ভর ২ kg, বল ১১ N')).toBe(false);
    expect(preservesLessonNumbers('2 kg', 'ভর')).toBe(false);
    expect(preservesLessonNumbers('Force changes motion.', '2 N বল গতি বদলায়।')).toBe(false);
  });
});
