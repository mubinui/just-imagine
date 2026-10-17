import { describe, expect, it } from 'vitest';
import { SIMS, SIM_IDS } from '@just-imagine/stem-sims';
import { PARAMS } from '../components/stem/SimView';
import {
  LAB_PREDICATES,
  argLabel,
  paramLabel,
  predicateLabel,
  simLabel,
} from '../lib/school/authoring-labels';

describe('teacher-facing authoring labels', () => {
  it('names every simulation, control and target in both languages without internal codes', () => {
    for (const lang of ['en', 'bn'] as const)
      for (const id of SIM_IDS) {
        expect(simLabel(id, lang)).not.toBe(id);
        const keys = [
          ...PARAMS[id].map((p) => p.id),
          ...(id === 'ohms-circuit' ? ['topology', 'resistors'] : []),
        ];
        for (const key of keys) expect(paramLabel(id, key, lang)).not.toBe(key);
        for (const [name, predicate] of Object.entries(SIMS[id].predicates)) {
          expect(predicateLabel(name, lang)).not.toBe(name);
          const shape =
            (predicate.args as unknown as { shape?: Record<string, unknown> }).shape ?? {};
          for (const arg of Object.keys(shape)) expect(argLabel(name, arg, lang)).not.toBe(arg);
        }
      }
    for (const name of LAB_PREDICATES) expect(predicateLabel(name, 'bn')).not.toBe(name);
  });

  it('falls back to a readable name for a simulation added later', () => {
    expect(simLabel('wave-tank', 'en')).toBe('Wave tank');
  });
});
