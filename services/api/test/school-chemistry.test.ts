import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as Common from '../src/school/common';
import type * as Ai from '../src/school/ai';
const fixtures = vi.hoisted(() => ({ db: vi.fn(), reserve: vi.fn() }));
vi.mock('../src/school/common', async (importOriginal) => ({
  ...(await importOriginal<typeof Common>()),
  db: fixtures.db,
}));
vi.mock('../src/school/ai', async (importOriginal) => ({
  ...(await importOriginal<typeof Ai>()),
  reserveAi: fixtures.reserve,
}));
import { react, validatePredictedReaction } from '../src/school/chemistry';
import { REACTIONS } from '@just-imagine/stem-content';
import type { StudentActor } from '@just-imagine/server-core';
const actor: StudentActor = {
  uid: 'qa',
  schoolId: 'school',
  classId: 'class',
  studentId: 'student',
};
beforeEach(() => vi.clearAllMocks());
describe('deterministic chemistry observations', () => {
  it('returns a single acid and indicator without cache, quota or provider work', async () => {
    const model = vi.fn();
    const response = await react(
      actor,
      {
        reagentIds: ['hcl', 'litmus'],
        heat: false,
        amounts: { hcl: { volumeMl: 50, concentrationM: 0.01 } },
      },
      model,
    );
    expect(response).toMatchObject({
      status: 'observation',
      source: 'table',
      result: { reaction: null, indicator: { id: 'litmus' } },
    });
    expect(response.result?.ph).toBeCloseTo(2);
    expect(fixtures.db).not.toHaveBeenCalled();
    expect(fixtures.reserve).not.toHaveBeenCalled();
    expect(model).not.toHaveBeenCalled();
  });
  it('keeps unsupported concentration pH unknown without asking a model to invent it', async () => {
    const model = vi.fn();
    const response = await react(
      actor,
      {
        reagentIds: ['hcl', 'phenolphthalein'],
        heat: false,
        amounts: { hcl: { volumeMl: 50, concentrationM: 1 } },
      },
      model,
    );
    expect(response).toMatchObject({
      status: 'observation',
      result: { ph: null, indicator: { colour: null } },
    });
    expect(model).not.toHaveBeenCalled();
    expect(fixtures.db).not.toHaveBeenCalled();
  });
  it('rejects invented pH on an otherwise curated balanced prediction', () => {
    const source =
      REACTIONS.find((r) => r.id === 'neutralisation-hcl-naoh') ??
      REACTIONS.find((r) => r.reagents.includes('hcl') && r.reagents.includes('naoh'))!;
    const { phAfter: _ph, ...qualitative } = source;
    expect(validatePredictedReaction(qualitative, source.reagents, source.requires.heat)).toBe(
      true,
    );
    expect(
      validatePredictedReaction(
        { ...qualitative, phAfter: 7 },
        source.reagents,
        source.requires.heat,
      ),
    ).toBe(false);
  });
});
