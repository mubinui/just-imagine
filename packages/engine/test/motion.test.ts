import { describe, expect, it } from 'vitest';
import { advanceMotion, initialMotion, motionFrame, wheelAngle, followRoute } from '../src/motion';
describe('action-based locomotion', () => {
  const options = { kind: 'run' as const, stride: 1 };
  it('advances the same gait by the same travel at different frame rates', () => {
    const move = (hz: number) => {
      let s = initialMotion({ x: 0, y: 0 });
      for (let i = 1; i <= hz; i++)
        s = advanceMotion(s, { x: (i / hz) * 2.3, y: 0 }, 1 / hz, options);
      return s;
    };
    expect(move(60).phase).toBeCloseTo(move(120).phase);
    expect(move(60).distance).toBeCloseTo(2.3);
    expect(motionFrame(move(60), 6)).toBe(1);
  });
  it('stops on rest and reverses facing while continuing a forward gait', () => {
    let s = advanceMotion(initialMotion({ x: 0, y: 0 }), { x: 0.2, y: 0 }, 0.1, options);
    s = advanceMotion(s, { x: 0.1, y: 0 }, 0.1, options);
    expect(s.facing).toBe(-1);
    expect(s.phase).toBeCloseTo(0.3);
    const rest = advanceMotion(s, s, 0.1, options);
    expect(rest.moving).toBe(false);
    expect(rest.phase).toBe(s.phase);
    expect(motionFrame(rest, 6)).toBe(0);
  });
  it('does not turn a fall into running steps, but supports top-down ground paths', () => {
    const s = initialMotion({ x: 0, y: 0 });
    expect(advanceMotion(s, { x: 0, y: 0.2 }, 0.1, options).distance).toBe(0);
    expect(
      advanceMotion(s, { x: 0, y: 0.2 }, 0.1, { ...options, planar: true }).distance,
    ).toBeCloseTo(0.2);
  });
  it('ignores teleports, backwards clocks and tab gaps instead of spinning frames', () => {
    const s = initialMotion({ x: 0, y: 0 });
    for (const dt of [-1, 0, 2, 0.01]) {
      const next = advanceMotion(s, { x: 12, y: 4 }, dt, options);
      expect(next.phase).toBe(0);
      expect(next.moving).toBe(false);
    }
  });
  it('pitches swimming toward travel and preserves heading on a vertical stroke', () => {
    const options = { kind: 'swim' as const, stride: 2 };
    let s = advanceMotion(initialMotion({ x: 1, y: 1 }), { x: 0.8, y: 0.8 }, 0.1, options);
    expect(s.facing).toBe(-1);
    expect(s.tilt).toBeGreaterThan(0);
    s = advanceMotion(s, { x: 0.8, y: 0.6 }, 0.1, options);
    expect(s.facing).toBe(-1);
    expect(s.distance).toBeGreaterThan(0.4);
  });
  it('turns wheels by signed distance/radius and cancels on exact reversing travel', () => {
    const options = { kind: 'roll' as const, stride: 1 };
    let s = advanceMotion(initialMotion({ x: 0, y: 0 }), { x: 0.2, y: 0 }, 0.1, options);
    expect(wheelAngle(s, 0.1)).toBeCloseTo(2);
    expect(wheelAngle(s, 0.2)).toBeCloseTo(1);
    s = advanceMotion(s, { x: 0, y: 0 }, 0.1, options);
    expect(wheelAngle(s, 0.1)).toBeCloseTo(0);
  });
  it('visits route corners without cutting through obstacles and caps at the destination', () => {
    const route = [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
    ];
    expect(followRoute({ x: 0, y: 0 }, route, 1.5)).toEqual({
      point: { x: 1, y: 0.5 },
      pending: [{ x: 1, y: 1 }],
    });
    expect(followRoute({ x: 0, y: 0 }, route, 8)).toEqual({ point: { x: 1, y: 1 }, pending: [] });
    expect(route).toHaveLength(2);
    expect(followRoute({ x: 1, y: 0 }, [{ x: 1.0000001, y: 0 }], 0).pending).toEqual([]);
  });
});
