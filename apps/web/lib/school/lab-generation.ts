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

export type StartValue = {
  label: string;
  value: string;
  role: 'locked' | 'open' | 'task' | 'fixed';
};

const number = (value: number, language: Lang) =>
  new Intl.NumberFormat(language === 'bn' ? 'bn-BD' : 'en', { maximumFractionDigits: 3 })
    .format(value)
    .replace(/,/g, '');

/** Visible parameters of a simulation with their labels and units, in the given language. */
function valueRows(
  simId: string,
  values: Record<string, unknown>,
  language: Lang,
  role: (name: string) => StartValue['role'],
): StartValue[] {
  const i = language === 'bn' ? 1 : 0;
  return (PARAMS[simId as SimId] ?? [])
    .filter((spec) => Object.hasOwn(values, spec.id) && (!spec.when || spec.when(values)))
    .map((spec) => {
      const raw = values[spec.id];
      const shown = (v: unknown) => (typeof v === 'number' ? number(v, language) : String(v));
      const value =
        spec.kind === 'choice'
          ? (spec.options.find((o) => o.value === raw)?.label[i] ?? String(raw))
          : [
              Array.isArray(raw) ? raw.map(shown).join(', ') : shown(raw),
              unitText(spec.unit, language),
            ]
              .filter(Boolean)
              .join(' ');
      return { label: spec.label[i], value, role: role(spec.id) };
    });
}

/** The explore step's starting values: locked, or free for students to change while exploring. */
export function labStartValues(step: LabProposal['step'], language: Lang): StartValue[] {
  return valueRows(step.simId, step.params, language, (name) =>
    step.lockedParams.includes(name) ? 'locked' : 'open',
  );
}

/** Where the graded task starts: the values students change for it, and the ones it fixes. */
export function labTaskValues(
  task: NonNullable<LabProposal['task']>,
  language: Lang,
): StartValue[] {
  return valueRows(task.item.simId, task.item.startParams, language, (name) =>
    task.item.editableParams.includes(name) ? 'task' : 'fixed',
  );
}

/** Why an accepted proposal would no longer fit the lesson, or '' when it does. */
export function labProposalFits(
  lesson: Pick<Lesson, 'subject' | 'chapterId' | 'steps'>,
  requested: Pick<Lesson, 'subject' | 'chapterId'>,
  proposal: LabProposal,
): '' | 'changed' | 'full' {
  if (lesson.subject !== requested.subject || lesson.chapterId !== requested.chapterId)
    return 'changed';
  return lesson.steps.length + (proposal.task ? 2 : 1) > 20 ? 'full' : '';
}
