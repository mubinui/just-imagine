import { z } from 'zod';
import { predicate, within, type Observable, type SimModel } from '../types';

/** A mass on a spring pulled aside and released; damping makes it settle. */
export const SpringParamsSchema = z.strictObject({
  /** kg */
  mass: z.number().min(0.1).max(5),
  /** Spring constant, N/m. */
  k: z.number().min(1).max(200),
  /** Initial displacement, m. */
  amplitude: z.number().min(0.01).max(0.5),
  /** Damping coefficient, kg/s. */
  damping: z.number().min(0).max(5),
});
export type SpringParams = z.infer<typeof SpringParamsSchema>;

function springAt(p: SpringParams, t: number): Observable {
  const s = Math.max(0, t);
  const w0 = Math.sqrt(p.k / p.mass);
  const gamma = p.damping / (2 * p.mass);
  let x: number, v: number;
  if (gamma < w0) {
    const wd = Math.sqrt(w0 * w0 - gamma * gamma);
    const decay = Math.exp(-gamma * s);
    x = p.amplitude * decay * (Math.cos(wd * s) + (gamma / wd) * Math.sin(wd * s));
    v = -p.amplitude * decay * ((w0 * w0) / wd) * Math.sin(wd * s);
  } else {
    const decay = Math.exp(-gamma * s);
    x = p.amplitude * decay * (1 + gamma * s);
    v = -p.amplitude * decay * gamma * gamma * s;
  }
  const potential = 0.5 * p.k * x * x;
  const kinetic = 0.5 * p.mass * v * v;
  const total = 0.5 * p.k * p.amplitude * p.amplitude;
  return { t: s, x, v, potential, kinetic, thermal: Math.max(0, total - potential - kinetic) };
}

export const spring: SimModel<SpringParams, 'spring'> = {
  id: 'spring',
  params: SpringParamsSchema,
  solve: (p) => {
    const period = 2 * Math.PI * Math.sqrt(p.mass / p.k);
    return {
      period,
      frequency: 1 / period,
      maxSpeed: p.amplitude * Math.sqrt(p.k / p.mass),
      energy: 0.5 * p.k * p.amplitude * p.amplitude,
    };
  },
  at: springAt,
  predicates: {
    periodEquals: predicate(
      z.strictObject({ period: z.number(), tol: z.number().positive() }),
      (_p, o, a) => within(o['period'], a.period, a.tol),
    ),
    frequencyEquals: predicate(
      z.strictObject({ frequency: z.number(), tol: z.number().positive() }),
      (_p, o, a) => within(o['frequency'], a.frequency, a.tol),
    ),
  },
};
