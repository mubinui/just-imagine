import { it, expect } from 'vitest';
import { Pacing } from '../src/pacing';
it('requests an attention beat at 90 seconds and one recap before the target', () => {
  const pacing = new Pacing(8, 0);
  expect(pacing.tick(89999)).toBeNull();
  expect(pacing.tick(90000)).toBe('beat');
  pacing.beat(100000);
  expect(pacing.tick(189999)).toBeNull();
  expect(pacing.tick(420000)).toBe('recap');
  expect(pacing.tick(480000)).toBe('end');
});
