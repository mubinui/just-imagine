import { z } from 'zod';
import { predicate, within, type SimModel } from '../types';

const RAD = Math.PI / 180;
const angleSchema = z.number().min(-180).max(180);

/** Two vectors added tip to tail. */
export const VectorParamsSchema = z.strictObject({
  aMagnitude: z.number().min(0).max(10),
  aAngle: angleSchema,
  bMagnitude: z.number().min(0).max(10),
  bAngle: angleSchema,
});
export type VectorParams = z.infer<typeof VectorParamsSchema>;

function solve(p: VectorParams) {
  const ax = p.aMagnitude * Math.cos(p.aAngle * RAD),
    ay = p.aMagnitude * Math.sin(p.aAngle * RAD),
    bx = p.bMagnitude * Math.cos(p.bAngle * RAD),
    by = p.bMagnitude * Math.sin(p.bAngle * RAD);
  const rx = ax + bx,
    ry = ay + by;
  const magnitude = Math.hypot(rx, ry);
  return {
    ax,
    ay,
    bx,
    by,
    rx,
    ry,
    magnitude,
    angle: magnitude < 1e-9 ? 0 : Math.atan2(ry, rx) / RAD,
  };
}

export const vectorAddition: SimModel<VectorParams, 'vector-addition'> = {
  id: 'vector-addition',
  params: VectorParamsSchema,
  solve,
  at: (p) => solve(p),
  predicates: {
    resultantEquals: predicate(
      z.strictObject({ magnitude: z.number(), tol: z.number().positive() }),
      (_p, o, a) => within(o['magnitude'], a.magnitude, a.tol),
    ),
    resultantAngleEquals: predicate(
      z.strictObject({ angle: z.number(), tol: z.number().positive() }),
      (_p, o, a) => within(o['angle'], a.angle, a.tol),
    ),
  },
};
