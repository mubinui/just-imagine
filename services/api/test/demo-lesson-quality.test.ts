import { describe, expect, it } from 'vitest';
import {
  checkLockedSimTask,
  gradeLabSubmission,
  SIMS,
  mix,
  parseEquation,
  type SimId,
  type LabTask,
} from '@just-imagine/stem-sims';
import { REAGENTS, REACTIONS } from '@just-imagine/stem-content';
import { DEMO_LESSONS } from '../src/school/demo-lessons';
import { validateLesson } from '../src/school/lessons';

const expectedMcq: Record<string, Record<string, [string, string]>> = {
  motion: {
    check1: ['A horizontal line above zero', 'শূন্যের ওপরে অনুভূমিক রেখা'],
    q1: ['Acceleration', 'ত্বরণ'],
    q5: ['Velocity', 'বেগ'],
  },
  cart: { q1: ['Friction', 'ঘর্ষণ'], q5: ['Half', 'অর্ধেক'] },
  circuit: {
    check1: ['Set the source to 12 V', 'উৎস 12 V করো'],
    q1: ['V=IR', 'V=IR'],
    q5: ['Voltage', 'বিভব পার্থক্য'],
  },
  linear: {
    check1: ['The line moves up by 2 units', 'রেখা 2 একক ওপরে সরে'],
    q1: ['m', 'm'],
    q5: ['Zero', 'শূন্য'],
  },
  circle: {
    check1: ['The vertical y-coordinate', 'উল্লম্ব y-স্থানাঙ্ক'],
    q1: ['Vertical y', 'উল্লম্ব y'],
    q5: ['Undefined', 'অসংজ্ঞায়িত'],
  },
  'acid-base': {
    check1: ['NaOH', 'NaOH'],
    q1: ['Below 7', '7-এর নিচে'],
    q4: ['Basic', 'ক্ষারীয়'],
    q5: ['Salt and water', 'লবণ ও পানি'],
  },
  reactions: {
    check1: [
      'Reactants and the supported balanced equation',
      'বিক্রিয়ক ও সমর্থিত সমতাযুক্ত সমীকরণ',
    ],
    q1: ['Atoms are conserved', 'পরমাণু সংরক্ষিত থাকে'],
    q4: ['Silver chloride', 'সিলভার ক্লোরাইড'],
    q5: ['Hydrogen', 'হাইড্রোজেন'],
  },
};
const failures: Record<string, unknown> = {
  motion: { a: 1 },
  cart: { force: 10 },
  circuit: { emf: 3 },
  linear: { m: 2 },
  circle: { angleDeg: 30 },
  'acid-base': {
    reagentIds: ['hcl', 'naoh'],
    heat: false,
    amounts: {
      hcl: { volumeMl: 100, concentrationM: 0.1 },
      naoh: { volumeMl: 50, concentrationM: 0.1 },
    },
  },
  reactions: { reagentIds: ['hcl', 'zn'], heat: false },
};
const itemsOf = (entry: (typeof DEMO_LESSONS)[number]) =>
  entry.lesson.steps.flatMap((step) =>
    step.kind === 'quiz' ? step.items : step.kind === 'check' ? [step.item] : [],
  );

describe('original bilingual demo lesson quality', () => {
  it('publishes seven complete original lessons with aligned key revisions', () => {
    expect(DEMO_LESSONS).toHaveLength(7);
    for (const entry of DEMO_LESSONS) {
      expect(() => validateLesson(entry.lesson, entry.keys, true)).not.toThrow();
      expect(entry.keys.revision).toBe(entry.lesson.revision);
      expect(entry.lesson.revision).toBe(2);
    }
  });

  it('provides objectives, worked examples, assumptions and misconception support in both languages', () => {
    for (const entry of DEMO_LESSONS) {
      const intro = entry.lesson.steps.find((step) => step.kind === 'intro')!;
      if (intro.kind !== 'intro') throw new Error('Missing introduction');
      for (const label of [
        'Learning goals:',
        'Worked example:',
        'Model assumptions:',
        'Watch out:',
      ])
        expect(intro.body.en).toContain(label);
      for (const label of ['শিখন লক্ষ্য:', 'উদাহরণ:', 'মডেলের অনুমান:', 'খেয়াল করো:'])
        expect(intro.body.bn).toContain(label);
      const play = entry.lesson.steps.find(
        (step) => step.kind === 'explore' || step.kind === 'lab',
      )!;
      const text =
        play.kind === 'explore'
          ? play.prompts.map((prompt) => prompt.en).join('\n')
          : play.kind === 'lab'
            ? play.goal!.en
            : '';
      for (const stage of ['Predict:', 'Observe:', 'Explain:']) expect(text).toContain(stage);
      const bn =
        play.kind === 'explore'
          ? play.prompts.map((prompt) => prompt.bn).join('\n')
          : play.kind === 'lab'
            ? play.goal!.bn
            : '';
      for (const stage of ['আগে অনুমান:', 'দেখো:', 'ব্যাখ্যা:']) expect(bn).toContain(stage);
    }
  });

  it('keeps practice distinct, every question unique and two specific progressive hints per item', () => {
    const allHints: { en: string; bn: string }[] = [];
    for (const entry of DEMO_LESSONS) {
      const items = itemsOf(entry);
      expect(items).toHaveLength(6);
      for (const language of ['en', 'bn'] as const) {
        expect(new Set(items.map((item) => item.prompt[language])).size).toBe(items.length);
      }
      for (const item of items) {
        const hints = entry.keys.items[item.id]!.hints;
        expect(hints).toHaveLength(2);
        expect(hints[0]).not.toEqual(hints[1]);
        for (const hint of hints) {
          expect(hint.en).not.toContain(
            'Use the model’s readings and compare one change at a time.',
          );
          expect(hint.bn).toMatch(/\p{Script=Bengali}/u);
          allHints.push(hint);
        }
      }
    }
    expect(allHints).toHaveLength(84);
    expect(new Set(allHints.map((hint) => hint.en)).size).toBe(84);
    expect(new Set(allHints.map((hint) => hint.bn)).size).toBe(84);
  });

  it('balances answer positions while preserving independently specified scientific meanings and language pairing', () => {
    const positions = [0, 0, 0];
    for (const entry of DEMO_LESSONS)
      for (const item of itemsOf(entry)) {
        if (item.kind !== 'mcq') continue;
        const key = entry.keys.items[item.id]!.key;
        if (key.kind !== 'mcq') throw new Error('Wrong MCQ key');
        const expected = expectedMcq[entry.slug]![item.id]!;
        expect(item.options[key.answer]).toEqual({ en: expected[0], bn: expected[1] });
        for (const language of ['en', 'bn'] as const)
          expect(
            new Set(item.options.map((option) => option[language].trim().toLowerCase())).size,
          ).toBe(item.options.length);
        positions[key.answer]!++;
      }
    expect(positions).toEqual([7, 7, 8]);
  });

  for (const entry of DEMO_LESSONS)
    it(`${entry.slug}: task has a reachable valid solution and a meaningful failing counterexample`, () => {
      const item = itemsOf(entry).find(
        (question) => question.kind === 'simTask' || question.kind === 'labTask',
      )!;
      const key = entry.keys.items[item.id]!.key;
      if (item.kind === 'simTask' && key.kind === 'simTask') {
        const task = { predicate: key.predicate, args: key.args };
        expect(checkLockedSimTask(item, {}, task)).toEqual({ ok: true, met: false });
        expect(checkLockedSimTask(item, key.exampleAnswer, task)).toEqual({ ok: true, met: true });
        expect(checkLockedSimTask(item, failures[entry.slug], task)).toEqual({
          ok: true,
          met: false,
        });
        expect(Object.keys(key.exampleAnswer!)).toEqual(item.editableParams);
      } else if (item.kind === 'labTask' && key.kind === 'labTask') {
        type Submission = Parameters<typeof gradeLabSubmission>[1];
        expect(
          gradeLabSubmission(
            item,
            key.exampleAnswer as Submission,
            key.task as LabTask,
            REAGENTS,
            REACTIONS,
          ),
        ).toMatchObject({ ok: true, met: true });
        expect(
          gradeLabSubmission(
            item,
            failures[entry.slug] as Submission,
            key.task as LabTask,
            REAGENTS,
            REACTIONS,
          ),
        ).toMatchObject({ ok: true, met: false });
      } else throw new Error('Missing task/key');
    });

  it('checks every numeric key against an independent calculation or deterministic reading', () => {
    const solve = (id: SimId, params: unknown) => {
      const model = SIMS[id];
      return model.solve(model.params.parse(params) as never);
    };
    const motion = solve('motion-graphs', { u: 4, a: 2, duration: 4 });
    const cart = solve('newton-cart', { mass: 2, force: 10, muS: 0.3, muK: 0.2 });
    const circuit = solve('ohms-circuit', { emf: 6, topology: 'series', resistors: [10, 20] });
    const neutral = mix(
      {
        reagentIds: ['hcl', 'naoh'],
        heat: false,
        amounts: {
          hcl: { volumeMl: 50, concentrationM: 0.1 },
          naoh: { volumeMl: 50, concentrationM: 0.1 },
        },
      },
      REAGENTS,
      REACTIONS,
    );
    const hydrogenAtoms = parseEquation('2H2 + O2 -> 2H2O').reactants[0]!.coefficient * 2;
    // Expected answers use the defining relations independently of the solver output.
    const expected: Record<string, Record<string, number>> = {
      motion: { q2: 4 + 2 * 4, q4: 4 * 4 + 0.5 * 2 * 4 ** 2 },
      cart: {
        check1: 4,
        q2: 0.3 * 2 * 9.8,
        q4: (10 - 0.2 * 2 * 9.8) / 2,
      },
      circuit: { q2: 10 + 20, q4: 6 / (10 + 20) },
      linear: { q2: 2 * 3 + 1, q4: 1 },
      circle: { q2: Math.sin(Math.PI / 6), q4: Math.cos(0) },
      'acid-base': { q2: 7 },
      reactions: { q2: 2 * 2 },
    };
    let count = 0;
    for (const entry of DEMO_LESSONS)
      for (const item of itemsOf(entry)) {
        const key = entry.keys.items[item.id]!.key;
        if (key.kind !== 'numeric') continue;
        expect(key.value).toBeCloseTo(expected[entry.slug]![item.id]!, 9);
        count++;
      }
    expect(count).toBe(13);
    expect(Number(motion.finalV)).toBe(4 + 2 * 4);
    expect(Number(motion.finalX)).toBe(4 * 4 + 0.5 * 2 * 4 ** 2);
    expect(Number(cart.staticLimit)).toBeCloseTo(0.3 * 2 * 9.8);
    expect(Number(solve('newton-cart', { mass: 2, force: 4, muS: 0.3, muK: 0.2 }).friction)).toBe(
      4,
    );
    expect(Number(cart.a)).toBeCloseTo((10 - 0.2 * 2 * 9.8) / 2);
    expect(Number(circuit.req)).toBe(10 + 20);
    expect(Number(circuit.current)).toBeCloseTo(6 / (10 + 20));
    expect(neutral.ph).toBe(7);
    expect(hydrogenAtoms).toBe(2 * 2);
  });
});
