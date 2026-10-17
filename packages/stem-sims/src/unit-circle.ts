import { z } from 'zod';
import { predicate, within, type Observable, type SimModel } from './types';

/** Trigonometric ratios on the unit circle (General Math trigonometric ratio; Higher Math trigonometry). */
export const UnitCircleParamsSchema = z.strictObject({ angleDeg: z.number().min(0).max(360) });
export type UnitCircleParams = z.infer<typeof UnitCircleParamsSchema>;

const EPSILON = 1e-9;

function quadrant(angleDeg: number): number {
  const a = angleDeg % 360;
  if (a % 90 === 0) return 0;
  return Math.floor(a / 90) + 1;
}

function solveCircle(p: UnitCircleParams): Observable {
  const rad = (p.angleDeg * Math.PI) / 180;
  const sin = Math.sin(rad);
  const cos = Math.cos(rad);
  return {
    angleDeg: p.angleDeg,
    sin,
    cos,
    tan: Math.abs(cos) < EPSILON ? null : sin / cos,
    quadrant: quadrant(p.angleDeg),
  };
}

const tolerance = z.number().positive();

export const unitCircle: SimModel<UnitCircleParams, 'unit-circle'> = {
  id: 'unit-circle',
  params: UnitCircleParamsSchema,
  at: (p) => solveCircle(p),
  solve: solveCircle,
  predicates: {
    angleWithin: predicate(
      z.strictObject({ min: z.number().min(0).max(360), max: z.number().min(0).max(360) }),
      (p, _o, a) => p.angleDeg >= a.min && p.angleDeg <= a.max,
    ),
    sinEquals: predicate(
      z.strictObject({ v: z.number().min(-1).max(1), tol: tolerance }),
      (_p, o, a) => within(o['sin'], a.v, a.tol),
    ),
    cosEquals: predicate(
      z.strictObject({ v: z.number().min(-1).max(1), tol: tolerance }),
      (_p, o, a) => within(o['cos'], a.v, a.tol),
    ),
  },
};
