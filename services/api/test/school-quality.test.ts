import { describe, it, expect } from 'vitest';
import { DEMO_LESSONS } from '../src/school/demo-lessons';
import { validateLesson } from '../src/school/lessons';
import { assistLessonText } from '../src/school/authoring';

describe('publication model verification', () => {
  it('rejects an invalid or missing witness without forbidding an unfinished draft', () => {
    const copy = structuredClone(DEMO_LESSONS[1]!);
    const task = Object.values(copy.keys.items).find((entry) => entry.key.kind === 'simTask')!;
    if (task.key.kind !== 'simTask') throw Error('fixture');
    delete task.key.exampleAnswer;
    expect(() => validateLesson(copy.lesson, copy.keys)).not.toThrow();
    expect(() => validateLesson(copy.lesson, copy.keys, true)).toThrow(/publication checks/);
    task.key.exampleAnswer = { force: 0 };
    expect(() => validateLesson(copy.lesson, copy.keys)).toThrow(/example solution/);
    task.key.exampleAnswer = { force: 5.9, mass: 1 };
    expect(() => validateLesson(copy.lesson, copy.keys)).toThrow(/example solution/);
    task.key.exampleAnswer = { force: 5.9 };
    expect(() => validateLesson(copy.lesson, copy.keys, true)).not.toThrow();
  });
  it('rejects intro-only publication and missing bilingual hints', () => {
    const copy = structuredClone(DEMO_LESSONS[1]!);
    copy.lesson.steps = [copy.lesson.steps[0]!];
    copy.keys.items = {};
    expect(() => validateLesson(copy.lesson, copy.keys)).not.toThrow();
    expect(() => validateLesson(copy.lesson, copy.keys, true)).toThrow(/publication checks/);
    const other = structuredClone(DEMO_LESSONS[1]!);
    Object.values(other.keys.items)[0]!.hints[0]!.bn = '';
    expect(() => validateLesson(other.lesson, other.keys, true)).toThrow(/publication checks/);
  });
  it('rejects simulation tasks already solved at the initial settings', () => {
    const copy = structuredClone(DEMO_LESSONS[4]!);
    const item = copy.lesson.steps
      .flatMap((step) => (step.kind === 'quiz' ? step.items : []))
      .find((q) => q.kind === 'simTask')!;
    if (item.kind !== 'simTask') throw Error('fixture');
    const key = copy.keys.items[item.id]!.key;
    if (key.kind !== 'simTask' || !key.exampleAnswer) throw Error('fixture');
    item.startParams = { ...item.startParams, ...key.exampleAnswer };
    expect(() => validateLesson(copy.lesson, copy.keys, true)).toThrow(/already solved/);
  });
});
describe('AI text quality enforcement', () => {
  const actor = { uid: 'operator_quality', email: null, superAdmin: true, schoolId: null };
  const request = {
    subject: 'physics',
    grade: 9,
    chapterId: 'physics-3',
    title: { en: 'Force', bn: 'বল' },
    field: 'explanation',
    language: 'en',
    text: 'The cart has a mass of 2 kg.',
  };
  it('rejects a changed numerical fact and an answer in the wrong language', async () => {
    await expect(
      assistLessonText(actor, request, async () => ({ text: 'The cart has a mass of 3 kg.' })),
    ).rejects.toMatchObject({ status: 503 });
    await expect(
      assistLessonText(actor, { ...request, language: 'bn' }, async () => ({ text: request.text })),
    ).rejects.toMatchObject({ status: 503 });
    await expect(
      assistLessonText(actor, request, async () => ({ text: 'A cart of mass 2 kg is used.' })),
    ).resolves.toMatchObject({ text: 'A cart of mass 2 kg is used.' });
  });
});
