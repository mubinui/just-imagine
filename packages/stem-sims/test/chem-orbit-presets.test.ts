import { describe, it, expect } from 'vitest';
import { orbit } from '../src/physics/orbit';
import { phIndicator } from '../src/chem/ph';
import { titration } from '../src/chem/titration';
import { flameTest, FLAMES } from '../src/chem/flame';
import { reactionRate, type RateParams } from '../src/chem/rate';
import { gasLaw } from '../src/chem/gas';

describe('orbit', () => {
  it('stays circular at the circular speed and escapes at the escape speed', () => {
    const base = { planetMass: 6, radius: 7, speed: 0 };
    const vc = orbit.solve({ ...base, speed: 1 })['circularSpeed'] as number;
    expect(orbit.solve({ ...base, speed: vc })['kind']).toBe(0);
    expect(orbit.solve({ ...base, speed: vc * 1.2 })['kind']).toBe(1);
    expect(orbit.solve({ ...base, speed: vc * 1.5 })['kind']).toBe(2);
    expect(
      orbit.predicates['orbitIs']!.test(
        { ...base, speed: vc * 1.5 },
        orbit.solve({ ...base, speed: vc * 1.5 }),
        { kind: 'escape' },
      ),
    ).toBe(true);
  });
  it('follows Kepler: the period of a circular orbit is 2πr/v', () => {
    const p = { planetMass: 6, radius: 7, speed: 1 };
    const vc = orbit.solve(p)['circularSpeed'] as number;
    const o = orbit.solve({ ...p, speed: vc });
    expect(o['periodHours'] as number).toBeCloseTo((2 * Math.PI * 7e6) / (vc * 1000) / 3600, 3);
  });
  it('returns to the launch point after one period on screen', () => {
    const p = { planetMass: 6, radius: 7, speed: 1 };
    const vc = orbit.solve(p)['circularSpeed'] as number;
    const q = { ...p, speed: vc * 1.1 };
    const start = orbit.at(q, 0);
    const back = orbit.at(q, orbit.solve(q)['screenPeriod'] as number);
    expect(back['x']).toBeCloseTo(start['x'] as number, 1);
    expect(back['y']).toBeCloseTo(start['y'] as number, 1);
  });
});

describe('pH and indicators', () => {
  it('computes pH for strong and weak acids and bases', () => {
    expect(
      phIndicator.solve({ substance: 'hcl', concentration: 0.01, indicator: 'universal' })['ph'],
    ).toBeCloseTo(2, 6);
    expect(
      phIndicator.solve({ substance: 'naoh', concentration: 0.01, indicator: 'universal' })['ph'],
    ).toBeCloseTo(12, 6);
    expect(
      phIndicator.solve({ substance: 'ethanoic', concentration: 0.1, indicator: 'universal' })[
        'ph'
      ],
    ).toBeCloseTo(2.87, 1);
    expect(
      phIndicator.solve({ substance: 'water', concentration: 0.1, indicator: 'universal' })['ph'],
    ).toBeCloseTo(7, 6);
  });
  it('turns each indicator its real colour', () => {
    const colour = (
      substance: 'hcl' | 'naoh' | 'water',
      indicator: 'litmus' | 'phenolphthalein' | 'methylOrange' | 'bromothymol',
    ) => phIndicator.solve({ substance, concentration: 0.01, indicator })['colour'];
    expect(colour('hcl', 'litmus')).toBe(phIndicator.colourCode('red'));
    expect(colour('naoh', 'litmus')).toBe(phIndicator.colourCode('blue'));
    expect(colour('hcl', 'phenolphthalein')).toBe(phIndicator.colourCode('colourless'));
    expect(colour('naoh', 'phenolphthalein')).toBe(phIndicator.colourCode('magenta'));
    expect(
      phIndicator.solve({ substance: 'naoh', concentration: 0.0001, indicator: 'phenolphthalein' })[
        'colour'
      ],
    ).toBe(phIndicator.colourCode('pink'));
    expect(colour('naoh', 'methylOrange')).toBe(phIndicator.colourCode('yellow'));
    expect(colour('water', 'bromothymol')).toBe(phIndicator.colourCode('green'));
  });
});

describe('titration', () => {
  it('reaches equivalence at Ca·Va/Cb for a strong acid and base', () => {
    const p = {
      acid: 'hcl' as const,
      acidConcentration: 0.1,
      acidVolume: 25,
      baseConcentration: 0.1,
      baseAdded: 25,
      indicator: 'phenolphthalein' as const,
    };
    const o = titration.solve(p);
    expect(o['equivalenceVolume']).toBeCloseTo(25, 9);
    expect(o['ph']).toBeCloseTo(7, 6);
    expect(titration.solve({ ...p, baseAdded: 10 })['ph'] as number).toBeLessThan(2);
    expect(titration.solve({ ...p, baseAdded: 30 })['ph'] as number).toBeGreaterThan(11);
  });
  it('is basic at the equivalence point of a weak acid', () => {
    const o = titration.solve({
      acid: 'ethanoic',
      acidConcentration: 0.1,
      acidVolume: 25,
      baseConcentration: 0.1,
      baseAdded: 25,
      indicator: 'phenolphthalein',
    });
    expect(o['ph']).toBeCloseTo(8.72, 1);
    const half = titration.solve({
      acid: 'ethanoic',
      acidConcentration: 0.1,
      acidVolume: 25,
      baseConcentration: 0.1,
      baseAdded: 12.5,
      indicator: 'phenolphthalein',
    });
    expect(half['ph']).toBeCloseTo(4.74, 1);
  });
});

describe('flame test', () => {
  it('gives each metal ion its textbook colour and strongest line', () => {
    expect(FLAMES.na.name.en).toBe('yellow-orange');
    expect(flameTest.solve({ ion: 'na' })['colour']).toBe(FLAMES.na.colour);
    expect(flameTest.solve({ ion: 'na' })['line1']).toBeCloseTo(589, 0);
    expect(FLAMES.cu.name.en).toBe('blue-green');
    expect(flameTest.solve({ ion: 'li' })['line1']).toBeCloseTo(670.8, 1);
    expect(
      flameTest.predicates['ionIs']!.test({ ion: 'k' }, flameTest.solve({ ion: 'k' }), {
        ion: 'k',
      }),
    ).toBe(true);
  });
});

describe('reaction rate', () => {
  it('speeds up with temperature, concentration, a catalyst and a powder', () => {
    const base: RateParams = {
      temperature: 25,
      concentration: 1,
      catalyst: false,
      surface: 'lumps',
    };
    const r = (p: RateParams) => reactionRate.solve(p)['relativeRate'] as number;
    expect(r(base)).toBeCloseTo(1, 9);
    expect(r({ ...base, temperature: 35 })).toBeGreaterThan(1.8);
    expect(r({ ...base, concentration: 2 })).toBeCloseTo(2, 9);
    expect(r({ ...base, catalyst: true })).toBeGreaterThan(10);
    expect(r({ ...base, surface: 'powder' })).toBeGreaterThan(r(base));
  });
});

describe('gas law', () => {
  it('follows PV = nRT', () => {
    const o = gasLaw.solve({ amount: 1, temperature: 273.15, volume: 22.4 });
    expect(o['pressure']).toBeCloseTo(101.4, 0);
    expect(
      gasLaw.solve({ amount: 1, temperature: 546.3, volume: 22.4 })['pressure'] as number,
    ).toBeCloseTo(202.7, 0);
  });
});
