import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { SIMS, newtonCart, ohmsCircuit } from '@just-imagine/stem-sims';
import { SimView, SIM_DEFAULTS } from '../components/stem/SimView';
import {
  cartCamera,
  CART_PIXELS_PER_METRE,
  circuitGeometry,
  draggedParameter,
  simulationPoint,
  type Point,
  type Wire,
} from '../lib/school/simulation-geometry';
import { requestSnapshot, runCurrentRequest } from '../lib/school/request-snapshot';

// Reconstruct connectivity from the coordinates actually used by the SVG, including
// T-junctions along rails. A correct numerical solver cannot compensate for a shorted drawing.
function connected(wires: Wire[], start: Point, end: Point) {
  const points = [start, end, ...wires.flatMap((w) => [w.from, w.to])];
  const key = (point: Point) => point.join(',');
  const on = (point: Point, wire: Wire) =>
    (wire.from[0] === wire.to[0] &&
      point[0] === wire.from[0] &&
      point[1] >= Math.min(wire.from[1], wire.to[1]) &&
      point[1] <= Math.max(wire.from[1], wire.to[1])) ||
    (wire.from[1] === wire.to[1] &&
      point[1] === wire.from[1] &&
      point[0] >= Math.min(wire.from[0], wire.to[0]) &&
      point[0] <= Math.max(wire.from[0], wire.to[0]));
  const seen = new Set([key(start)]),
    queue = [start];
  while (queue.length) {
    const current = queue.shift()!;
    for (const wire of wires.filter((w) => on(current, w)))
      for (const point of points.filter((p) => on(p, wire)))
        if (!seen.has(key(point))) {
          seen.add(key(point));
          queue.push(point);
        }
  }
  return seen.has(key(end));
}

describe('electrical diagram and model agreement', () => {
  for (const count of [1, 2, 3]) {
    it(`draws ${count} parallel branches without a wire bypass`, () => {
      const { wires, resistors } = circuitGeometry('parallel', count);
      const edges = resistors.map((r): Wire => ({ from: [r.x - 18, r.y], to: [r.x + 52, r.y] }));
      expect(connected(wires, [100, 185], [100, 215])).toBe(false);
      expect(connected([...wires, ...edges], [100, 185], [100, 215])).toBe(true);
      for (const edge of edges) {
        expect(connected(wires, [100, 185], edge.from)).toBe(true);
        expect(connected(wires, [100, 215], edge.to)).toBe(true);
        expect(connected(wires, edge.from, edge.to)).toBe(false);
      }
      if (count > 1)
        expect(connected([...wires, ...edges.slice(1)], [100, 185], [100, 215])).toBe(true);
      const p = { emf: 6, topology: 'parallel' as const, resistors: [10, 20, 30].slice(0, count) };
      const o = ohmsCircuit.solve(p);
      expect(p.resistors.reduce((sum, _, i) => sum + Number(o[`i${i}`]), 0)).toBeCloseTo(
        Number(o.current),
        10,
      );
      expect(p.resistors.reduce((sum, _, i) => sum + Number(o[`p${i}`]), 0)).toBeCloseTo(
        p.emf * Number(o.current),
        10,
      );
      for (let i = 0; i < count; i++) expect(o[`v${i}`]).toBeCloseTo(p.emf, 10);
    });

    it(`draws ${count} series resistors in the only current path`, () => {
      const { wires, resistors } = circuitGeometry('series', count);
      const edges = resistors.map((r): Wire => ({ from: [r.x - 18, r.y], to: [r.x + 52, r.y] }));
      expect(connected([...wires, ...edges], [100, 185], [100, 215])).toBe(true);
      for (let i = 0; i < count; i++)
        expect(
          connected([...wires, ...edges.filter((_, j) => i !== j)], [100, 185], [100, 215]),
        ).toBe(false);
    });
  }
});

describe('cart physical scale and following camera', () => {
  it('shows greater displacement for a larger net force at the same time', () => {
    const p = { mass: 2, force: 12, muS: 0.4, muK: 0.2 };
    const slow = Number(newtonCart.at(p, 2).x),
      fast = Number(newtonCart.at({ ...p, force: 24 }, 2).x);
    expect(slow).toBeCloseTo(8.08, 10);
    expect(fast).toBeCloseTo(20.08, 10);
    expect(cartCamera(fast).cartX - cartCamera(slow).cartX).toBeCloseTo(
      (fast - slow) * CART_PIXELS_PER_METRE,
      10,
    );
  });
  it('keeps one metre scale while the camera follows very large displacements', () => {
    for (const displacement of [0, 8, 30, 50, 1500]) {
      const camera = cartCamera(displacement);
      expect(camera.cartX).toBeGreaterThanOrEqual(55);
      expect(camera.cartX + 85).toBeLessThan(605);
      expect((camera.cartX - 55) / CART_PIXELS_PER_METRE + camera.cameraMetres).toBeCloseTo(
        displacement,
        10,
      );
      for (let i = 1; i < camera.ticks.length; i++)
        expect(camera.ticks[i]!.x - camera.ticks[i - 1]!.x).toBeCloseTo(
          5 * CART_PIXELS_PER_METRE,
          10,
        );
    }
  });
});

describe('SVG interaction geometry', () => {
  it('recovers the same 45° point on desktop and a letterboxed phone canvas', () => {
    const point: Point = [320 + Math.cos(Math.PI / 4) * 140, 200 - Math.sin(Math.PI / 4) * 140];
    for (const matrix of [
      { a: 1, b: 0, c: 0, d: 1, e: 40, f: 80 },
      { a: 300 / 640, b: 0, c: 0, d: 300 / 640, e: 20, f: 100 + (230 - (400 * 300) / 640) / 2 },
    ]) {
      const client: Point = [matrix.a * point[0] + matrix.e, matrix.d * point[1] + matrix.f];
      const world = simulationPoint(client, matrix)!;
      expect(world[0]).toBeCloseTo(point[0], 10);
      expect(world[1]).toBeCloseTo(point[1], 10);
      expect(draggedParameter('unit-circle', {}, world, [])).toEqual({
        key: 'angleDeg',
        value: 45,
      });
      expect(draggedParameter('unit-circle', {}, world, ['angleDeg'])).toBeNull();
    }
  });
  it('preserves a line intercept under transformed coordinates and refuses invalid or locked input', () => {
    const matrix = { a: 0, b: 2, c: -2, d: 0, e: 1000, f: 10 };
    const point = simulationPoint([768, 690], matrix);
    expect(point).toEqual([340, 116]); // x=1, y=6 for y=2x+4.
    expect(draggedParameter('linear-graph', { m: 2 }, point, [])).toEqual({ key: 'c', value: 4 });
    expect(draggedParameter('linear-graph', { m: 2 }, point, ['c'])).toBeNull();
    expect(simulationPoint([0, 0], null)).toBeNull();
    expect(simulationPoint([0, 0], { a: 0, b: 0, c: 0, d: 0, e: 0, f: 0 })).toBeNull();
    expect(simulationPoint([50, 5], { a: 1, b: 0, c: 0, d: 1, e: 0, f: 20 })).toBeNull();
  });
});

describe('honest simulation state', () => {
  it('never computes or draws a default circuit for an invalid entered resistance', () => {
    const model = vi.spyOn(SIMS['ohms-circuit'], 'at');
    try {
      const html = renderToStaticMarkup(
        <SimView
          id="ohms-circuit"
          value={{ emf: 6, topology: 'parallel', resistors: [0, 20] }}
          onChange={() => {}}
        />,
      );
      expect(model).not.toHaveBeenCalled();
      expect(html).toContain('paused until the values are valid');
      expect(html).toContain('role="alert"');
      expect(html).not.toContain('<svg');
      expect(html).not.toContain('Circuit current');
    } finally {
      model.mockRestore();
    }
  });
  it('disables Run for invalid friction and handles missing values without NaN', () => {
    const html = renderToStaticMarkup(
      <SimView
        id="newton-cart"
        value={{ ...SIM_DEFAULTS['newton-cart'], mass: undefined, muS: 0.1, muK: 0.4 }}
        onChange={() => {}}
      />,
    );
    expect(html).toMatch(
      /<button disabled=""[^>]*aria-pressed="false"[^>]*>(?:(?!<\/button>).)*Run<\/button>/,
    );
    expect(html).not.toContain('NaN');
    expect(html).not.toContain('Displacement');
  });
  it('exposes graph scales and the stopping/model assumptions', () => {
    const html = renderToStaticMarkup(
      <SimView id="motion-graphs" value={{ u: 0, a: 2, duration: 10 }} onChange={() => {}} />,
    );
    expect(html).toContain('>100</text>');
    expect(html).toContain('>20</text>');
    expect(html).toContain('Braking stops at rest, without reversing');
  });
});

describe('chemistry request snapshots', () => {
  it('discards a response after an edit/reset and accepts only the new snapshot', async () => {
    const gate = requestSnapshot(),
      publish = vi.fn();
    let resolve!: (value: string) => void;
    const old = runCurrentRequest(
      gate.begin(),
      new Promise<string>((done) => {
        resolve = done;
      }),
      publish,
    );
    gate.invalidate();
    resolve('old mixture');
    await old;
    expect(publish).not.toHaveBeenCalled();
    await runCurrentRequest(gate.begin(), Promise.resolve('current mixture'), publish);
    expect(publish).toHaveBeenCalledExactlyOnceWith('current mixture');
  });
  it('discards obsolete failures but retains the current failure for retry', async () => {
    const gate = requestSnapshot(),
      publish = vi.fn();
    let reject!: (error: Error) => void;
    const old = runCurrentRequest(
      gate.begin(),
      new Promise<string>((_, fail) => {
        reject = fail;
      }),
      publish,
    );
    gate.invalidate();
    reject(new Error('old failure'));
    await expect(old).resolves.toBeUndefined();
    await expect(
      runCurrentRequest(gate.begin(), Promise.reject(new Error('current failure')), publish),
    ).rejects.toThrow('current failure');
  });
});
