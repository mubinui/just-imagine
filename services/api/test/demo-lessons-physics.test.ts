import { describe, expect, it } from 'vitest';
import { SIMS, type SimId } from '@just-imagine/stem-sims';
import { PHYSICS_LESSONS } from '../src/school/demo-lessons-physics';
import { describeLessonQuality } from './support/demo-lesson-checks';

const RAD = Math.PI / 180;
const g = 9.8;
const G = 6.674e-11;
const round2 = (value: number) => Math.round(value * 100) / 100;

// Defining relations, written independently of the lesson source.
const projectileTime = (2 * 19.6 * Math.sin(30 * RAD)) / g;
const projectileApex = (19.6 * Math.sin(30 * RAD)) ** 2 / (2 * g);
const inclineAlong = 2 * g * Math.sin(30 * RAD);
const inclineA = g * (Math.sin(30 * RAD) - 0.3 * Math.cos(30 * RAD));
const sharedV = (2 * 3 + 1 * 0) / (2 + 1);
const keLost = 0.5 * 2 * 3 ** 2 + 0.5 * 1 * 0 ** 2 - 0.5 * (2 + 1) * sharedV ** 2;
const orbitR = 10e6;
const orbitGM = G * 6e24;
const circularSpeed = Math.sqrt(orbitGM / orbitR);
const circularHours = (2 * Math.PI * orbitR) / circularSpeed / 3600;
const pendulumHeight = 1 * (1 - Math.cos(60 * RAD));
const pendulumEnergy = 0.5 * g * pendulumHeight;
const pendulumSpeed = Math.sqrt(2 * g * pendulumHeight);
const springEnergy = 0.5 * 50 * 0.2 ** 2;
const springSpeed = 0.2 * Math.sqrt(50 / 0.5);

describeLessonQuality('physics example lessons', PHYSICS_LESSONS, {
  mcq: {
    projectile: {
      check1: ['Zero', 'শূন্য'],
      q1: ['It stays constant', 'ধ্রুব থাকে'],
      q5: ['60°', '60°'],
    },
    vectors: {
      check1: ['8 N', '8 N'],
      q1: ['When they act in the same direction', 'যখন বল দুটি একই দিকে ক্রিয়া করে'],
      q5: ['It decreases to zero', 'কমতে কমতে শূন্য হয়'],
    },
    incline: {
      check1: ['mg cos θ', 'ওজন × cos θ'],
      q1: ['Static friction', 'স্থিতি ঘর্ষণ'],
      q5: ['It decreases', 'কমে যায়'],
    },
    collision: {
      check1: ['Total momentum', 'মোট ভরবেগ'],
      q1: ['Mass and velocity', 'ভর ও বেগ'],
      q5: ['It decreases', 'কমে যায়'],
    },
    orbit: {
      check1: ['The planet’s gravitational pull', 'গ্রহের মহাকর্ষ বল'],
      q1: ['Yes, towards the planet’s centre', 'হ্যাঁ, গ্রহের কেন্দ্রের দিকে'],
      q5: ['√2 times the circular speed', 'বৃত্তাকার বেগের √2 গুণ'],
    },
    pendulum: {
      check1: ['Potential energy to kinetic energy', 'স্থিতিশক্তি থেকে গতিশক্তি'],
      q1: ['At the lowest point', 'সর্বনিম্ন বিন্দুতে'],
      q5: ['Mechanical energy turns into heat', 'যান্ত্রিক শক্তি তাপে রূপান্তরিত হয়'],
    },
    spring: {
      check1: ['Zero', 'শূন্য'],
      q1: ['Four times as large', 'চার গুণ'],
      q5: ['A larger mass', 'বেশি ভর'],
    },
  },
  failures: {
    // A steeper launch is not a longer one: 60° lands where 30° did.
    projectile: { angle: 60 },
    // Halfway between parallel and perpendicular gives about 6.48, not 5.
    vectors: { bAngle: 45 },
    // tan 25° > μs = 0.4, so the block still slides.
    incline: { angle: 25 },
    // Doubling cart 2 does not halve the speed: 6/(2 + 2) = 1.5 m/s.
    collision: { m2: 2 },
    // "About 7 km/s" from low-Earth orbit is too fast at this distance: an ellipse.
    orbit: { speed: 7 },
    // A heavier bob does not pass the lowest point any faster.
    pendulum: { mass: 2, length: 1 },
    // Doubling the mass multiplies the period by √2, not 2.
    spring: { mass: 1 },
  },
  numeric: {
    projectile: { q2: projectileTime, q4: projectileApex },
    vectors: { q2: Math.sqrt(3 ** 2 + 4 ** 2), q4: 10 * Math.sin(30 * RAD) },
    incline: { q2: inclineAlong, q4: round2(inclineA) },
    collision: { q2: sharedV, q4: keLost },
    orbit: { q2: round2(circularSpeed / 1000), q4: round2(circularHours) },
    pendulum: { q2: pendulumEnergy, q4: round2(pendulumSpeed) },
    spring: { q2: springEnergy, q4: springSpeed },
  },
});

describe('physics lessons agree with their simulations', () => {
  const solve = (id: SimId, params: unknown) => {
    const model = SIMS[id];
    return model.solve(model.params.parse(params) as never);
  };
  const num = (reading: unknown) => Number(reading);
  /** The explore-step parameters a lesson opens with, so the readings below are what students see. */
  const paramsOf = (slug: string) => {
    const step = PHYSICS_LESSONS.find((entry) => entry.slug === slug)?.lesson.steps[1];
    if (step?.kind !== 'explore') throw new Error(`${slug}: missing explore step`);
    return step.params;
  };

  it('keeps the seven lessons in order with their simulations and chapters', () => {
    expect(
      PHYSICS_LESSONS.map((entry) => [entry.slug, entry.lesson.chapterId, entry.lesson.grade]),
    ).toEqual([
      ['projectile', 'physics-2', 9],
      ['vectors', 'physics-3', 9],
      ['incline', 'physics-3', 9],
      ['collision', 'physics-3', 9],
      ['orbit', 'physics-3', 9],
      ['pendulum', 'physics-4', 9],
      ['spring', 'physics-4', 9],
    ]);
    const sims = PHYSICS_LESSONS.map((entry) =>
      entry.lesson.steps.flatMap((step) => (step.kind === 'explore' ? [step.simId] : [])),
    );
    expect(sims).toEqual([
      ['projectile'],
      ['vector-addition'],
      ['incline'],
      ['collision'],
      ['orbit'],
      ['pendulum'],
      ['spring'],
    ]);
  });

  it('projectile: flight time, highest point and the 45° range', () => {
    const launch = paramsOf('projectile');
    expect(launch).toEqual({ speed: 19.6, angle: 30, height: 0, gravity: 9.8 });
    const reading = solve('projectile', launch);
    expect(num(reading.flightTime)).toBeCloseTo(projectileTime, 9);
    expect(num(reading.apex)).toBeCloseTo(projectileApex, 9);
    expect(num(solve('projectile', { ...launch, angle: 45 }).range)).toBeCloseTo(19.6 ** 2 / g, 9);
    expect(num(solve('projectile', { ...launch, angle: 60 }).range)).toBeCloseTo(
      num(reading.range),
      9,
    );
  });

  it('vectors: perpendicular 3 and 4 give 5, and a 10 N force at 30° has a 5 N y-part', () => {
    const forces = paramsOf('vectors');
    expect(forces).toEqual({ aMagnitude: 3, aAngle: 0, bMagnitude: 4, bAngle: 90 });
    const reading = solve('vector-addition', forces);
    expect(num(reading.magnitude)).toBeCloseTo(Math.sqrt(3 ** 2 + 4 ** 2), 9);
    expect(num(reading.angle)).toBeCloseTo(Math.atan2(4, 3) / RAD, 9);
    const single = solve('vector-addition', {
      aMagnitude: 10,
      aAngle: 30,
      bMagnitude: 0,
      bAngle: 0,
    });
    expect(num(single.ay)).toBeCloseTo(10 * Math.sin(30 * RAD), 9);
  });

  it('incline: weight along the slope, sliding acceleration and the holding angle', () => {
    const slope = paramsOf('incline');
    expect(slope).toEqual({ mass: 2, angle: 30, muS: 0.4, muK: 0.3, gravity: 9.8 });
    const reading = solve('incline', slope);
    expect(num(reading.along)).toBeCloseTo(inclineAlong, 9);
    expect(num(reading.normal)).toBeCloseTo(2 * g * Math.cos(30 * RAD), 9);
    expect(reading.slides).toBe(true);
    expect(num(reading.a)).toBeCloseTo(inclineA, 9);
    expect(num(reading.a)).toBeCloseTo(round2(inclineA), 2);
    expect(solve('incline', { ...slope, angle: 20 }).slides).toBe(false);
  });

  it('collision: common velocity, kinetic energy lost and momentum kept', () => {
    const carts = paramsOf('collision');
    expect(carts).toEqual({ m1: 2, m2: 1, u1: 3, u2: 0, restitution: 0 });
    const reading = solve('collision', carts);
    expect(num(reading.v1)).toBeCloseTo(sharedV, 9);
    expect(num(reading.v2)).toBeCloseTo(sharedV, 9);
    expect(num(reading.keLost)).toBeCloseTo(keLost, 9);
    expect(num(reading.momentumAfter)).toBeCloseTo(2 * 3, 9);
    expect(num(solve('collision', { ...carts, m2: 4 }).v2)).toBeCloseTo((2 * 3) / (2 + 4), 9);
  });

  it('orbit: circular speed, escape speed and period at 1.0 × 10⁷ m', () => {
    const launch = paramsOf('orbit');
    expect(launch).toEqual({ planetMass: 6, radius: 10, speed: 6 });
    const reading = solve('orbit', launch);
    expect(num(reading.circularSpeed)).toBeCloseTo(circularSpeed / 1000, 9);
    expect(num(reading.escapeSpeed)).toBeCloseTo((Math.SQRT2 * circularSpeed) / 1000, 9);
    expect(reading.kind).toBe(1);
    const circle = solve('orbit', { ...launch, speed: 6.33 });
    expect(circle.kind).toBe(0);
    expect(num(circle.periodHours)).toBeCloseTo(round2(circularHours), 2);
  });

  it('pendulum: release energy and lowest-point speed, independent of mass', () => {
    const bob = paramsOf('pendulum');
    expect(bob).toEqual({ length: 1, mass: 0.5, angle: 60, gravity: 9.8, damping: 0 });
    const reading = solve('pendulum', bob);
    expect(num(reading.energy)).toBeCloseTo(pendulumEnergy, 9);
    expect(num(reading.maxSpeed)).toBeCloseTo(pendulumSpeed, 9);
    expect(num(solve('pendulum', { ...bob, mass: 2 }).maxSpeed)).toBeCloseTo(pendulumSpeed, 9);
    expect(num(solve('pendulum', { ...bob, length: 2.45 }).maxSpeed)).toBeCloseTo(4.9, 9);
  });

  it('spring: stored energy, top speed and the doubled period', () => {
    const block = paramsOf('spring');
    expect(block).toEqual({ mass: 0.5, k: 50, amplitude: 0.2, damping: 0 });
    const reading = solve('spring', block);
    expect(num(reading.energy)).toBeCloseTo(springEnergy, 9);
    expect(num(reading.maxSpeed)).toBeCloseTo(springSpeed, 9);
    expect(0.5 * 0.5 * springSpeed ** 2).toBeCloseTo(springEnergy, 9);
    expect(num(solve('spring', { ...block, mass: 2 }).period)).toBeCloseTo(
      2 * num(reading.period),
      9,
    );
  });
});
