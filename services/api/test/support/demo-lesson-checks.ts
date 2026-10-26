import { describe, expect, it } from 'vitest';
import { checkLockedSimTask, gradeLabSubmission, type LabTask } from '@just-imagine/stem-sims';
import { REAGENTS, REACTIONS } from '@just-imagine/stem-content';
import type { DEMO_LESSONS } from '../../src/school/demo-lessons';
import { validateLesson } from '../../src/school/lessons';

export type LessonEntry = (typeof DEMO_LESSONS)[number];
type Pair = [en: string, bn: string];

/** Facts written independently of the lesson source, so a typo in a lesson cannot pass itself. */
export interface LessonExpectations {
  /** The correct option of every multiple-choice item, per lesson slug and item id. */
  mcq: Record<string, Record<string, Pair>>;
  /** Per lesson slug: an answer that must not meet its simulation or lab task. */
  failures: Record<string, unknown>;
  /** Per lesson slug and item id: the numeric answer, computed from the defining relation. */
  numeric: Record<string, Record<string, number>>;
}

export const itemsOf = (entry: LessonEntry) =>
  entry.lesson.steps.flatMap((step) =>
    step.kind === 'quiz' ? step.items : step.kind === 'check' ? [step.item] : [],
  );
const bengali = /\p{Script=Bengali}/u;

/**
 * The example-lesson bar: publishable, bilingual, guided, six distinct items with two
 * progressive hints each, independently checked answers and a solvable, non-trivial task.
 * `strict` adds the rules every lesson written after the first seven follows: Bangla script in
 * every Bangla text and exactly three multiple-choice items whose answers sit at positions 0, 1, 2.
 */
export function describeLessonQuality(
  title: string,
  entries: readonly LessonEntry[],
  expected: LessonExpectations,
  { strict = true }: { strict?: boolean } = {},
) {
  describe(title, () => {
    for (const entry of entries) {
      const { slug, lesson, keys } = entry;
      describe(slug, () => {
        it('passes the publish checks with aligned key revisions', () => {
          expect(() => validateLesson(lesson, keys, true)).not.toThrow();
          expect(keys.revision).toBe(lesson.revision);
          expect(lesson.revision).toBe(2);
        });

        it('teaches goals, a worked example, assumptions and a misconception in both languages', () => {
          const intro = lesson.steps.find((step) => step.kind === 'intro');
          if (intro?.kind !== 'intro') throw new Error('Missing introduction');
          for (const label of [
            'Learning goals:',
            'Worked example:',
            'Model assumptions:',
            'Watch out:',
          ])
            expect(intro.body.en).toContain(label);
          for (const label of ['শিখন লক্ষ্য:', 'উদাহরণ:', 'মডেলের অনুমান:', 'খেয়াল করো:'])
            expect(intro.body.bn).toContain(label);
          const play = lesson.steps.find((step) => step.kind === 'explore' || step.kind === 'lab');
          const texts =
            play?.kind === 'explore'
              ? play.prompts
              : play?.kind === 'lab' && play.goal
                ? [play.goal]
                : [];
          const en = texts.map((text) => text.en).join('\n');
          const bn = texts.map((text) => text.bn).join('\n');
          for (const stage of ['Predict:', 'Observe:', 'Explain:']) expect(en).toContain(stage);
          for (const stage of ['আগে অনুমান:', 'দেখো:', 'ব্যাখ্যা:']) expect(bn).toContain(stage);
          if (strict) {
            expect(lesson.title.bn).toMatch(bengali);
            for (const text of texts) expect(text.bn).toMatch(bengali);
          }
        });

        it('has six distinct items with two specific, progressive hints each', () => {
          const items = itemsOf(entry);
          expect(items).toHaveLength(6);
          for (const language of ['en', 'bn'] as const)
            expect(new Set(items.map((item) => item.prompt[language])).size).toBe(items.length);
          for (const item of items) {
            if (strict) expect(item.prompt.bn).toMatch(bengali);
            const hints = keys.items[item.id]!.hints;
            expect(hints).toHaveLength(2);
            expect(hints[0]).not.toEqual(hints[1]);
            for (const hint of hints) {
              expect(hint.en).not.toContain(
                'Use the model’s readings and compare one change at a time.',
              );
              expect(hint.bn).toMatch(bengali);
            }
          }
        });

        it('marks the independently specified option correct in both languages', () => {
          const mcqs = itemsOf(entry).filter((item) => item.kind === 'mcq');
          const answers: number[] = [];
          for (const item of mcqs) {
            const key = keys.items[item.id]!.key;
            if (key.kind !== 'mcq') throw new Error(`${item.id}: wrong key kind`);
            const want = expected.mcq[slug]?.[item.id];
            expect(want, `${slug}/${item.id} needs an expected answer`).toBeDefined();
            expect(item.options[key.answer]).toEqual({ en: want![0], bn: want![1] });
            for (const language of ['en', 'bn'] as const)
              expect(
                new Set(item.options.map((option) => option[language].trim().toLowerCase())).size,
              ).toBe(item.options.length);
            answers.push(key.answer);
          }
          if (strict) expect(answers.sort()).toEqual([0, 1, 2]);
        });

        it('has a task with a reachable solution and a meaningful failing counterexample', () => {
          const item = itemsOf(entry).find((q) => q.kind === 'simTask' || q.kind === 'labTask');
          if (!item) throw new Error('Missing task');
          const key = keys.items[item.id]!.key;
          if (item.kind === 'simTask' && key.kind === 'simTask') {
            const task = { predicate: key.predicate, args: key.args };
            expect(checkLockedSimTask(item, {}, task)).toEqual({ ok: true, met: false });
            expect(checkLockedSimTask(item, key.exampleAnswer, task)).toEqual({
              ok: true,
              met: true,
            });
            expect(checkLockedSimTask(item, expected.failures[slug], task)).toEqual({
              ok: true,
              met: false,
            });
            expect(Object.keys(key.exampleAnswer!)).toEqual(item.editableParams);
          } else if (item.kind === 'labTask' && key.kind === 'labTask') {
            type Submission = Parameters<typeof gradeLabSubmission>[1];
            const grade = (answer: unknown) =>
              gradeLabSubmission(
                item,
                answer as Submission,
                key.task as LabTask,
                REAGENTS,
                REACTIONS,
              );
            expect(grade(key.exampleAnswer)).toMatchObject({ ok: true, met: true });
            expect(grade(expected.failures[slug])).toMatchObject({ ok: true, met: false });
          } else throw new Error('Task and key kinds differ');
        });

        it('matches every numeric key to an independent calculation', () => {
          for (const item of itemsOf(entry)) {
            const key = keys.items[item.id]!.key;
            if (key.kind !== 'numeric') continue;
            const want = expected.numeric[slug]?.[item.id];
            expect(want, `${slug}/${item.id} needs an independent value`).toBeDefined();
            expect(key.value).toBeCloseTo(want!, 9);
          }
        });
      });
    }
  });
}
