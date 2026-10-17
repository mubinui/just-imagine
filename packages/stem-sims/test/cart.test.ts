import { describe, it, expect } from 'vitest';
import { CartParamsSchema, newtonCart, CART_HORIZON_S } from '../src/cart';

describe('newton-cart model', () => {
  it('stays put while the push is within static friction, which matches the push', () => {
    const p = { mass: 2, force: 9, muS: 0.5, muK: 0.3 };
    const o = newtonCart.solve(p);
    expect(o['moving']).toBe(false);
    expect(o['a']).toBe(0);
    expect(o['friction']).toBeCloseTo(9, 9);
    expect(o['staticLimit']).toBeCloseTo(9.8, 9);
  });

  it('accelerates at (F − μk·m·g)/m once moving', () => {
    const p = { mass: 2, force: 10, muS: 0.5, muK: 0.3 };
    const o = newtonCart.solve(p);
    expect(o['moving']).toBe(true);
    expect(o['friction']).toBeCloseTo(5.88, 9);
    expect(o['net']).toBeCloseTo(4.12, 9);
    expect(o['a']).toBeCloseTo(2.06, 9);
    expect(o['t']).toBe(CART_HORIZON_S);
    expect(o['x']).toBeCloseTo(25.75, 9);
    expect(o['v']).toBeCloseTo(10.3, 9);
    expect(newtonCart.at(p, 2)['x']).toBeCloseTo(4.12, 9);
  });

  it('recognises a push that only just moves the cart', () => {
    const just = { mass: 2, force: 9.9, muS: 0.5, muK: 0.3 };
    const tooMuch = { mass: 2, force: 10, muS: 0.5, muK: 0.3 };
    const still = { mass: 2, force: 9, muS: 0.5, muK: 0.3 };
    const justMoves = newtonCart.predicates['justMoves']!;
    expect(justMoves.test(just, newtonCart.solve(just), {})).toBe(true);
    expect(justMoves.test(tooMuch, newtonCart.solve(tooMuch), {})).toBe(false);
    expect(justMoves.test(still, newtonCart.solve(still), {})).toBe(false);
  });

  it('checks acceleration within tolerance', () => {
    const p = { mass: 2, force: 10, muS: 0.5, muK: 0.3 };
    const check = newtonCart.predicates['accelerationEquals']!;
    expect(check.test(p, newtonCart.solve(p), { a: 2, tol: 0.1 })).toBe(true);
    expect(check.test(p, newtonCart.solve(p), { a: 3, tol: 0.1 })).toBe(false);
  });

  it('rejects kinetic friction above static friction', () => {
    expect(CartParamsSchema.safeParse({ mass: 2, force: 1, muS: 0.2, muK: 0.4 }).success).toBe(
      false,
    );
  });
});
