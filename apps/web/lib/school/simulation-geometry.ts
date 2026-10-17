import type { SimId } from '@just-imagine/stem-sims';

export type Point = readonly [number, number];
export type Wire = { from: Point; to: Point };

/** Coordinates are in the same SVG world used to draw the actual circuit. */
export function circuitGeometry(topology: 'series' | 'parallel', count: number) {
  const resistors = Array.from({ length: count }, (_, index) => ({
    index,
    x: topology === 'parallel' ? 300 : 200 + index * 115,
    y: topology === 'parallel' ? 95 + index * 85 : 80,
  }));
  const wires: Wire[] = [];
  const wire = (from: Point, to: Point) => wires.push({ from, to });
  if (topology === 'parallel') {
    // Separate supply rails. Only resistor branches join them; no wire shunts the source.
    wire([100, 185], [100, 70]);
    wire([100, 70], [220, 70]);
    wire([220, 70], [220, resistors.at(-1)!.y]);
    wire([100, 215], [100, 310]);
    wire([100, 310], [550, 310]);
    wire([550, 310], [550, 95]);
    for (const r of resistors) {
      wire([220, r.y], [r.x - 18, r.y]);
      wire([r.x + 52, r.y], [550, r.y]);
    }
  } else {
    wire([100, 185], [100, 80]);
    let previous: Point = [100, 80];
    for (const r of resistors) {
      wire(previous, [r.x - 18, r.y]);
      previous = [r.x + 52, r.y];
    }
    wire(previous, [550, 80]);
    wire([550, 80], [550, 310]);
    wire([550, 310], [100, 310]);
    wire([100, 310], [100, 215]);
  }
  return { wires, resistors };
}

export const CART_PIXELS_PER_METRE = 12;
/** A fixed world scale; the camera follows after 30m instead of rescaling each experiment. */
export function cartCamera(displacement: number) {
  const cameraMetres = Math.max(0, displacement - 30);
  const screen = (metres: number) => 55 + (metres - cameraMetres) * CART_PIXELS_PER_METRE;
  const ticks = [];
  for (let metres = Math.ceil(cameraMetres / 5) * 5; metres <= cameraMetres + 45; metres += 5)
    ticks.push({ metres, x: screen(metres) });
  return { cartX: screen(displacement), cameraMetres, ticks };
}

type ScreenMatrix = { a: number; b: number; c: number; d: number; e: number; f: number };
/** Invert getScreenCTM(), including viewBox letterboxing and CSS/ancestor transforms. */
export function simulationPoint(client: Point, matrix: ScreenMatrix | null): Point | null {
  if (!matrix) return null;
  const { a, b, c, d, e, f } = matrix;
  const determinant = a * d - b * c;
  if (!Number.isFinite(determinant) || Math.abs(determinant) < 1e-12) return null;
  const x = (d * (client[0] - e) - c * (client[1] - f)) / determinant;
  const y = (-b * (client[0] - e) + a * (client[1] - f)) / determinant;
  return Number.isFinite(x) && Number.isFinite(y) && x >= 0 && x <= 640 && y >= 0 && y <= 400
    ? [x, y]
    : null;
}

export function draggedParameter(
  id: SimId,
  value: Record<string, unknown>,
  point: Point | null,
  locked: readonly string[],
): { key: string; value: number } | null {
  if (!point) return null;
  const [x, y] = point;
  if (id === 'unit-circle' && !locked.includes('angleDeg') && Math.hypot(x - 320, y - 200) > 1)
    return {
      key: 'angleDeg',
      value: Math.round(((Math.atan2(200 - y, x - 320) * 180) / Math.PI + 360) % 360),
    };
  if (
    id === 'linear-graph' &&
    !locked.includes('c') &&
    typeof value.m === 'number' &&
    Number.isFinite(value.m)
  )
    return {
      key: 'c',
      value: Math.max(-10, Math.min(10, (200 - y) / 14 - (value.m * (x - 320)) / 20)),
    };
  return null;
}
