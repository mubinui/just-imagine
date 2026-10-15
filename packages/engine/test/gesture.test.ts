import { it, expect } from 'vitest';
import { pointerVelocity, recordPointer, type PointerSample } from '../src/gesture';
it('preserves an 80ms flick when pointerup shares the last move position', () => {
  const samples: PointerSample[] = [];
  for (const [x, time] of [
    [0, 0],
    [0.2, 20],
    [0.5, 40],
    [0.8, 60],
    [1, 80],
    [1, 82],
  ])
    recordPointer(samples, { x: x!, y: 0, time: time! });
  expect(pointerVelocity(samples).x).toBeGreaterThan(10);
  expect(samples.length).toBeLessThanOrEqual(6);
});
it('caps movement and forgets stale motion after holding still', () => {
  const s: PointerSample[] = [];
  recordPointer(s, { x: 0, y: 0, time: 0 });
  recordPointer(s, { x: 100, y: 0, time: 20 });
  expect(pointerVelocity(s).x).toBe(20);
  recordPointer(s, { x: 100, y: 0, time: 200 });
  expect(pointerVelocity(s).x).toBe(0);
});
