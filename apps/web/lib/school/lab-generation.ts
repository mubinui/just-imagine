import type { LabGenerateRequest, LabProposal } from '@just-imagine/protocol';
import type { SimId } from '@just-imagine/stem-sims';
import { PARAMS, unitText } from '../stem/sim-params';
import type { Lesson, LessonKeys } from './types';

type Lang = 'en' | 'bn';
export const LAB_DESCRIPTION_MIN = 8;
export const LAB_DESCRIPTION_MAX = 800;

/** The first `labN` id that no question in the lesson uses. */
export function freeLabItemId(lesson: Pick<Lesson, 'steps'>): string {
  const used = new Set(
    lesson.steps.flatMap((step) =>
      step.kind === 'quiz'
        ? step.items.map((i) => i.id)
        : step.kind === 'check'
          ? [step.item.id]
          : [],
    ),
  );
  let n = 1;
  while (used.has(`lab${n}`)) n++;
  return `lab${n}`;
}

/** The lesson and keys once a proposal is accepted: its explore step, then its task as a one-question quiz. */
export function acceptLabProposal(
  lesson: Lesson,
  keys: LessonKeys,
  proposal: LabProposal,
): { lesson: Lesson; keys: LessonKeys } {
  const task = proposal.task;
  if (!task) return { lesson: { ...lesson, steps: [...lesson.steps, proposal.step] }, keys };
  const id = freeLabItemId(lesson);
  return {
    lesson: {
      ...lesson,
      steps: [...lesson.steps, proposal.step, { kind: 'quiz', items: [{ ...task.item, id }] }],
    },
    keys: { ...keys, items: { ...keys.items, [id]: { key: task.key, hints: task.hints } } },
  };
}

export function labRequest(
  lesson: Lesson,
  description: string,
  language: Lang,
): LabGenerateRequest {
  return {
    subject: lesson.subject,
    grade: lesson.grade,
    chapterId: lesson.chapterId,
    title: lesson.title,
    description: description.trim(),
    language,
  };
}

/** Why generation cannot start yet, or '' when it can. A lab adds up to two of the 20 steps. */
export function labBlocker(state: {
  chapterSims: number;
  steps: number;
  admin: boolean;
  reason: string;
  description: string;
}): '' | 'noSims' | 'full' | 'reason' | 'short' {
  if (state.chapterSims === 0) return 'noSims';
  if (state.steps > 18) return 'full';
  if (state.admin && state.reason.trim().length < 3) return 'reason';
  if (state.description.trim().length < LAB_DESCRIPTION_MIN) return 'short';
  return '';
}

export type StartValue = { label: string; value: string; role: 'locked' | 'task' | 'open' };

/** Each visible starting value with its unit: locked, changed for the task, or free to explore. */
export function labStartValues(
  step: LabProposal['step'],
  task: LabProposal['task'],
  language: Lang,
): StartValue[] {
  const i = language === 'bn' ? 1 : 0;
  const values = step.params;
  return (PARAMS[step.simId as SimId] ?? [])
    .filter((spec) => Object.hasOwn(values, spec.id) && (!spec.when || spec.when(values)))
    .map((spec) => {
      const raw = values[spec.id];
      const value =
        spec.kind === 'choice'
          ? (spec.options.find((o) => o.value === raw)?.label[i] ?? String(raw))
          : [Array.isArray(raw) ? raw.join(', ') : String(raw), unitText(spec.unit, language)]
              .filter(Boolean)
              .join(' ');
      const role = step.lockedParams.includes(spec.id)
        ? 'locked'
        : task?.item.editableParams.includes(spec.id)
          ? 'task'
          : 'open';
      return { label: spec.label[i], value, role };
    });
}
