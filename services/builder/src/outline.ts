export interface Point {
  x: number;
  y: number;
}
const cross = (a: Point, b: Point, c: Point) =>
  (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
const area = (points: Point[]) =>
  points.reduce((sum, p, i) => {
    const q = points[(i + 1) % points.length]!;
    return sum + p.x * q.y - q.x * p.y;
  }, 0) / 2;
function simplify(points: Point[], epsilon: number): Point[] {
  if (points.length < 3) return points;
  const a = points[0]!,
    b = points.at(-1)!;
  let max = 0,
    index = 0;
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i]!,
      dx = b.x - a.x,
      dy = b.y - a.y,
      t = Math.max(
        0,
        Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / (dx * dx + dy * dy || 1)),
      );
    const distance = Math.hypot(p.x - a.x - t * dx, p.y - a.y - t * dy);
    if (distance > max) {
      max = distance;
      index = i;
    }
  }
  return max > epsilon
    ? [
        ...simplify(points.slice(0, index + 1), epsilon).slice(0, -1),
        ...simplify(points.slice(index), epsilon),
      ]
    : [a, b];
}
function decompose(points: Point[]): Point[][] {
  const convex = (poly: Point[]) =>
    poly.every(
      (p, i) => cross(p, poly[(i + 1) % poly.length]!, poly[(i + 2) % poly.length]!) >= -1e-9,
    );
  if (convex(points)) return [points];
  const remaining = [...points],
    parts: Point[][] = [];
  while (remaining.length > 3) {
    let found = false;
    for (let i = 0; i < remaining.length; i++) {
      const a = remaining[(i + remaining.length - 1) % remaining.length]!,
        b = remaining[i]!,
        c = remaining[(i + 1) % remaining.length]!;
      if (cross(a, b, c) <= 1e-9) continue;
      if (
        remaining.some(
          (p) =>
            p !== a &&
            p !== b &&
            p !== c &&
            cross(a, b, p) >= -1e-9 &&
            cross(b, c, p) >= -1e-9 &&
            cross(c, a, p) >= -1e-9,
        )
      )
        continue;
      parts.push([a, b, c]);
      remaining.splice(i, 1);
      found = true;
      break;
    }
    if (!found) throw new Error('Invalid sprite outline');
  }
  parts.push(remaining);
  // Merge adjacent triangles while preserving convexity.
  let changed = true;
  while (changed) {
    changed = false;
    outer: for (let i = 0; i < parts.length; i++)
      for (let j = i + 1; j < parts.length; j++) {
        const a = parts[i]!,
          b = parts[j]!;
        for (let ai = 0; ai < a.length; ai++)
          for (let bi = 0; bi < b.length; bi++)
            if (a[ai] === b[(bi + 1) % b.length] && a[(ai + 1) % a.length] === b[bi]) {
              const merged = [
                ...Array.from({ length: a.length - 1 }, (_, k) => a[(ai + 1 + k) % a.length]!),
                ...Array.from({ length: b.length - 1 }, (_, k) => b[(bi + 1 + k) % b.length]!),
              ];
              if (convex(merged)) {
                parts[i] = merged;
                parts.splice(j, 1);
                changed = true;
                break outer;
              }
            }
      }
  }
  return parts;
}
/** Remove isolated alpha specks; trace the outer pixel-cell contour and simplify/decompose it. */
export function alphaOutline(
  data: Buffer,
  width: number,
  height: number,
): { vertices: Point[]; parts: Point[][] } {
  const n = width * height,
    seen = new Uint8Array(n),
    queue = new Uint32Array(n),
    components: number[][] = [];
  for (let start = 0; start < n; start++) {
    if (seen[start] || data[start * 4 + 3]! < 128) continue;
    let head = 0,
      tail = 1;
    queue[0] = start;
    seen[start] = 1;
    const component: number[] = [];
    while (head < tail) {
      const i = queue[head++]!;
      component.push(i);
      const x = i % width,
        y = Math.floor(i / width);
      for (const j of [
        x > 0 ? i - 1 : -1,
        x + 1 < width ? i + 1 : -1,
        y > 0 ? i - width : -1,
        y + 1 < height ? i + width : -1,
      ])
        if (j >= 0 && !seen[j] && data[j * 4 + 3]! >= 128) {
          seen[j] = 1;
          queue[tail++] = j;
        }
    }
    components.push(component);
  }
  components.sort((a, b) => b.length - a.length);
  const largest = components[0];
  if (!largest) throw new Error('Generated sprite is fully transparent');
  const keep = new Uint8Array(n),
    threshold = Math.max(4, largest.length * 0.001);
  for (const component of components)
    if (component === largest || component.length >= threshold)
      for (const i of component) keep[i] = 1;
    else for (const i of component) data[i * 4 + 3] = 0;
  // Pixel-cell boundaries are the binary marching contour at alpha 0.5.
  const edges = new Map<number, number[]>(),
    stride = width + 1;
  const edge = (x: number, y: number, xx: number, yy: number) => {
    const key = y * stride + x;
    const list = edges.get(key) ?? [];
    list.push(yy * stride + xx);
    edges.set(key, list);
  };
  for (const i of largest) {
    const x = i % width,
      y = Math.floor(i / width);
    if (y === 0 || !keep[i - width]) edge(x, y, x + 1, y);
    if (x === width - 1 || !keep[i + 1]) edge(x + 1, y, x + 1, y + 1);
    if (y === height - 1 || !keep[i + width]) edge(x + 1, y + 1, x, y + 1);
    if (x === 0 || !keep[i - 1]) edge(x, y + 1, x, y);
  }
  let outline: Point[] = [];
  while (edges.size) {
    const start = edges.keys().next().value!;
    let current = start;
    const loop: Point[] = [];
    do {
      loop.push({ x: current % stride, y: Math.floor(current / stride) });
      const next = edges.get(current)?.pop();
      if (next === undefined) break;
      if (!edges.get(current)?.length) edges.delete(current);
      current = next;
    } while (current !== start);
    if (Math.abs(area(loop)) > Math.abs(area(outline))) outline = loop;
  }
  if (area(outline) < 0) outline.reverse();
  const middle = Math.floor(outline.length / 2);
  let tolerance = 0.5;
  for (let attempt = 0; attempt < 24; attempt++, tolerance *= 1.35) {
    const poly = [
      ...simplify(outline.slice(0, middle + 1), tolerance).slice(0, -1),
      ...simplify([...outline.slice(middle), outline[0]!], tolerance).slice(0, -1),
    ];
    if (poly.length < 3) break;
    if (poly.length > 40) continue;
    try {
      const parts = decompose(poly);
      if (parts.length <= 12) return { vertices: poly, parts };
    } catch {
      /* Increase simplification for ambiguous single-pixel corners. */
    }
  }
  throw new Error('Sprite outline exceeds safe collider limits');
}
