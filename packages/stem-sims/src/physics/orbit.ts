import { z } from 'zod';
import { predicate, within, type Observable, type SimModel } from '../types';

const G = 6.674e-11;
/** Seconds one bound orbit takes on screen. */
export const ORBIT_SCREEN_S = 12;

/** A satellite launched sideways at a height above a planet's centre. */
export const OrbitParamsSchema = z.strictObject({
  /** Planet mass, ×10²⁴ kg (Earth ≈ 6). */
  planetMass: z.number().min(0.5).max(20),
  /** Launch distance from the planet's centre, ×10⁶ m (Earth's surface ≈ 6.4). */
  radius: z.number().min(6.5).max(50),
  /** Launch speed, km/s, perpendicular to the radius. */
  speed: z.number().min(0.5).max(20),
});
export type OrbitParams = z.infer<typeof OrbitParamsSchema>;
export const ORBIT_KINDS = ['circular', 'elliptical', 'escape'] as const;

function elements(p: OrbitParams) {
  const mu = G * p.planetMass * 1e24;
  const r = p.radius * 1e6;
  const v = p.speed * 1000;
  const vc = Math.sqrt(mu / r);
  const ve = Math.SQRT2 * vc;
  const kind = v >= ve * 0.999 ? 2 : Math.abs(v - vc) / vc < 0.02 ? 0 : 1;
  const a = 1 / (2 / r - (v * v) / mu);
  const other = 2 * a - r;
  const e = kind === 2 ? Math.abs((v * v * r) / mu - 1) : Math.abs(other - r) / (other + r);
  return { mu, r, v, vc, ve, kind, a, e, other, fromPeriapsis: v >= vc };
}

function solveKepler(m: number, e: number) {
  let E = e > 0.8 ? Math.PI : m;
  for (let i = 0; i < 30; i++) E -= (E - e * Math.sin(E) - m) / (1 - e * Math.cos(E));
  return E;
}

function orbitAt(p: OrbitParams, t: number): Observable {
  const o = elements(p);
  const scale = (2 * Math.PI * o.r) / o.vc / ORBIT_SCREEN_S;
  if (o.kind !== 2) {
    const m = (2 * Math.PI * Math.max(0, t)) / ORBIT_SCREEN_S + (o.fromPeriapsis ? 0 : Math.PI);
    const E = solveKepler(m % (2 * Math.PI), o.e);
    let x = o.a * (Math.cos(E) - o.e),
      y = o.a * Math.sqrt(1 - o.e * o.e) * Math.sin(E);
    if (!o.fromPeriapsis) {
      x = -x;
      y = -y;
    }
    const dist = Math.hypot(x, y);
    return {
      t,
      x: x / 1e6,
      y: y / 1e6,
      distance: dist / 1e6,
      speed: Math.sqrt(o.mu * (2 / dist - 1 / o.a)) / 1000,
    };
  }
  // Escape: integrate in real time at the same time scale as a circular orbit.
  let x = o.r,
    y = 0,
    vx = 0,
    vy = o.v;
  const total = Math.max(0, t) * scale;
  const steps = 1500;
  const dt = total / steps;
  const acc = (px: number, py: number) => {
    const d3 = Math.hypot(px, py) ** 3;
    return [(-o.mu * px) / d3, (-o.mu * py) / d3] as const;
  };
  for (let i = 0; i < steps && dt > 0; i++) {
    const [ax, ay] = acc(x, y);
    vx += ax * dt * 0.5;
    vy += ay * dt * 0.5;
    x += vx * dt;
    y += vy * dt;
    const [bx, by] = acc(x, y);
    vx += bx * dt * 0.5;
    vy += by * dt * 0.5;
  }
  return {
    t,
    x: x / 1e6,
    y: y / 1e6,
    distance: Math.hypot(x, y) / 1e6,
    speed: Math.hypot(vx, vy) / 1000,
  };
}

export const orbit: SimModel<OrbitParams, 'orbit'> = {
  id: 'orbit',
  params: OrbitParamsSchema,
  solve: (p) => {
    const o = elements(p);
    const bound = o.kind !== 2;
    return {
      kind: o.kind,
      circularSpeed: o.vc / 1000,
      escapeSpeed: o.ve / 1000,
      eccentricity: o.e,
      periodHours: bound ? (2 * Math.PI * Math.sqrt(o.a ** 3 / o.mu)) / 3600 : null,
      periapsis: bound ? Math.min(o.r, o.other) / 1e6 : o.r / 1e6,
      apoapsis: bound ? Math.max(o.r, o.other) / 1e6 : null,
      screenPeriod: bound ? ORBIT_SCREEN_S : null,
    };
  },
  at: orbitAt,
  predicates: {
    orbitIs: predicate(
      z.strictObject({ kind: z.enum(ORBIT_KINDS) }),
      (_p, o, a) => o['kind'] === ORBIT_KINDS.indexOf(a.kind),
    ),
    periodEquals: predicate(
      z.strictObject({ hours: z.number(), tol: z.number().positive() }),
      (_p, o, a) => within(o['periodHours'], a.hours, a.tol),
    ),
  },
};
