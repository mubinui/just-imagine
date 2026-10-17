import { z } from 'zod';
import { predicate, within, type Observable, type SimModel } from '../types';

const RAD = Math.PI / 180;
const STEP = 1 / 600;
/** Seconds of motion an animation may ask for. */
export const PENDULUM_MAX_T = 60;

/** A simple pendulum released from rest; damping turns its energy into heat. */
export const PendulumParamsSchema = z.strictObject({
  /** m */
  length: z.number().min(0.2).max(3),
  /** kg */
  mass: z.number().min(0.1).max(5),
  /** Release angle from the vertical, degrees. */
  angle: z.number().min(1).max(80),
  gravity: z.number().min(1.6).max(25),
  /** Damping rate, 1/s. */
  damping: z.number().min(0).max(1),
});
export type PendulumParams = z.infer<typeof PendulumParamsSchema>;

/** Large-angle period from the series T0(1 + θ²/16 + 11θ⁴/3072 + 173θ⁶/737280). */
function period(p: PendulumParams) {
  const t0 = 2 * Math.PI * Math.sqrt(p.length / p.gravity);
  const a = p.angle * RAD;
  return t0 * (1 + a ** 2 / 16 + (11 * a ** 4) / 3072 + (173 * a ** 6) / 737280);
}

/** RK4 on θ'' = −(g/L) sin θ − b θ'. */
function swing(p: PendulumParams, t: number) {
  let theta = p.angle * RAD,
    omega = 0;
  const steps = Math.round(Math.min(Math.max(t, 0), PENDULUM_MAX_T) / STEP);
  const f = (th: number, om: number) => -(p.gravity / p.length) * Math.sin(th) - p.damping * om;
  for (let i = 0; i < steps; i++) {
    const k1t = omega,
      k1o = f(theta, omega);
    const k2t = omega + (STEP / 2) * k1o,
      k2o = f(theta + (STEP / 2) * k1t, omega + (STEP / 2) * k1o);
    const k3t = omega + (STEP / 2) * k2o,
      k3o = f(theta + (STEP / 2) * k2t, omega + (STEP / 2) * k2o);
    const k4t = omega + STEP * k3o,
      k4o = f(theta + STEP * k3t, omega + STEP * k3o);
    theta += (STEP / 6) * (k1t + 2 * k2t + 2 * k3t + k4t);
    omega += (STEP / 6) * (k1o + 2 * k2o + 2 * k3o + k4o);
  }
  return { theta, omega, t: steps * STEP };
}

function energies(p: PendulumParams, theta: number, omega: number) {
  const total = p.mass * p.gravity * p.length * (1 - Math.cos(p.angle * RAD));
  const potential = p.mass * p.gravity * p.length * (1 - Math.cos(theta));
  const kinetic = 0.5 * p.mass * (p.length * omega) ** 2;
  return { total, potential, kinetic, thermal: Math.max(0, total - potential - kinetic) };
}

function pendulumAt(p: PendulumParams, t: number): Observable {
  const s = swing(p, t);
  return {
    t: s.t,
    angle: s.theta / RAD,
    omega: s.omega,
    x: p.length * Math.sin(s.theta),
    y: -p.length * Math.cos(s.theta),
    ...energies(p, s.theta, s.omega),
  };
}

export const pendulum: SimModel<PendulumParams, 'pendulum'> = {
  id: 'pendulum',
  params: PendulumParamsSchema,
  solve: (p) => ({
    period: period(p),
    frequency: 1 / period(p),
    maxSpeed: Math.sqrt(2 * p.gravity * p.length * (1 - Math.cos(p.angle * RAD))),
    energy: energies(p, p.angle * RAD, 0).total,
  }),
  at: pendulumAt,
  predicates: {
    periodEquals: predicate(
      z.strictObject({ period: z.number(), tol: z.number().positive() }),
      (_p, o, a) => within(o['period'], a.period, a.tol),
    ),
    maxSpeedEquals: predicate(
      z.strictObject({ speed: z.number(), tol: z.number().positive() }),
      (_p, o, a) => within(o['maxSpeed'], a.speed, a.tol),
    ),
  },
};
