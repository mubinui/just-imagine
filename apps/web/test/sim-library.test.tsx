import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  SIMS,
  SIM_IDS,
  projectile,
  probability,
  trialRate,
  type SimId,
} from '@just-imagine/stem-sims';
import { SimView, SIM_DEFAULTS, PARAMS } from '../components/stem/SimView';
import {
  curveEquation,
  hexColour,
  isTimedSim,
  simClock,
  simName,
} from '../components/stem/sim-format';

type Shape = Record<
  string,
  {
    minValue?: number | null;
    maxValue?: number | null;
    options?: readonly unknown[];
    type?: string;
    def?: { type?: string };
  }
>;
const shapeOf = (id: SimId) => (SIMS[id].params as unknown as { shape: Shape }).shape;
const BENGALI = /[ঀ-৿]/u;

const LIBRARY: SimId[] = [
  'projectile',
  'vector-addition',
  'incline',
  'pendulum',
  'spring',
  'collision',
  'orbit',
  'ph-indicator',
  'titration',
  'flame-test',
  'reaction-rate',
  'gas-law',
  'function-grapher',
  'derivative',
  'riemann-area',
  'probability',
  'trig-waves',
];

describe('simulation library configuration', () => {
  it('ships defaults that the model accepts for every registered sim', () => {
    for (const id of SIM_IDS)
      expect(SIMS[id].params.safeParse(SIM_DEFAULTS[id]).success, id).toBe(true);
  });

  it('gives every schema key of every library sim a control', () => {
    for (const id of LIBRARY)
      expect(PARAMS[id].map((p) => p.id).sort(), id).toEqual(Object.keys(shapeOf(id)).sort());
  });

  it('uses the schema ranges for sliders and the schema options for choices', () => {
    for (const id of LIBRARY)
      for (const p of PARAMS[id]) {
        const field = shapeOf(id)[p.id]!;
        if (p.kind === 'choice') {
          const values = p.options.map((o) => o.value);
          if (field.options)
            expect([...values].sort(), `${id}.${p.id}`).toEqual([...field.options].sort());
          else expect([...values].sort(), `${id}.${p.id}`).toEqual([false, true]);
          for (const o of p.options) {
            expect(o.label[0]).not.toBe('');
            // Chemical symbols such as Li⁺ read the same in both languages.
            if (o.label[1] !== o.label[0]) expect(o.label[1]).toMatch(BENGALI);
          }
        } else {
          expect(p.min, `${id}.${p.id} min`).toBe(field.minValue);
          expect(p.max, `${id}.${p.id} max`).toBe(field.maxValue);
          expect(p.step).toBeGreaterThan(0);
          const start = SIM_DEFAULTS[id][p.id] as number;
          expect(start).toBeGreaterThanOrEqual(p.min);
          expect(start).toBeLessThanOrEqual(p.max);
        }
        expect(p.label[1], `${id}.${p.id} bn`).toMatch(BENGALI);
      }
  });

  it('names every sim in English and Bangla', () => {
    for (const id of SIM_IDS) {
      expect(simName(id, 'en')).not.toBe(id);
      expect(simName(id, 'bn')).toMatch(BENGALI);
    }
  });

  it('runs a clock only for the sims that change over time', () => {
    expect(SIM_IDS.filter(isTimedSim).sort()).toEqual(
      [
        'motion-graphs',
        'newton-cart',
        'projectile',
        'incline',
        'pendulum',
        'spring',
        'collision',
        'orbit',
        'reaction-rate',
        'probability',
        'trig-waves',
      ].sort(),
    );
  });

  it('runs each timed sim to its natural end in a few real seconds', () => {
    const p = SIM_DEFAULTS.projectile as Parameters<typeof projectile.solve>[0];
    expect(simClock('projectile', p).horizon).toBeCloseTo(
      projectile.solve(p)['flightTime'] as number,
      10,
    );
    const dice = SIM_DEFAULTS.probability as Parameters<typeof probability.solve>[0];
    expect(simClock('probability', dice).horizon).toBeCloseTo(dice.trials / trialRate(dice), 10);
    for (const id of SIM_IDS.filter(isTimedSim)) {
      const clock = simClock(id, SIMS[id].params.parse(SIM_DEFAULTS[id]));
      const seconds = clock.horizon / clock.scale;
      expect(seconds, id).toBeGreaterThanOrEqual(1);
      expect(seconds, id).toBeLessThanOrEqual(20);
    }
  });
});

describe('maths and colour formatting', () => {
  it('writes each curve family the way a textbook does', () => {
    const curve = (family: string, a: number, b: number, c: number, d = 0) =>
      curveEquation({ family, a, b, c, d } as never, 'en');
    expect(curve('quadratic', 1, -2, -3)).toBe('y = x² − 2x − 3');
    expect(curve('cubic', 0.2, 0, -2)).toBe('y = 0.2x³ − 2x');
    expect(curve('linear', -1, 4, 9)).toBe('y = −x + 4');
    expect(curve('sine', 2, 1, 0, 1)).toBe('y = 2 sin(x) + 1');
    expect(curve('sine', 1, 3, -1)).toBe('y = sin(3x − 1)');
    expect(curve('exponential', 2, 0.5, -1)).toBe('y = 2e^(0.5x) − 1');
    expect(curve('logarithm', 1, 2, 0)).toBe('y = ln(2x)');
    expect(curve('quadratic', 0, 0, 0)).toBe('y = 0');
    expect(curveEquation({ family: 'quadratic', a: 1, b: 0, c: 2.5, d: 0 }, 'bn')).toBe(
      'y = x² + ২.৫',
    );
  });
  it('turns a model colour number into a CSS colour', () => {
    expect(hexColour(0xd7263d)).toBe('#d7263d');
    expect(hexColour(0x0000ff)).toBe('#0000ff');
    expect(hexColour(null)).toBeNull();
  });
});

const render = (id: SimId, value: Record<string, unknown> = SIM_DEFAULTS[id]) =>
  renderToStaticMarkup(<SimView id={id} value={value} onChange={() => {}} />);

/** What a student must be able to read on each sim, with units. */
const MUST_SHOW: Record<string, string[]> = {
  projectile: ['x (m)', 'y (m)', 'Range', 'Maximum height', 'Flight time', 'm/s'],
  'vector-addition': ['Tip to tail', 'Parallelogram', 'Resultant', 'R = ', '°', 'units'],
  incline: ['Free-body diagram', 'Weight', 'Normal', 'Friction', 'Net force', ' N', 'Slides'],
  pendulum: ['Kinetic', 'Potential', 'Thermal', 'Total', ' J', 'Period', ' m'],
  spring: ['x (m)', 't (s)', 'Kinetic', 'Elastic', ' J', 'N/m', 'Period'],
  collision: ['Before', 'After', 'kg·m/s', ' J', 'Total momentum', ' kg'],
  orbit: ['Elliptical orbit', 'km/s', ' h', '×10⁶ m', 'Escape speed'],
  'ph-indicator': ['pH', 'Acidic', 'Neutral', 'Alkaline', 'mol/dm³', '#d7263d'],
  titration: ['pH', 'cm³', 'End point', 'NaOH', 'Volume of NaOH added'],
  'flame-test': ['Wavelength (nm)', '589', 'yellow-orange', 'nm'],
  'reaction-rate': ['Product (%)', 't (s)', 'Half-life', '°C', 'Reference'],
  'gas-law': ['PV = nRT', 'kPa', ' K', 'dm³', 'mol'],
  'function-grapher': ['y = x² − 2x − 3', 'Vertex', 'Root', 'y-intercept'],
  derivative: ['Tangent', 'Slope', 'f′(x)'],
  'riemann-area': ['Estimate', 'Exact', 'Error', 'sq. units', 'Midpoint'],
  probability: ['Relative frequency', 'Theoretical', 'Experimental', 'Trials'],
  'trig-waves': ['Amplitude', 'Period', 'θ (°)', '360°', 'y = 2 sin(θ)'],
};

describe('library sim rendering', () => {
  for (const id of LIBRARY)
    it(`draws ${id} with labels, units and an accessible name`, () => {
      const html = render(id);
      expect(html).toContain(`aria-label="${simName(id, 'en')}"`);
      for (const text of MUST_SHOW[id]!) expect(html, `${id}: ${text}`).toContain(text);
      expect(html).not.toMatch(/NaN|undefined|Infinity/);
    });

  it('colours the pH beaker and the titration flask from the model', () => {
    const acid = render('ph-indicator', {
      substance: 'naoh',
      concentration: 0.1,
      indicator: 'universal',
    });
    expect(acid).toContain('#5b2c8e');
    const flask = render('titration', { ...SIM_DEFAULTS.titration, baseAdded: 30 });
    expect(flask).toContain('#c2185b');
  });

  it('marks static parameters that do not apply to the chosen experiment', () => {
    const coin = render('probability', { ...SIM_DEFAULTS.probability, experiment: 'coin' });
    expect(coin).toContain('Chance of heads');
    expect(coin).not.toContain('Number of sectors');
    const die = render('probability');
    expect(die).not.toContain('Chance of heads');
  });

  it('offers a choice control for every enum and boolean parameter', () => {
    expect(render('flame-test')).toContain('type="radio"');
    expect(render('reaction-rate')).toMatch(/Catalyst/);
    expect(render('ph-indicator')).toContain('<select');
  });

  it('pauses instead of drawing an impossible collision', () => {
    const html = render('collision', { ...SIM_DEFAULTS.collision, u1: -2, u2: 3 });
    expect(html).toContain('paused until the values are valid');
    expect(html).not.toContain('role="img"');
  });
});
