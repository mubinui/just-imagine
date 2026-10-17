import { z } from 'zod';
import { predicate, within, type Observable, type SimModel } from '../types';

/** Trigonometric waves: y = A·sin(bθ + φ) or A·cos(bθ + φ), traced from the unit circle. */
export const WavesParamsSchema = z.strictObject({
  wave: z.enum(['sine', 'cosine']),
  amplitude: z.number().min(0.1).max(5),
  /** b: cycles per 360°. */
  frequency: z.number().min(0.25).max(5),
  phaseDeg: z.number().min(-180).max(180),
  angleDeg: z.number().min(0).max(720),
});
export type WavesParams = z.infer<typeof WavesParamsSchema>;

/** Degrees per second the tracing point moves while animating. */
export const WAVE_SWEEP_DEG_S = 60;

function waveAt(p: WavesParams, angleDeg: number): Observable {
  const rad = ((p.frequency * angleDeg + p.phaseDeg) * Math.PI) / 180;
  return {
    angleDeg,
    value: p.amplitude * (p.wave === 'sine' ? Math.sin(rad) : Math.cos(rad)),
    periodDeg: 360 / p.frequency,
    max: p.amplitude,
    min: -p.amplitude,
  };
}

const tol = z.number().positive();

export const trigWaves: SimModel<WavesParams, 'trig-waves'> = {
  id: 'trig-waves',
  params: WavesParamsSchema,
  solve: (p) => waveAt(p, p.angleDeg),
  at: (p, t) => waveAt(p, (p.angleDeg + WAVE_SWEEP_DEG_S * Math.max(0, t)) % 720),
  predicates: {
    valueEquals: predicate(z.strictObject({ y: z.number(), tol }), (_p, o, a) =>
      within(o['value'], a.y, a.tol),
    ),
    periodEquals: predicate(z.strictObject({ periodDeg: z.number().positive(), tol }), (_p, o, a) =>
      within(o['periodDeg'], a.periodDeg, a.tol),
    ),
    amplitudeEquals: predicate(
      z.strictObject({ amplitude: z.number().positive(), tol }),
      (_p, o, a) => within(o['max'], a.amplitude, a.tol),
    ),
  },
};
