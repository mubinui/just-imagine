import { describe, it, expect } from 'vitest';
import { fibonacciSphere, projectPoint } from '../components/studio/dot-orb';

describe('dot orb geometry', () => {
  it('places every point on the unit sphere', () => {
    for (const p of fibonacciSphere(400)) expect(Math.hypot(p.x, p.y, p.z)).toBeCloseTo(1, 6);
  });
  it('makes nearer dots larger and brighter', () => {
    const near = projectPoint({ x: 0, y: 0, z: 1 }, 0, 120, 'idle');
    const far = projectPoint({ x: 0, y: 0, z: -1 }, 0, 120, 'idle');
    expect(near.depth).toBeGreaterThan(far.depth);
    expect(near.size).toBeGreaterThan(far.size);
    expect(near.alpha).toBeGreaterThan(far.alpha);
  });
  it('moves more while speaking than while idle', () => {
    const p = { x: 0.6, y: 0.2, z: 0.77 };
    const spread = (mode: 'idle' | 'speaking') => {
      const xs = [0, 0.1, 0.2, 0.3].map((t) => projectPoint(p, t, 120, mode).sx);
      return Math.max(...xs) - Math.min(...xs);
    };
    expect(spread('speaking')).toBeGreaterThan(spread('idle'));
  });
  it('stays within the radius plus wobble and perspective', () => {
    for (const p of fibonacciSphere(200)) {
      const q = projectPoint(p, 1.3, 100, 'speaking');
      expect(Math.hypot(q.sx, q.sy)).toBeLessThan(100 * 1.1 * 1.7);
    }
  });
});
