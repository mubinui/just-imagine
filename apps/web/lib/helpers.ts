import { CHARACTERS, type AgeBand } from '@just-imagine/protocol';
import type { Variable } from '@just-imagine/scene-schema';
export const defaultCaptionsFor = (band: AgeBand) => band !== '6-7';
export const effectiveCaptions = (p: { ageBand: AgeBand; captions?: boolean }) =>
  p.captions ?? defaultCaptionsFor(p.ageBand);
export const castFor = (band: AgeBand) =>
  Object.values(CHARACTERS).filter((c) => c.bands.includes(band));
export function clampToVariable(value: number, v: Pick<Variable, 'min' | 'max' | 'step'>) {
  if (!Number.isFinite(value)) return v.min;
  return Math.min(
    v.max,
    Math.max(v.min, Number((v.min + Math.round((value - v.min) / v.step) * v.step).toFixed(8))),
  );
}
export function fillPath(path: string, params: Record<string, string>) {
  return path.replace(/:([A-Za-z]+)/g, (_, key: string) => {
    if (!params[key]) throw new Error('Missing route parameter');
    return encodeURIComponent(params[key]);
  });
}
