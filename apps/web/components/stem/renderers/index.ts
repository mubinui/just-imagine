import type { ComponentType } from 'react';
import type { SimId } from '@just-imagine/stem-sims';
import type { RendererProps } from './kit';
import {
  CollisionView,
  InclineView,
  OrbitView,
  PendulumView,
  ProjectileView,
  SpringView,
  VectorsView,
} from './physics';
import { FlameView, GasView, PhView, RateView, TitrationView } from './chemistry';
import { DerivativeView, GrapherView, ProbabilityView, RiemannView, WavesView } from './maths';

export type { RendererProps } from './kit';
export { usePrefersReducedMotion } from './kit';

/** The library presets draw themselves; the five original sims are drawn inline in SimView. */
export const RENDERERS: Partial<Record<SimId, ComponentType<RendererProps>>> = {
  projectile: ProjectileView,
  'vector-addition': VectorsView,
  incline: InclineView,
  pendulum: PendulumView,
  spring: SpringView,
  collision: CollisionView,
  orbit: OrbitView,
  'ph-indicator': PhView,
  titration: TitrationView,
  'flame-test': FlameView,
  'reaction-rate': RateView,
  'gas-law': GasView,
  'function-grapher': GrapherView,
  derivative: DerivativeView,
  'riemann-area': RiemannView,
  probability: ProbabilityView,
  'trig-waves': WavesView,
};

/** The readings listed under each library sim, from solve() and at() together. */
export const READOUTS: Partial<Record<SimId, string[]>> = {
  projectile: ['range', 'apex', 'flightTime', 'impactSpeed', 'x', 'y', 'vx', 'vy'],
  'vector-addition': ['magnitude', 'angle', 'rx', 'ry'],
  incline: ['slides', 'net', 'a', 'weight', 'normal', 'friction', 'staticLimit', 'v', 'distance'],
  pendulum: ['period', 'angle', 'kinetic', 'potential', 'thermal', 'maxSpeed'],
  spring: ['period', 'frequency', 'x', 'v', 'kinetic', 'potential'],
  collision: ['v1', 'v2', 'momentumBefore', 'momentumAfter', 'keBefore', 'keAfter', 'keLost'],
  orbit: [
    'kind',
    'speed',
    'distance',
    'periodHours',
    'eccentricity',
    'circularSpeed',
    'escapeSpeed',
  ],
  'ph-indicator': ['ph', 'colour'],
  titration: ['ph', 'colour', 'equivalenceVolume'],
  'flame-test': ['colour', 'line1', 'line2', 'line3'],
  'reaction-rate': ['relativeRate', 'halfLife', 'product'],
  'gas-law': ['pressure', 'relativeSpeed'],
  'function-grapher': ['value', 'yIntercept', 'vertexX', 'vertexY', 'root1', 'root2', 'root3'],
  derivative: ['y', 'slope', 'tangentIntercept'],
  'riemann-area': ['estimate', 'exact', 'error', 'width'],
  probability: ['done', 'last'],
  'trig-waves': ['value', 'periodDeg', 'max'],
};

/** Readings that are simply absent (a third root, a second flame line) rather than undefined. */
export const HIDE_WHEN_NULL = new Set([
  'root1',
  'root2',
  'root3',
  'vertexX',
  'vertexY',
  'line2',
  'line3',
  'periodHours',
  'apoapsis',
]);
