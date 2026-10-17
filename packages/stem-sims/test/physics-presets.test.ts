import { describe, it, expect } from 'vitest';
import { projectile } from '../src/physics/projectile';
import { vectorAddition } from '../src/physics/vectors';
import { incline } from '../src/physics/incline';
import { pendulum } from '../src/physics/pendulum';
import { spring } from '../src/physics/spring';
import { collision } from '../src/physics/collision';

describe('projectile', () => {
  it('matches the textbook range, apex and flight time from level ground', () => {
    const p = { speed: 20, angle: 45, height: 0, gravity: 9.8 };
    const o = projectile.solve(p);
    expect(o['range']).toBeCloseTo(40.816, 2);
    expect(o['apex']).toBeCloseTo(10.204, 2);
    expect(o['flightTime']).toBeCloseTo(2.886, 2);
  });
  it('flies further from a cliff and lands at the ground', () => {
    const p = { speed: 15, angle: 30, height: 20, gravity: 9.8 };
    const o = projectile.solve(p);
    expect(o['range']).toBeGreaterThan(projectile.solve({ ...p, height: 0 })['range'] as number);
    const end = projectile.at(p, o['flightTime'] as number);
    expect(end['y']).toBeCloseTo(0, 6);
  });
  it('grades the range and a target hit', () => {
    const p = { speed: 20, angle: 45, height: 0, gravity: 9.8 };
    expect(
      projectile.predicates['rangeEquals']!.test(p, projectile.solve(p), { range: 41, tol: 0.5 }),
    ).toBe(true);
    expect(
      projectile.predicates['hitsTarget']!.test(p, projectile.solve(p), { x: 40, tol: 1 }),
    ).toBe(true);
    expect(
      projectile.predicates['hitsTarget']!.test(p, projectile.solve(p), { x: 30, tol: 1 }),
    ).toBe(false);
  });
  it('rejects angles and speeds outside the classroom range', () => {
    expect(
      projectile.params.safeParse({ speed: 20, angle: 95, height: 0, gravity: 9.8 }).success,
    ).toBe(false);
  });
});

describe('vector addition', () => {
  it('adds perpendicular vectors into a 3-4-5 resultant', () => {
    const o = vectorAddition.solve({ aMagnitude: 3, aAngle: 0, bMagnitude: 4, bAngle: 90 });
    expect(o['magnitude']).toBeCloseTo(5, 9);
    expect(o['angle']).toBeCloseTo(53.13, 2);
    expect(o['rx']).toBeCloseTo(3, 9);
    expect(o['ry']).toBeCloseTo(4, 9);
  });
  it('cancels equal and opposite vectors', () => {
    const o = vectorAddition.solve({ aMagnitude: 5, aAngle: 30, bMagnitude: 5, bAngle: 210 });
    expect(o['magnitude']).toBeCloseTo(0, 9);
  });
});

describe('forces on an incline', () => {
  it('holds while the slope is below the friction angle', () => {
    const o = incline.solve({ mass: 2, angle: 20, muS: 0.5, muK: 0.4, gravity: 9.8 });
    expect(o['slides']).toBe(false);
    expect(o['a']).toBe(0);
    expect(o['normal']).toBeCloseTo(2 * 9.8 * Math.cos((20 * Math.PI) / 180), 9);
  });
  it('slides with a = g(sin θ − μk cos θ) once static friction is exceeded', () => {
    const o = incline.solve({ mass: 2, angle: 40, muS: 0.5, muK: 0.3, gravity: 9.8 });
    const r = (40 * Math.PI) / 180;
    expect(o['slides']).toBe(true);
    expect(o['a']).toBeCloseTo(9.8 * (Math.sin(r) - 0.3 * Math.cos(r)), 9);
  });
});

describe('pendulum', () => {
  it('has the small-angle period 2π√(L/g)', () => {
    const o = pendulum.solve({ length: 1, mass: 1, angle: 5, gravity: 9.8, damping: 0 });
    expect(o['period']).toBeCloseTo(2 * Math.PI * Math.sqrt(1 / 9.8), 2);
  });
  it('conserves energy without damping and loses it to heat with damping', () => {
    const free = { length: 1, mass: 1, angle: 40, gravity: 9.8, damping: 0 };
    const start = pendulum.at(free, 0);
    const later = pendulum.at(free, 3.3);
    expect((later['kinetic'] as number) + (later['potential'] as number)).toBeCloseTo(
      (start['kinetic'] as number) + (start['potential'] as number),
      3,
    );
    const damped = pendulum.at({ ...free, damping: 0.3 }, 8);
    expect(damped['thermal'] as number).toBeGreaterThan(0.5);
  });
  it('lengthens its period for large swings', () => {
    const small = pendulum.solve({ length: 1, mass: 1, angle: 5, gravity: 9.8, damping: 0 });
    const large = pendulum.solve({ length: 1, mass: 1, angle: 70, gravity: 9.8, damping: 0 });
    expect(large['period'] as number).toBeGreaterThan(small['period'] as number);
  });
});

describe('spring', () => {
  it('oscillates with period 2π√(m/k)', () => {
    const o = spring.solve({ mass: 0.5, k: 20, amplitude: 0.1, damping: 0 });
    expect(o['period']).toBeCloseTo(2 * Math.PI * Math.sqrt(0.5 / 20), 6);
    expect(
      spring.at({ mass: 0.5, k: 20, amplitude: 0.1, damping: 0 }, o['period'] as number)['x'],
    ).toBeCloseTo(0.1, 6);
  });
  it('decays with damping', () => {
    const p = { mass: 0.5, k: 20, amplitude: 0.1, damping: 0.4 };
    expect(Math.abs(spring.at(p, 10)['x'] as number)).toBeLessThan(0.01);
  });
});

describe('collision', () => {
  it('swaps velocities for an equal-mass elastic collision', () => {
    const o = collision.solve({ m1: 1, m2: 1, u1: 4, u2: 0, restitution: 1 });
    expect(o['v1']).toBeCloseTo(0, 9);
    expect(o['v2']).toBeCloseTo(4, 9);
    expect(o['keLost']).toBeCloseTo(0, 9);
  });
  it('sticks together and conserves momentum when perfectly inelastic', () => {
    const o = collision.solve({ m1: 2, m2: 1, u1: 3, u2: -3, restitution: 0 });
    expect(o['v1']).toBeCloseTo(1, 9);
    expect(o['v2']).toBeCloseTo(1, 9);
    expect(o['momentumBefore']).toBeCloseTo(o['momentumAfter'] as number, 9);
    expect(o['keLost'] as number).toBeGreaterThan(0);
  });
});
