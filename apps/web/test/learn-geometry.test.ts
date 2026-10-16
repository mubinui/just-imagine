import { it, expect } from 'vitest';
import { boxFor, flipFrom } from '../components/learn/geometry';

it('places a body on the 16 by 9 stage in percentages, grown around its centre', () => {
  expect(boxFor({ x: 8, y: 4.5, width: 2, height: 1 })).toEqual({
    left: 43.75,
    top: 44.44444444444444,
    width: 12.5,
    height: 11.11111111111111,
  });
  const grown = boxFor({ x: 8, y: 4.5, width: 2, height: 1 }, 1.5);
  expect(grown.width).toBeCloseTo(18.75);
  expect(grown.left + grown.width / 2).toBeCloseTo(50);
});

it('computes the comes-closer travel from the hotspot to the portrait slot', () => {
  expect(
    flipFrom(
      { left: 100, top: 50, width: 40, height: 40 },
      { left: 300, top: 250, width: 200, height: 200 },
    ),
  ).toEqual({ x: -280, y: -280, scale: 0.2 });
});
