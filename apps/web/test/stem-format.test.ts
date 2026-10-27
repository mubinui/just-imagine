import { describe, expect, it } from 'vitest';
import { REAGENTS } from '@just-imagine/stem-content';
import {
  formatNumber,
  linearEquation,
  snapToStep,
  simName,
  isTimedSim,
  tutorScreen,
} from '../components/stem/sim-format';
import { groupReagents, phRangeIssue, limitingSummary } from '../components/stem/lab-logic';

describe('simulation number formatting', () => {
  it('uses Bangla digits in Bangla mode and a true minus sign', () => {
    expect(formatNumber(-1.5, 'en')).toBe('−1.5');
    expect(formatNumber(12.25, 'bn')).toBe('১২.২৫');
    expect(formatNumber(1e-12, 'en')).toBe('0');
    expect(formatNumber(null, 'en')).toBe('—');
  });
  it('writes a readable line equation', () => {
    expect(linearEquation(-1.5, -3, 'en')).toBe('y = −1.5x − 3');
    expect(linearEquation(2, 4, 'en')).toBe('y = 2x + 4');
    expect(linearEquation(1, 0, 'en')).toBe('y = x');
    expect(linearEquation(-1, 2, 'en')).toBe('y = −x + 2');
    expect(linearEquation(0, -3, 'en')).toBe('y = −3');
    expect(linearEquation(0.5, 1, 'bn')).toBe('y = ০.৫x + ১');
  });
  it('snaps a dragged value to the slider step within range', () => {
    const p = { min: -10, max: 10, step: 0.1 };
    expect(snapToStep(7.142857142857143, p)).toBe(7.1);
    expect(snapToStep(-0.04, p)).toBe(0);
    expect(snapToStep(12, p)).toBe(10);
    expect(snapToStep(44.6, { min: 0, max: 360, step: 1 })).toBe(45);
  });
  it('names simulations for assistive technology and knows which ones run in time', () => {
    expect(simName('ohms-circuit', 'en')).toBe("Ohm's law circuit");
    expect(simName('unit-circle', 'bn')).toMatch(/[ঀ-৿]/);
    expect(isTimedSim('motion-graphs')).toBe(true);
    expect(isTimedSim('ohms-circuit')).toBe(false);
  });
});

describe('chemistry bench', () => {
  it('groups every reagent once, with indicators in their own group', () => {
    const groups = groupReagents(REAGENTS);
    expect(groups.flatMap((g) => g.reagents).length).toBe(REAGENTS.length);
    expect(groups.find((g) => g.id === 'indicator')?.reagents.map((r) => r.id)).toEqual([
      'litmus',
      'phenolphthalein',
      'methyl-orange',
    ]);
    expect(groups[0]!.id).toBe('acid');
  });
  it('explains when a concentration is outside the ideal pH range', () => {
    expect(
      phRangeIssue({
        reagentIds: ['hcl'],
        heat: false,
        amounts: { hcl: { volumeMl: 50, concentrationM: 1 } },
      }),
    ).toEqual({ id: 'hcl', concentrationM: 1 });
    expect(
      phRangeIssue({
        reagentIds: ['hcl'],
        heat: false,
        amounts: { hcl: { volumeMl: 50, concentrationM: 0.1 } },
      }),
    ).toBeNull();
  });
  it('says nothing is left over when amounts react exactly', () => {
    const reaction = { equation: 'HCl + NaOH -> NaCl + H2O' };
    expect(
      limitingSummary(
        { limitingReagent: 'hcl', remainingMoles: { hcl: 0, naoh: 0 } },
        reaction,
        REAGENTS,
      ),
    ).toEqual({ kind: 'exact' });
    expect(
      limitingSummary(
        { limitingReagent: 'hcl', remainingMoles: { hcl: 0, naoh: 0.002 } },
        reaction,
        REAGENTS,
      ),
    ).toEqual({ kind: 'limiting', formula: 'HCl', leftover: [{ formula: 'NaOH', moles: 0.002 }] });
  });
});

describe('what the tutor is told about the screen', () => {
  it('includes the student settings, so a change the readings do not show still reaches the tutor', () => {
    const before = tutorScreen(
      'motion-graphs',
      { u: 2, a: 0, duration: 10 },
      { t: 0, x: 0, v: 2 },
      {
        finalX: 20,
      },
    );
    const after = tutorScreen(
      'motion-graphs',
      { u: 2, a: 1.5, duration: 10 },
      { t: 0, x: 0, v: 2 },
      {
        finalX: 95,
      },
    );
    expect(before).toMatchObject({
      sim: 'Motion graphs: position and velocity over time',
      settings: { u: 2, a: 0, duration: 10 },
      reading: { t: 0, x: 0, v: 2 },
      result: { finalX: 20 },
    });
    expect(JSON.stringify(after)).not.toBe(JSON.stringify(before));
  });
  it('stays under the 2 KB tutor limit by dropping the least useful parts first', () => {
    const big = Object.fromEntries(Array.from({ length: 120 }, (_, i) => [`k${i}`, i * 1.2345]));
    const screen = tutorScreen('ohms-circuit', { topology: 'series', resistors: [1, 2] }, big, big);
    expect(new TextEncoder().encode(JSON.stringify(screen)).length).toBeLessThanOrEqual(2048);
    expect(screen.settings).toEqual({ topology: 'series', resistors: [1, 2] });
  });
});
