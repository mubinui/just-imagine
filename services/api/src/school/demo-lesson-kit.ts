/** Builders for the seeded example lessons; every lesson passes the same publish checks as teacher lessons. */
import {
  LessonDocSchema,
  LessonKeysDocSchema,
  type QuizItem,
  type QuizKey,
} from '@just-imagine/protocol';
export const t = (en: string, bn: string) => ({ en, bn });
export type Question = { item: QuizItem; key: QuizKey };
export type Text = ReturnType<typeof t>;
export const hints = (en1: string, bn1: string, en2: string, bn2: string): [Text, Text] => [
  t(en1, bn1),
  t(en2, bn2),
];
export type Support = {
  objective: Text;
  example: Text;
  assumptions: Text;
  misconception: Text;
  prompts: [Text, Text, Text];
  practice: Question;
  positions: Record<string, number>;
  hints: Record<string, [Text, Text]>;
  exampleAnswer: unknown;
};
export function mcq(
  id: string,
  en: string,
  bn: string,
  options: [string, string][],
  answer: number,
): Question {
  return {
    item: {
      id,
      kind: 'mcq',
      prompt: t(en, bn),
      options: options.map(([e, b]) => t(e, b)),
      points: 2,
    },
    key: { kind: 'mcq', answer },
  };
}
export function numeric(id: string, en: string, bn: string, value: number, unit: string): Question {
  return {
    item: { id, kind: 'numeric', prompt: t(en, bn), unit, points: 2 },
    key: { kind: 'numeric', value, tolerance: { mode: 'abs', amount: 0.01 } },
  };
}
export function task(
  id: string,
  en: string,
  bn: string,
  simId: string,
  params: Record<string, unknown>,
  editable: string[],
  predicate: string,
  args: unknown,
): Question {
  return {
    item: {
      id,
      kind: 'simTask',
      prompt: t(en, bn),
      simId,
      startParams: params,
      editableParams: editable,
      points: 3,
    },
    key: { kind: 'simTask', predicate, args },
  };
}
function positionAnswer(question: Question, position: number | undefined): Question {
  if (question.item.kind !== 'mcq' || question.key.kind !== 'mcq' || position === undefined)
    return question;
  const answer = question.key.answer;
  const correct = question.item.options[answer]!;
  const options = question.item.options.filter((_, index) => index !== answer);
  options.splice(position, 0, correct);
  return { item: { ...question.item, options }, key: { ...question.key, answer: position } };
}
export function lesson(
  slug: string,
  subject: 'physics' | 'math' | 'chemistry',
  chapterId: string,
  title: ReturnType<typeof t>,
  body: ReturnType<typeof t>,
  play: Record<string, unknown>,
  questions: Question[],
  support: Support,
  grade: 9 | 10 = 9,
) {
  const allQuestions = questions.map((question) => {
    const positioned = positionAnswer(question, support.positions[question.item.id]);
    return positioned.key.kind === 'simTask' || positioned.key.kind === 'labTask'
      ? { ...positioned, key: { ...positioned.key, exampleAnswer: support.exampleAnswer } }
      : positioned;
  });
  const practice = positionAnswer(support.practice, support.positions.check1);
  const intro = t(
    [
      body.en,
      'Learning goals: ' + support.objective.en,
      'Worked example: ' + support.example.en,
      'Model assumptions: ' + support.assumptions.en,
      'Watch out: ' + support.misconception.en,
    ].join('\n\n'),
    [
      body.bn,
      'শিখন লক্ষ্য: ' + support.objective.bn,
      'উদাহরণ: ' + support.example.bn,
      'মডেলের অনুমান: ' + support.assumptions.bn,
      'খেয়াল করো: ' + support.misconception.bn,
    ].join('\n\n'),
  );
  const guidedPlay =
    play.kind === 'explore'
      ? { ...play, prompts: support.prompts }
      : {
          ...play,
          goal: t(
            support.prompts.map((prompt) => prompt.en).join('\n\n'),
            support.prompts.map((prompt) => prompt.bn).join('\n\n'),
          ),
        };
  const doc = LessonDocSchema.parse({
    scope: 'global',
    schoolId: null,
    classIds: [],
    subject,
    grade,
    chapterId,
    title,
    steps: [
      { kind: 'intro', body: intro },
      guidedPlay,
      { kind: 'check', item: practice.item },
      { kind: 'quiz', items: allQuestions.map((q) => q.item) },
    ],
    status: 'published',
    sourceLanguage: 'en',
    approved: { en: true, bn: true },
    authorUid: 'school-demo-seed',
    revision: 2,
    updatedAt: 1,
  });
  const keys = LessonKeysDocSchema.parse({
    revision: 2,
    items: Object.fromEntries(
      [practice, ...allQuestions].map((q) => [
        q.item.id,
        {
          key: q.key,
          hints: support.hints[q.item.id]!,
        },
      ]),
    ),
  });
  return { slug, lesson: doc, keys };
}
export const explore = (
  simId: string,
  params: Record<string, unknown>,
  en: string,
  bn: string,
) => ({
  kind: 'explore',
  simId,
  params,
  lockedParams: [],
  prompts: [t(en, bn)],
});
