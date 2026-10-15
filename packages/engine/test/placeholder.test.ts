import { it, expect, vi } from 'vitest';
import { FIXTURE_WORLDS } from '@just-imagine/fixtures';
const calls = vi.hoisted(() => ({
  circle: vi.fn(),
  roundRect: vi.fn(),
  rect: vi.fn(),
  fill: vi.fn(),
  scale: vi.fn(),
}));
vi.mock('pixi.js', () => ({
  Graphics: class {
    scale = { set: calls.scale };
    circle(...args: unknown[]) {
      calls.circle(...args);
      return this;
    }
    rect(...args: unknown[]) {
      calls.rect(...args);
      return this;
    }
    roundRect(...args: unknown[]) {
      calls.roundRect(...args);
      return this;
    }
    moveTo() {
      return this;
    }
    lineTo() {
      return this;
    }
    fill(...args: unknown[]) {
      calls.fill(...args);
      return this;
    }
    stroke() {
      return this;
    }
  },
}));
import { placeholder } from '../src/placeholder';
it('tessellates circular bodies in pixels while retaining their physical size and cream ground', () => {
  const doc = structuredClone(FIXTURE_WORLDS.moonBounce),
    ball = doc.entities.find((e) => !e.body.isStatic)!;
  ball.body.shape = 'circle';
  placeholder(ball);
  expect(calls.circle).toHaveBeenCalledWith(
    0,
    0,
    (Math.min(ball.body.size.width, ball.body.size.height) / 2) * 100,
  );
  expect(calls.roundRect).not.toHaveBeenCalled();
  expect(calls.scale).toHaveBeenCalledWith(0.01);
  const ground = doc.entities.find((e) => e.kind === 'ground')!;
  placeholder(ground);
  expect(calls.rect).toHaveBeenCalled();
  expect(calls.fill).toHaveBeenCalledWith({ color: 0xfff9ee, alpha: 1 });
});
