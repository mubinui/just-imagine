import type { Vec2 } from '@just-imagine/scene-schema';
export function parseCollider(value: unknown): Vec2[][] | null {
  if (!value || typeof value !== 'object') return null;
  const object = value as { vertices?: unknown; parts?: unknown };
  const points = (input: unknown): Vec2[] | null => {
    if (!Array.isArray(input) || input.length < 3 || input.length > 40) return null;
    const result: Vec2[] = [];
    for (const item of input) {
      if (!item || typeof item !== 'object') return null;
      const { x, y } = item as Vec2;
      if (!Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > 0.5 || Math.abs(y) > 0.5)
        return null;
      result.push({ x, y });
    }
    return result;
  };
  if (
    !points(object.vertices) ||
    !Array.isArray(object.parts) ||
    !object.parts.length ||
    object.parts.length > 12
  )
    return null;
  const parts: Vec2[][] = [];
  for (const part of object.parts) {
    const p = points(part);
    if (!p) return null;
    let sign = 0;
    for (let i = 0; i < p.length; i++) {
      const a = p[i]!,
        b = p[(i + 1) % p.length]!,
        c = p[(i + 2) % p.length]!;
      const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x);
      if (Math.abs(cross) < 1e-8) continue;
      const next = Math.sign(cross);
      if (sign && next !== sign) return null;
      sign = next;
    }
    if (!sign) return null;
    parts.push(p);
  }
  return parts;
}
