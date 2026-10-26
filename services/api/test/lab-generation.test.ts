import { describe, it, expect } from 'vitest';
import { checkLockedSimTask, SIMS } from '@just-imagine/stem-sims';
import type { LabProposal } from '@just-imagine/protocol';
import { generateLab } from '../src/school/lab-generation';
import type { SchoolModel } from '../src/school/ai';

const operator = { uid: 'operator_lab', email: null, superAdmin: true, schoolId: null };
const request = {
  subject: 'physics',
  grade: 9,
  chapterId: 'physics-2',
  title: { en: 'Projectiles', bn: 'প্রক্ষেপক' },
  description: 'A ball launched from a cliff; students find the angle that hits the target.',
  language: 'en',
};
const start = { speed: 20, angle: 30, height: 10, gravity: 9.8 };
const target = Number(SIMS.projectile.solve({ ...start, angle: 45 }).range);

function proposal(change: (p: LabProposal) => void = () => {}): LabProposal {
  const p: LabProposal = {
    step: {
      kind: 'explore',
      simId: 'projectile',
      params: start,
      lockedParams: ['gravity'],
      prompts: [
        {
          en: 'Predict: which angle lands furthest?',
          bn: 'আগে অনুমান: কোন কোণে বল সবচেয়ে দূরে পড়বে?',
        },
        { en: 'Observe: change the angle and read the range.', bn: 'দেখো: কোণ বদলে পাল্লা পড়ো।' },
        {
          en: 'Explain: why does the height change the best angle?',
          bn: 'ব্যাখ্যা: উচ্চতা কেন সেরা কোণ বদলায়?',
        },
      ],
    },
    task: {
      item: {
        id: 'lab1',
        kind: 'simTask',
        prompt: {
          en: 'Change the angle so the ball hits the target.',
          bn: 'কোণ বদলে বলটি লক্ষ্যে ফেলো।',
        },
        simId: 'projectile',
        startParams: start,
        editableParams: ['angle'],
        points: 3,
      },
      key: {
        kind: 'simTask',
        predicate: 'hitsTarget',
        args: { x: target, tol: 0.5 },
        exampleAnswer: { angle: 45 },
      },
      hints: [
        { en: 'Compare the range at two angles first.', bn: 'আগে দুটি কোণে পাল্লা তুলনা করো।' },
        {
          en: 'From a height, the best angle is lower than on flat ground.',
          bn: 'উঁচু থেকে ছুড়লে সেরা কোণ সমতলের চেয়ে কম হয়।',
        },
      ],
    },
    summary: { en: 'A ball launched from a cliff', bn: 'খাড়া পাড় থেকে ছোড়া বল' },
  };
  change(p);
  return p;
}
/** A fake model that answers from a queue and records every prompt it was sent. */
function scripted(...answers: unknown[]) {
  const prompts: string[] = [];
  const model: SchoolModel = async (prompt) => {
    prompts.push(prompt);
    return answers.shift();
  };
  return { model, prompts };
}

describe('generateLab', () => {
  it('returns a validated proposal for a projectile description', async () => {
    const { model, prompts } = scripted(proposal());
    const result = await generateLab(operator, request, model);
    expect(prompts).toHaveLength(1);
    expect(result.step.simId).toBe('projectile');
    const task = result.task!;
    const check = { predicate: task.key.predicate, args: task.key.args };
    expect(checkLockedSimTask(task.item, task.key.exampleAnswer, check)).toEqual({
      ok: true,
      met: true,
    });
    expect(checkLockedSimTask(task.item, {}, check)).toEqual({ ok: true, met: false });
  });

  it('accepts a Bangla description and keeps both languages in the proposal', async () => {
    const description = 'খাড়া পাড় থেকে বল ছোড়ো; শিক্ষার্থীরা লক্ষ্যে ফেলার কোণ খুঁজবে।';
    const { model, prompts } = scripted(proposal());
    const result = await generateLab(operator, { ...request, description, language: 'bn' }, model);
    expect(prompts[0]).toContain(JSON.stringify(description).slice(1, -1));
    expect(result.step.prompts.every((p) => p.en && p.bn)).toBe(true);
  });

  it('accepts a lab without a graded task', async () => {
    const { model } = scripted(proposal((p) => (p.task = null)));
    expect((await generateLab(operator, request, model)).task).toBeNull();
  });

  it('only offers the chapter’s simulations and quotes the description as data', async () => {
    const { model, prompts } = scripted(proposal());
    await generateLab(operator, request, model);
    for (const sim of ['motion-graphs', 'projectile', 'vector-addition'])
      expect(prompts[0]).toContain(`"${sim}"`);
    expect(prompts[0]).not.toContain('"ohms-circuit"');
    expect(prompts[0]).toContain(JSON.stringify(request.description).slice(1, -1));
    expect(prompts[0]).toMatch(/quoted data/i);
  });

  it('refuses a chapter with no simulations without calling the model', async () => {
    const { model, prompts } = scripted(proposal());
    await expect(
      generateLab(operator, { ...request, chapterId: 'physics-8' }, model),
    ).rejects.toMatchObject({
      status: 400,
      message: expect.stringMatching(/no simulations/i),
    });
    expect(prompts).toHaveLength(0);
  });

  it('refuses a chapter from another subject and an actor who is not a teacher', async () => {
    const { model } = scripted(proposal());
    await expect(
      generateLab(operator, { ...request, chapterId: 'chemistry-9' }, model),
    ).rejects.toMatchObject({
      status: 400,
    });
    const parent = { uid: 'p', email: null, superAdmin: false, schoolId: null };
    await expect(generateLab(parent, request, model)).rejects.toMatchObject({ status: 403 });
  });

  it('retries once with the validation message when the simulation is outside the chapter', async () => {
    const wrong = proposal((p) => {
      p.step.simId = 'ohms-circuit';
      p.step.params = { emf: 6, topology: 'series', resistors: [10, 20] };
      p.step.lockedParams = [];
      p.task = null;
    });
    const { model, prompts } = scripted(wrong, proposal());
    const result = await generateLab(operator, request, model);
    expect(prompts).toHaveLength(2);
    expect(prompts[1]).toMatch(/not assigned to this chapter/);
    expect(result.step.simId).toBe('projectile');
  });

  it('fails with 503 after two invalid proposals', async () => {
    const bad = proposal((p) => (p.step.params = { ...start, speed: 400 }));
    const { model, prompts } = scripted(bad, bad);
    await expect(generateLab(operator, request, model)).rejects.toMatchObject({
      status: 503,
      message: expect.stringMatching(/could not build a valid lab/i),
    });
    expect(prompts).toHaveLength(2);
  });

  it('rejects a task already solved at its start', async () => {
    const solved = proposal((p) => {
      p.task!.item.startParams = { ...start, angle: 45 };
    });
    const { model, prompts } = scripted(solved, solved);
    await expect(generateLab(operator, request, model)).rejects.toMatchObject({ status: 503 });
    expect(prompts[1]).toMatch(/already solved/);
  });

  it('rejects a task without an example answer, or one that misses the goal', async () => {
    const missing = proposal((p) => delete p.task!.key.exampleAnswer);
    const wrong = proposal((p) => (p.task!.key.exampleAnswer = { angle: 10 }));
    const first = scripted(missing, missing);
    await expect(generateLab(operator, request, first.model)).rejects.toMatchObject({
      status: 503,
    });
    expect(first.prompts[1]).toMatch(/example answer/i);
    const second = scripted(wrong, wrong);
    await expect(generateLab(operator, request, second.model)).rejects.toMatchObject({
      status: 503,
    });
    expect(second.prompts[1]).toMatch(/example solution does not meet/);
  });

  it('rejects a task on a different simulation from the step', async () => {
    const mismatch = proposal((p) => {
      p.task!.item.simId = 'motion-graphs';
      p.task!.item.startParams = { u: 4, a: 2, duration: 4 };
      p.task!.item.editableParams = ['a'];
    });
    const { model, prompts } = scripted(mismatch, proposal());
    await generateLab(operator, request, model);
    expect(prompts[1]).toMatch(/same simulation/);
  });

  it('checks the hints’ language too', async () => {
    const hint = proposal((p) => (p.task!.hints[0]!.bn = 'Compare the range at two angles first.'));
    const { model, prompts } = scripted(hint, proposal());
    await generateLab(operator, request, model);
    expect(prompts[1]).toMatch(/Bangla/);
  });

  it('rejects text in the wrong language', async () => {
    const english = proposal(
      (p) => (p.step.prompts[0]!.bn = 'Predict: which angle lands furthest?'),
    );
    const { model, prompts } = scripted(english, proposal());
    await generateLab(operator, request, model);
    expect(prompts[1]).toMatch(/Bangla/);
  });

  it('rejects a prompt or hint that gives away the example answer', async () => {
    const prompt = proposal(
      (p) => (p.task!.item.prompt.en = 'Change the angle (45° works) so the ball hits the target.'),
    );
    const hint = proposal((p) => (p.task!.hints[1]!.bn = 'কোণ ৪৫° করে দেখো।'));
    for (const leak of [prompt, hint]) {
      const { model, prompts } = scripted(leak, leak);
      await expect(generateLab(operator, request, model)).rejects.toMatchObject({ status: 503 });
      expect(prompts[1]).toMatch(/gives away the answer/);
    }
  });

  it('allows a given quantity that happens to equal the answer', async () => {
    const given = proposal((p) => {
      p.task!.item.startParams = { ...start, height: 45 };
      p.task!.item.prompt.en = 'From a 45 m cliff, change the angle so the ball hits the target.';
      const range = Number(SIMS.projectile.solve({ ...start, height: 45, angle: 45 }).range);
      p.task!.key.args = { x: range, tol: 0.5 };
    });
    const { model } = scripted(given);
    await expect(generateLab(operator, request, model)).resolves.toMatchObject({
      summary: given.summary,
    });
  });

  it('stops on a kill switch or model error during the repair round', async () => {
    const wrong = proposal((p) => (p.step.params = { ...start, speed: 400 }));
    const model: SchoolModel = async (prompt) => {
      if (prompt.includes('It was rejected'))
        throw Object.assign(new Error('School AI is paused by the operator.'), { status: 503 });
      return wrong;
    };
    await expect(generateLab(operator, request, model)).rejects.toMatchObject({
      message: expect.stringMatching(/paused/),
    });
  });

  it('skips the repair round when the first answer used most of the request time', async () => {
    const wrong = proposal((p) => (p.step.params = { ...start, speed: 400 }));
    const { model, prompts } = scripted(wrong, proposal());
    let now = 0;
    const clock = () => (now += 160_000);
    await expect(generateLab(operator, request, model, clock)).rejects.toMatchObject({
      status: 503,
    });
    expect(prompts).toHaveLength(1);
  });

  it('treats a malformed answer like an invalid proposal', async () => {
    const { model, prompts } = scripted({ step: 'projectile' }, proposal());
    const result = await generateLab(operator, request, model);
    expect(prompts).toHaveLength(2);
    expect(result.step.simId).toBe('projectile');
  });
});
