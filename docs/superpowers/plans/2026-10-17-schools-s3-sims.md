# Schools S3: simulation and chemistry models — implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Two new pure-TypeScript packages.
- `@just-imagine/stem-sims` holds five deterministic sim models with task predicates, a server-side task checker, a chemical-formula and equation balancer, and the chemistry mixer.
- `@just-imagine/stem-content` holds the NCTB class 9–10 taxonomy, the reagent bench and the 20-reaction table.

**Architecture:**
- **Models.** Each sim model is a `SimModel` with a strict Zod params schema and closed-form `at(params, t)` and `solve(params)` functions that return a flat `Observable` record. Named predicates test the `Observable`.
- **Task checking.** `checkSimTask` grades from params alone, so the API can re-check a student's answer without trusting client state.
- **Chemistry.** The mixer receives the reagent and reaction tables as arguments, so `stem-sims` holds no data. `stem-content` depends on `stem-sims`, never the other way round.
- **No DOM, no Rapier, no I/O.**

**Tech stack:** TypeScript 5.9 strict ESM, Zod 4, vitest 3.

**Spec:** `docs/superpowers/specs/2026-10-17-schools-stem-design.md`, §10. The master plan is `docs/superpowers/plans/2026-10-17-schools-stem-master.md`; it records the changes from spec §19 (views move to S4, the AI fallback endpoint moves to S5, the registry lives in `stem-sims`).

## Global constraints

- Run pnpm as `npx -y pnpm@10.34.7` when `pnpm` is not on PATH.
- Package names are `@just-imagine/stem-sims` and `@just-imagine/stem-content`. Tests go in `test/` beside `src/`, named `<unit>.test.ts`.
- Both packages reuse the existing package template: `packages/learning-content/{package.json,tsconfig.json,eslint.config.js,vitest.config.ts}`.
- `g = 9.8 m/s²` (NCTB convention). SI units throughout. Angles in degrees at the boundary.
- Every Bangla string is real Bangla (the tests check that Bengali script is present). Every English string is sentence case.
- Do not edit any file outside `packages/stem-sims/**`, `packages/stem-content/**`, `TODO.md` and `CHECKPOINT.md`.
- **Lockfile.** `pnpm install` updates `pnpm-lock.yaml`, which also holds Codex's uncommitted changes. Do **not** commit `pnpm-lock.yaml`. Task 9 records in `CHECKPOINT.md` that the lockfile now has the two new importers.
- Commits are path-scoped: `git commit -m "..." -- <paths>`. Use Conventional Commits. Messages end with prose and never carry Claude or Anthropic attribution.

## Review focus

1. **Forged sim state.** A client sends extra keys (for example `{ ...params, stopDistance: 25 }`) or out-of-range params, hoping a predicate passes. Expect `invalid-params`; only parsed params feed `solve`. Task 5.
2. **Brackets and hydrates in AI equations.** Inputs like `Fe2(SO4)3`, `CuSO4·5H2O`, `Ca(OH)2(s)`, or an unclosed `(OH`. Expect correct counts, or a thrown `FormulaError` that `isBalanced` turns into `false`. Task 6.
3. **Unknown or duplicate reagents in a mix.** An unknown id, or the same reagent added twice. Expect `MixError` for unknown ids, and duplicates collapse to one. Task 7.
4. **Heat-only reactions.** CuCO₃ heated vs unheated. Expect no reaction without heat. Task 7 and Task 9.
5. **Floating-point at a stop.** A braking body's final velocity is `-1e-15`, not `0`. Expect predicates to use tolerances, and expect `at` never to return reversed motion. Task 1.

---

### Task 1: Scaffold `stem-sims`, the model contract, and the motion-graphs model

**Files:**
- Create: `packages/stem-sims/package.json`, `tsconfig.json`, `eslint.config.js`, `vitest.config.ts`
- Create: `packages/stem-sims/src/types.ts`, `packages/stem-sims/src/motion.ts`, `packages/stem-sims/src/index.ts`
- Test: `packages/stem-sims/test/motion.test.ts`

**Interfaces:**
- Produces: `ObservableValue`, `Observable`, `Predicate<P>`, `SimModel<P, Id>`, `predicate()`, `within()` in `types.ts`; `MotionParamsSchema`, `MotionParams`, `motionGraphs`, `stopTime()` in `motion.ts`.

- [ ] **Step 1: Create the package files**

`packages/stem-sims/package.json`:

```json
{
  "name": "@just-imagine/stem-sims",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "main": "./src/index.ts",
  "types": "./src/index.ts",
  "exports": {
    ".": "./src/index.ts"
  },
  "scripts": {
    "test": "vitest run",
    "typecheck": "tsc --noEmit",
    "lint": "eslint ."
  },
  "dependencies": {
    "zod": "^4.1.0"
  },
  "devDependencies": {
    "@just-imagine/config": "workspace:*",
    "@types/node": "^22.15.0",
    "eslint": "^9.30.0",
    "typescript": "^5.9.0",
    "vitest": "^3.2.0"
  }
}
```

`packages/stem-sims/tsconfig.json`:

```json
{
  "extends": "@just-imagine/config/tsconfig.base.json",
  "compilerOptions": { "types": ["node"] },
  "include": ["src", "test"]
}
```

`packages/stem-sims/eslint.config.js`:

```js
export { default } from '@just-imagine/config/eslint';
```

`packages/stem-sims/vitest.config.ts`:

```ts
import { defineConfig } from 'vitest/config';
export default defineConfig({ test: { include: ['test/**/*.test.ts'], environment: 'node' } });
```

Run: `npx -y pnpm@10.34.7 install`
Expected: completes; `packages/stem-sims/node_modules` exists.

- [ ] **Step 2: Write the failing test**

`packages/stem-sims/test/motion.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { motionGraphs, MotionParamsSchema, stopTime } from '../src/motion';

const braking = { u: 10, a: -2, duration: 10 };
const speeding = { u: 0, a: 2, duration: 4 };

describe('motion-graphs model', () => {
  it('stops a braking body at u²/2|a| and never reverses', () => {
    expect(stopTime(braking)).toBe(5);
    const end = motionGraphs.solve(braking);
    expect(end['stopTime']).toBe(5);
    expect(end['stopDistance']).toBeCloseTo(25, 9);
    expect(end['finalX']).toBeCloseTo(25, 9);
    expect(Math.abs(end['finalV'] as number)).toBeLessThan(1e-9);
    const later = motionGraphs.at(braking, 8);
    expect(later['x']).toBeCloseTo(25, 9);
  });

  it('follows x = ut + ½at² and v = u + at before stopping', () => {
    const mid = motionGraphs.at(braking, 2);
    expect(mid['x']).toBeCloseTo(16, 9);
    expect(mid['v']).toBeCloseTo(6, 9);
  });

  it('reports no stop for a speeding body and clamps time to the run', () => {
    expect(stopTime(speeding)).toBeNull();
    const end = motionGraphs.solve(speeding);
    expect(end['finalX']).toBeCloseTo(16, 9);
    expect(end['finalV']).toBeCloseTo(8, 9);
    expect(end['stopDistance']).toBeNull();
    expect(motionGraphs.at(speeding, 99)['t']).toBe(4);
    expect(motionGraphs.at(speeding, -1)['t']).toBe(0);
  });

  it('checks predicates with tolerances', () => {
    const end = motionGraphs.solve(braking);
    expect(motionGraphs.predicates['stopsAt']!.test(braking, end, { x: 25, tol: 0.5 })).toBe(true);
    expect(motionGraphs.predicates['stopsAt']!.test(braking, end, { x: 24, tol: 0.5 })).toBe(false);
    expect(motionGraphs.predicates['reachesSpeed']!.test(braking, end, { v: 0, tol: 0.01 })).toBe(
      true,
    );
    const fast = motionGraphs.solve(speeding);
    expect(
      motionGraphs.predicates['displacementEquals']!.test(speeding, fast, { x: 16, tol: 0.1 }),
    ).toBe(true);
    expect(motionGraphs.predicates['stopsAt']!.test(speeding, fast, { x: 16, tol: 1 })).toBe(false);
  });

  it('rejects out-of-range and extra params', () => {
    expect(MotionParamsSchema.safeParse({ u: 25, a: 0, duration: 5 }).success).toBe(false);
    expect(MotionParamsSchema.safeParse({ ...braking, x: 1 }).success).toBe(false);
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx -y pnpm@10.34.7 --filter @just-imagine/stem-sims test`
Expected: FAIL, `Cannot find module '../src/motion'` (or similar).

- [ ] **Step 4: Implement**

`packages/stem-sims/src/types.ts`:

```ts
import type { z } from 'zod';

/** A flat, serialisable reading of a sim; the tutor and graders only ever see these. */
export type ObservableValue = number | boolean | null;
export type Observable = Readonly<Record<string, ObservableValue>>;

/** A named check over a sim reading. `args` validates the lesson author's arguments. */
export interface Predicate<P> {
  readonly args: z.ZodType;
  test(params: P, observed: Observable, args: unknown): boolean;
}

export interface SimModel<P, Id extends string = string> {
  readonly id: Id;
  readonly params: z.ZodType<P>;
  /** End-of-run or steady values, recomputable on the server from params alone. */
  solve(params: P): Observable;
  /** Values at t seconds for animation; static sims return the same as solve. */
  at(params: P, t: number): Observable;
  readonly predicates: Readonly<Record<string, Predicate<P>>>;
}

export function predicate<P, A>(
  args: z.ZodType<A>,
  test: (params: P, observed: Observable, args: A) => boolean,
): Predicate<P> {
  return { args, test: (params, observed, raw) => test(params, observed, args.parse(raw)) };
}

/** True when value is a number within tol of target. */
export function within(value: ObservableValue | undefined, target: number, tol: number): boolean {
  return typeof value === 'number' && Math.abs(value - target) <= tol;
}
```

`packages/stem-sims/src/motion.ts`:

```ts
import { z } from 'zod';
import { predicate, within, type Observable, type SimModel } from './types';

/** NCTB Physics Ch 2 (Motion): uniform acceleration along a straight track. */
export const MotionParamsSchema = z.strictObject({
  /** Initial velocity, m/s. */
  u: z.number().min(0).max(20),
  /** Acceleration, m/s²; negative means braking. */
  a: z.number().min(-5).max(5),
  /** Length of the run, s. */
  duration: z.number().min(2).max(20),
});
export type MotionParams = z.infer<typeof MotionParamsSchema>;

/** When a braking body comes to rest within the run, else null. Braking never reverses it. */
export function stopTime(p: MotionParams): number | null {
  if (p.a >= 0) return null;
  const t = p.u / -p.a;
  return t <= p.duration ? t : null;
}

function motionAt(p: MotionParams, t: number) {
  const time = Math.min(Math.max(t, 0), p.duration);
  const stop = stopTime(p);
  const moving = stop === null ? time : Math.min(time, stop);
  return {
    t: time,
    x: p.u * moving + 0.5 * p.a * moving * moving,
    v: p.u + p.a * moving,
  };
}

const tolerance = z.number().positive();

export const motionGraphs: SimModel<MotionParams, 'motion-graphs'> = {
  id: 'motion-graphs',
  params: MotionParamsSchema,
  at: (p, t): Observable => motionAt(p, t),
  solve(p): Observable {
    const end = motionAt(p, p.duration);
    const stop = stopTime(p);
    return {
      duration: p.duration,
      finalX: end.x,
      finalV: end.v,
      stopTime: stop,
      stopDistance: stop === null ? null : end.x,
    };
  },
  predicates: {
    stopsAt: predicate(z.strictObject({ x: z.number(), tol: tolerance }), (_p, o, a) =>
      within(o['stopDistance'], a.x, a.tol),
    ),
    reachesSpeed: predicate(z.strictObject({ v: z.number(), tol: tolerance }), (_p, o, a) =>
      within(o['finalV'], a.v, a.tol),
    ),
    displacementEquals: predicate(z.strictObject({ x: z.number(), tol: tolerance }), (_p, o, a) =>
      within(o['finalX'], a.x, a.tol),
    ),
  },
};
```

`packages/stem-sims/src/index.ts`:

```ts
export * from './types';
export * from './motion';
```

- [ ] **Step 5: Run the tests, typecheck and lint**

Run: `npx -y pnpm@10.34.7 --filter @just-imagine/stem-sims test && npx -y pnpm@10.34.7 --filter @just-imagine/stem-sims typecheck && npx -y pnpm@10.34.7 --filter @just-imagine/stem-sims lint`
Expected: 5 tests PASS; no type or lint errors.

- [ ] **Step 6: Commit**

```bash
git add packages/stem-sims
git commit -m "feat(stem-sims): sim model contract and motion graphs model

Adds the stem-sims package with the SimModel contract and the NCTB Physics chapter 2 motion model, which brakes to rest without reversing and checks stop distance, speed and displacement within tolerances." -- packages/stem-sims
```

---

### Task 2: Newton's second law cart with friction

**Files:**
- Create: `packages/stem-sims/src/cart.ts`
- Modify: `packages/stem-sims/src/index.ts` (add `export * from './cart';`)
- Test: `packages/stem-sims/test/cart.test.ts`

**Interfaces:**
- Consumes: `predicate`, `within`, `SimModel`, `Observable` from `./types`.
- Produces: `G = 9.8`, `CART_HORIZON_S = 5`, `CartParamsSchema`, `CartParams`, `newtonCart`.

- [ ] **Step 1: Write the failing test**

`packages/stem-sims/test/cart.test.ts`:

```ts
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
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx -y pnpm@10.34.7 --filter @just-imagine/stem-sims test -- cart`
Expected: FAIL, cannot find `../src/cart`.

- [ ] **Step 3: Implement**

`packages/stem-sims/src/cart.ts`:

```ts
import { z } from 'zod';
import { predicate, within, type Observable, type SimModel } from './types';

/** NCTB uses g = 9.8 m/s². */
export const G = 9.8;
/** Seconds the cart run lasts; solve() reports this moment. */
export const CART_HORIZON_S = 5;

/** NCTB Physics Ch 3 (Force): a cart pushed along a rough floor. */
export const CartParamsSchema = z
  .strictObject({
    /** kg */
    mass: z.number().min(0.5).max(10),
    /** Applied horizontal force, N. */
    force: z.number().min(0).max(60),
    /** Coefficient of static friction. */
    muS: z.number().min(0).max(0.8),
    /** Coefficient of kinetic friction. */
    muK: z.number().min(0).max(0.8),
  })
  .refine((p) => p.muK <= p.muS, { message: 'Kinetic friction cannot exceed static friction.' });
export type CartParams = z.infer<typeof CartParamsSchema>;

function dynamics(p: CartParams) {
  const normal = p.mass * G;
  const staticLimit = p.muS * normal;
  if (p.force <= staticLimit) return { moving: false, a: 0, friction: p.force, net: 0, staticLimit };
  const friction = p.muK * normal;
  const net = p.force - friction;
  return { moving: true, a: net / p.mass, friction, net, staticLimit };
}

function cartAt(p: CartParams, t: number): Observable {
  const d = dynamics(p);
  const time = Math.min(Math.max(t, 0), CART_HORIZON_S);
  return { t: time, x: 0.5 * d.a * time * time, v: d.a * time, ...d };
}

export const newtonCart: SimModel<CartParams, 'newton-cart'> = {
  id: 'newton-cart',
  params: CartParamsSchema,
  at: cartAt,
  solve: (p) => cartAt(p, CART_HORIZON_S),
  predicates: {
    /** Moving, with the push no more than 2% above the static limit. */
    justMoves: predicate(
      z.strictObject({}),
      (p, o) =>
        o['moving'] === true &&
        typeof o['staticLimit'] === 'number' &&
        p.force <= o['staticLimit'] * 1.02,
    ),
    accelerationEquals: predicate(
      z.strictObject({ a: z.number(), tol: z.number().positive() }),
      (_p, o, a) => within(o['a'], a.a, a.tol),
    ),
  },
};
```

Add `export * from './cart';` to `src/index.ts`.

- [ ] **Step 4: Run the tests**

Run: `npx -y pnpm@10.34.7 --filter @just-imagine/stem-sims test && npx -y pnpm@10.34.7 --filter @just-imagine/stem-sims typecheck`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/stem-sims
git commit -m "feat(stem-sims): Newton's second law cart with static and kinetic friction

The cart holds still while the push is within static friction and otherwise accelerates at (F - mu_k m g)/m, with a just-moves check for finding the threshold force." -- packages/stem-sims
```

---

### Task 3: Ohm's law circuit

**Files:**
- Create: `packages/stem-sims/src/circuit.ts`
- Modify: `packages/stem-sims/src/index.ts` (add `export * from './circuit';`)
- Test: `packages/stem-sims/test/circuit.test.ts`

**Interfaces:**
- Produces: `CircuitParamsSchema`, `CircuitParams`, `ohmsCircuit`. Observable keys: `req`, `current`, and `v0`, `i0`, `p0` through `v2`, `i2`, `p2` (`null` for absent resistors).

- [ ] **Step 1: Write the failing test**

`packages/stem-sims/test/circuit.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { CircuitParamsSchema, ohmsCircuit } from '../src/circuit';

describe('ohms-circuit model', () => {
  it('solves a series circuit', () => {
    const o = ohmsCircuit.solve({ emf: 6, topology: 'series', resistors: [2, 4] });
    expect(o['req']).toBeCloseTo(6, 9);
    expect(o['current']).toBeCloseTo(1, 9);
    expect(o['v0']).toBeCloseTo(2, 9);
    expect(o['v1']).toBeCloseTo(4, 9);
    expect(o['p1']).toBeCloseTo(4, 9);
    expect(o['v2']).toBeNull();
  });

  it('solves a parallel circuit', () => {
    const o = ohmsCircuit.solve({ emf: 6, topology: 'parallel', resistors: [3, 6] });
    expect(o['req']).toBeCloseTo(2, 9);
    expect(o['current']).toBeCloseTo(3, 9);
    expect(o['i0']).toBeCloseTo(2, 9);
    expect(o['i1']).toBeCloseTo(1, 9);
    expect(o['p0']).toBeCloseTo(12, 9);
  });

  it('checks current and power predicates', () => {
    const p = { emf: 6, topology: 'parallel' as const, resistors: [3, 6] };
    const o = ohmsCircuit.solve(p);
    expect(ohmsCircuit.predicates['currentEquals']!.test(p, o, { i: 3, tol: 0.05 })).toBe(true);
    expect(ohmsCircuit.predicates['powerAtLeast']!.test(p, o, { index: 1, p: 6 })).toBe(true);
    expect(ohmsCircuit.predicates['powerAtLeast']!.test(p, o, { index: 2, p: 1 })).toBe(false);
  });

  it('rejects empty, oversized and out-of-range circuits', () => {
    expect(
      CircuitParamsSchema.safeParse({ emf: 6, topology: 'series', resistors: [] }).success,
    ).toBe(false);
    expect(
      CircuitParamsSchema.safeParse({ emf: 6, topology: 'series', resistors: [1, 2, 3, 4] })
        .success,
    ).toBe(false);
    expect(
      CircuitParamsSchema.safeParse({ emf: 20, topology: 'series', resistors: [1] }).success,
    ).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx -y pnpm@10.34.7 --filter @just-imagine/stem-sims test -- circuit`
Expected: FAIL, cannot find `../src/circuit`.

- [ ] **Step 3: Implement**

`packages/stem-sims/src/circuit.ts`:

```ts
import { z } from 'zod';
import { predicate, within, type Observable, type SimModel } from './types';

export const MAX_RESISTORS = 3;

/** NCTB Physics Ch 11 (Current electricity): one cell and up to three resistors or bulbs. */
export const CircuitParamsSchema = z.strictObject({
  /** Cell EMF, V; the cell is ideal (no internal resistance). */
  emf: z.number().min(1.5).max(12),
  topology: z.enum(['series', 'parallel']),
  /** Ohms. */
  resistors: z.array(z.number().min(1).max(100)).min(1).max(MAX_RESISTORS),
});
export type CircuitParams = z.infer<typeof CircuitParamsSchema>;

function solveCircuit(p: CircuitParams): Observable {
  const series = p.topology === 'series';
  const req = series
    ? p.resistors.reduce((sum, r) => sum + r, 0)
    : 1 / p.resistors.reduce((sum, r) => sum + 1 / r, 0);
  const current = p.emf / req;
  const out: Record<string, number | null> = { req, current };
  for (let index = 0; index < MAX_RESISTORS; index++) {
    const r = p.resistors[index];
    if (r === undefined) {
      out[`v${index}`] = out[`i${index}`] = out[`p${index}`] = null;
      continue;
    }
    const i = series ? current : p.emf / r;
    out[`v${index}`] = i * r;
    out[`i${index}`] = i;
    out[`p${index}`] = i * i * r;
  }
  return out;
}

export const ohmsCircuit: SimModel<CircuitParams, 'ohms-circuit'> = {
  id: 'ohms-circuit',
  params: CircuitParamsSchema,
  at: (p) => solveCircuit(p),
  solve: solveCircuit,
  predicates: {
    currentEquals: predicate(
      z.strictObject({ i: z.number(), tol: z.number().positive() }),
      (_p, o, a) => within(o['current'], a.i, a.tol),
    ),
    powerAtLeast: predicate(
      z.strictObject({
        index: z
          .number()
          .int()
          .min(0)
          .max(MAX_RESISTORS - 1),
        p: z.number().nonnegative(),
      }),
      (_p, o, a) => {
        const power = o[`p${a.index}`];
        return typeof power === 'number' && power >= a.p;
      },
    ),
  },
};
```

Add `export * from './circuit';` to `src/index.ts`.

- [ ] **Step 4: Run the tests**

Run: `npx -y pnpm@10.34.7 --filter @just-imagine/stem-sims test && npx -y pnpm@10.34.7 --filter @just-imagine/stem-sims typecheck`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/stem-sims
git commit -m "feat(stem-sims): Ohm's law circuit with series and parallel resistors

Solves equivalent resistance, total current and each element's voltage, current and power for one ideal cell and up to three resistors." -- packages/stem-sims
```

---

### Task 4: Linear graph and unit circle

**Files:**
- Create: `packages/stem-sims/src/linear.ts`, `packages/stem-sims/src/unit-circle.ts`
- Modify: `packages/stem-sims/src/index.ts` (add both exports)
- Test: `packages/stem-sims/test/math.test.ts`

**Interfaces:**
- Produces: `LinearParamsSchema`, `linearGraph` (observable: `slope`, `intercept`, `xIntercept`); `UnitCircleParamsSchema`, `unitCircle` (observable: `angleDeg`, `sin`, `cos`, `tan`, `quadrant`, where `quadrant` 0 means on an axis).

- [ ] **Step 1: Write the failing test**

`packages/stem-sims/test/math.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { linearGraph, LinearParamsSchema } from '../src/linear';
import { unitCircle } from '../src/unit-circle';

describe('linear-graph model', () => {
  it('reports slope, intercepts and lines through points', () => {
    const p = { m: 2, c: -4 };
    const o = linearGraph.solve(p);
    expect(o['xIntercept']).toBe(2);
    const through = linearGraph.predicates['lineThrough']!;
    expect(
      through.test(p, o, {
        points: [
          { x: 0, y: -4 },
          { x: 3, y: 2 },
        ],
        tol: 0.01,
      }),
    ).toBe(true);
    expect(through.test(p, o, { points: [{ x: 1, y: 1 }], tol: 0.01 })).toBe(false);
    expect(linearGraph.predicates['slopeEquals']!.test(p, o, { m: 2, tol: 0.01 })).toBe(true);
    expect(linearGraph.predicates['interceptEquals']!.test(p, o, { c: -4, tol: 0.01 })).toBe(
      true,
    );
  });

  it('has no x-intercept for a horizontal line', () => {
    expect(linearGraph.solve({ m: 0, c: 3 })['xIntercept']).toBeNull();
  });

  it('rejects slopes outside ±10', () => {
    expect(LinearParamsSchema.safeParse({ m: 11, c: 0 }).success).toBe(false);
  });
});

describe('unit-circle model', () => {
  it('gives sin, cos and tan for an angle in degrees', () => {
    const o = unitCircle.solve({ angleDeg: 30 });
    expect(o['sin']).toBeCloseTo(0.5, 9);
    expect(o['cos']).toBeCloseTo(Math.sqrt(3) / 2, 9);
    expect(o['tan']).toBeCloseTo(1 / Math.sqrt(3), 9);
    expect(o['quadrant']).toBe(1);
  });

  it('has no tangent on the vertical axis and marks axes as quadrant 0', () => {
    const o = unitCircle.solve({ angleDeg: 90 });
    expect(o['tan']).toBeNull();
    expect(o['quadrant']).toBe(0);
    expect(unitCircle.solve({ angleDeg: 210 })['quadrant']).toBe(3);
  });

  it('checks angle and ratio predicates', () => {
    const p = { angleDeg: 150 };
    const o = unitCircle.solve(p);
    expect(unitCircle.predicates['sinEquals']!.test(p, o, { v: 0.5, tol: 0.01 })).toBe(true);
    expect(unitCircle.predicates['cosEquals']!.test(p, o, { v: 0.5, tol: 0.01 })).toBe(false);
    expect(unitCircle.predicates['angleWithin']!.test(p, o, { min: 90, max: 180 })).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx -y pnpm@10.34.7 --filter @just-imagine/stem-sims test -- math`
Expected: FAIL, cannot find `../src/linear`.

- [ ] **Step 3: Implement**

`packages/stem-sims/src/linear.ts`:

```ts
import { z } from 'zod';
import { predicate, within, type Observable, type SimModel } from './types';

/** Graphs of y = mx + c (General Math, linear equations in two variables; Higher Math, coordinate geometry). */
export const LinearParamsSchema = z.strictObject({
  m: z.number().min(-10).max(10),
  c: z.number().min(-10).max(10),
});
export type LinearParams = z.infer<typeof LinearParamsSchema>;

const solveLine = (p: LinearParams): Observable => ({
  slope: p.m,
  intercept: p.c,
  xIntercept: p.m === 0 ? null : -p.c / p.m,
});

const tolerance = z.number().positive();

export const linearGraph: SimModel<LinearParams, 'linear-graph'> = {
  id: 'linear-graph',
  params: LinearParamsSchema,
  at: (p) => solveLine(p),
  solve: solveLine,
  predicates: {
    lineThrough: predicate(
      z.strictObject({
        points: z.array(z.strictObject({ x: z.number(), y: z.number() })).min(1).max(4),
        tol: tolerance,
      }),
      (p, _o, a) => a.points.every((pt) => Math.abs(p.m * pt.x + p.c - pt.y) <= a.tol),
    ),
    slopeEquals: predicate(z.strictObject({ m: z.number(), tol: tolerance }), (_p, o, a) =>
      within(o['slope'], a.m, a.tol),
    ),
    interceptEquals: predicate(z.strictObject({ c: z.number(), tol: tolerance }), (_p, o, a) =>
      within(o['intercept'], a.c, a.tol),
    ),
  },
};
```

`packages/stem-sims/src/unit-circle.ts`:

```ts
import { z } from 'zod';
import { predicate, within, type Observable, type SimModel } from './types';

/** Trigonometric ratios on the unit circle (General Math trigonometric ratio; Higher Math trigonometry). */
export const UnitCircleParamsSchema = z.strictObject({ angleDeg: z.number().min(0).max(360) });
export type UnitCircleParams = z.infer<typeof UnitCircleParamsSchema>;

const EPSILON = 1e-9;

function quadrant(angleDeg: number): number {
  const a = angleDeg % 360;
  if (a % 90 === 0) return 0;
  return Math.floor(a / 90) + 1;
}

function solveCircle(p: UnitCircleParams): Observable {
  const rad = (p.angleDeg * Math.PI) / 180;
  const sin = Math.sin(rad);
  const cos = Math.cos(rad);
  return {
    angleDeg: p.angleDeg,
    sin,
    cos,
    tan: Math.abs(cos) < EPSILON ? null : sin / cos,
    quadrant: quadrant(p.angleDeg),
  };
}

const tolerance = z.number().positive();

export const unitCircle: SimModel<UnitCircleParams, 'unit-circle'> = {
  id: 'unit-circle',
  params: UnitCircleParamsSchema,
  at: (p) => solveCircle(p),
  solve: solveCircle,
  predicates: {
    angleWithin: predicate(
      z.strictObject({ min: z.number().min(0).max(360), max: z.number().min(0).max(360) }),
      (p, _o, a) => p.angleDeg >= a.min && p.angleDeg <= a.max,
    ),
    sinEquals: predicate(z.strictObject({ v: z.number().min(-1).max(1), tol: tolerance }), (_p, o, a) =>
      within(o['sin'], a.v, a.tol),
    ),
    cosEquals: predicate(z.strictObject({ v: z.number().min(-1).max(1), tol: tolerance }), (_p, o, a) =>
      within(o['cos'], a.v, a.tol),
    ),
  },
};
```

Add `export * from './linear';` and `export * from './unit-circle';` to `src/index.ts`.

- [ ] **Step 4: Run the tests**

Run: `npx -y pnpm@10.34.7 --filter @just-imagine/stem-sims test && npx -y pnpm@10.34.7 --filter @just-imagine/stem-sims typecheck`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/stem-sims
git commit -m "feat(stem-sims): linear graph and unit circle math models

Adds y = mx + c with intercepts and point checks, and unit-circle sine, cosine and tangent with quadrant reporting and no tangent on the vertical axis." -- packages/stem-sims
```

---

### Task 5: Sim registry and server-side task checking

**Files:**
- Create: `packages/stem-sims/src/registry.ts`
- Modify: `packages/stem-sims/src/index.ts` (add `export * from './registry';`)
- Test: `packages/stem-sims/test/registry.test.ts`

**Interfaces:**
- Consumes: `motionGraphs`, `newtonCart`, `ohmsCircuit`, `linearGraph`, `unitCircle`.
- Produces:
  - `SIMS`, `SIM_IDS`, `SimIdSchema`, `SimId`;
  - `SimTaskSchema` (`{ predicate: string; args: unknown }`) and `SimTask`;
  - `TaskCheck = { ok: true; met: boolean } | { ok: false; reason: 'unknown-sim' | 'invalid-params' | 'unknown-predicate' | 'invalid-args' }`;
  - `checkSimTask(simId: string, rawParams: unknown, task: SimTask): TaskCheck`;
  - `describeSim(simId)`, which returns `{ id, predicates: string[] }` for authoring.
- S5's grader calls `checkSimTask`, and S4's editor uses `SimIdSchema` and `describeSim`.

- [ ] **Step 1: Write the failing test**

`packages/stem-sims/test/registry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { checkSimTask, describeSim, SIM_IDS, SimIdSchema } from '../src/registry';

describe('sim registry', () => {
  it('registers exactly the five demo sims', () => {
    expect([...SIM_IDS].sort()).toEqual(
      ['linear-graph', 'motion-graphs', 'newton-cart', 'ohms-circuit', 'unit-circle'].sort(),
    );
    expect(SimIdSchema.safeParse('chem-lab').success).toBe(false);
    expect(describeSim('newton-cart').predicates).toEqual(['justMoves', 'accelerationEquals']);
  });

  it('grades from params alone', () => {
    const met = checkSimTask(
      'motion-graphs',
      { u: 10, a: -2, duration: 10 },
      { predicate: 'stopsAt', args: { x: 25, tol: 0.5 } },
    );
    expect(met).toEqual({ ok: true, met: true });
    const missed = checkSimTask(
      'motion-graphs',
      { u: 10, a: -1, duration: 10 },
      { predicate: 'stopsAt', args: { x: 25, tol: 0.5 } },
    );
    expect(missed).toEqual({ ok: true, met: false });
  });

  it('ignores forged state by refusing extra keys and out-of-range params', () => {
    const forged = checkSimTask(
      'motion-graphs',
      { u: 10, a: -1, duration: 10, stopDistance: 25 },
      { predicate: 'stopsAt', args: { x: 25, tol: 0.5 } },
    );
    expect(forged).toEqual({ ok: false, reason: 'invalid-params' });
    expect(
      checkSimTask('newton-cart', { mass: 99, force: 1, muS: 0.1, muK: 0.1 }, {
        predicate: 'justMoves',
        args: {},
      }),
    ).toEqual({ ok: false, reason: 'invalid-params' });
  });

  it('reports unknown sims, predicates and bad args', () => {
    expect(checkSimTask('nope', {}, { predicate: 'x', args: {} })).toEqual({
      ok: false,
      reason: 'unknown-sim',
    });
    expect(
      checkSimTask('unit-circle', { angleDeg: 30 }, { predicate: 'toString', args: {} }),
    ).toEqual({ ok: false, reason: 'unknown-predicate' });
    expect(
      checkSimTask('unit-circle', { angleDeg: 30 }, { predicate: 'sinEquals', args: { v: 5 } }),
    ).toEqual({ ok: false, reason: 'invalid-args' });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx -y pnpm@10.34.7 --filter @just-imagine/stem-sims test -- registry`
Expected: FAIL, cannot find `../src/registry`.

- [ ] **Step 3: Implement**

`packages/stem-sims/src/registry.ts`:

```ts
import { z } from 'zod';
import { newtonCart } from './cart';
import { ohmsCircuit } from './circuit';
import { linearGraph } from './linear';
import { motionGraphs } from './motion';
import type { SimModel } from './types';
import { unitCircle } from './unit-circle';

export const SIMS = {
  'motion-graphs': motionGraphs,
  'newton-cart': newtonCart,
  'ohms-circuit': ohmsCircuit,
  'linear-graph': linearGraph,
  'unit-circle': unitCircle,
} as const;
export type SimId = keyof typeof SIMS;
export const SIM_IDS = Object.keys(SIMS) as readonly SimId[];
export const SimIdSchema = z.enum([
  'motion-graphs',
  'newton-cart',
  'ohms-circuit',
  'linear-graph',
  'unit-circle',
]);

export const SimTaskSchema = z.strictObject({
  predicate: z.string().min(1).max(64),
  args: z.unknown(),
});
export type SimTask = z.infer<typeof SimTaskSchema>;

export type TaskCheck =
  | { ok: true; met: boolean }
  | {
      ok: false;
      reason: 'unknown-sim' | 'invalid-params' | 'unknown-predicate' | 'invalid-args';
    };

const MODELS: Readonly<Record<string, SimModel<unknown>>> = SIMS;

/**
 * Grades a sim task from the submitted params alone. Client-reported readings are never
 * accepted: params are strictly parsed and the model recomputes everything it checks.
 */
export function checkSimTask(simId: string, rawParams: unknown, task: SimTask): TaskCheck {
  if (!Object.hasOwn(MODELS, simId)) return { ok: false, reason: 'unknown-sim' };
  const model = MODELS[simId]!;
  const params = model.params.safeParse(rawParams);
  if (!params.success) return { ok: false, reason: 'invalid-params' };
  if (!Object.hasOwn(model.predicates, task.predicate))
    return { ok: false, reason: 'unknown-predicate' };
  const check = model.predicates[task.predicate]!;
  const args = check.args.safeParse(task.args);
  if (!args.success) return { ok: false, reason: 'invalid-args' };
  return { ok: true, met: check.test(params.data, model.solve(params.data), args.data) };
}

export function describeSim(simId: SimId): { id: SimId; predicates: string[] } {
  return { id: simId, predicates: Object.keys(SIMS[simId].predicates) };
}
```

Add `export * from './registry';` to `src/index.ts`.

If `const MODELS: Readonly<Record<string, SimModel<unknown>>> = SIMS;` fails to typecheck because of variance, write it as `= SIMS as unknown as Readonly<Record<string, SimModel<unknown>>>;` and keep the comment that explains why.

- [ ] **Step 4: Run the tests**

Run: `npx -y pnpm@10.34.7 --filter @just-imagine/stem-sims test && npx -y pnpm@10.34.7 --filter @just-imagine/stem-sims typecheck && npx -y pnpm@10.34.7 --filter @just-imagine/stem-sims lint`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/stem-sims
git commit -m "feat(stem-sims): sim registry and params-only task checking

checkSimTask grades a lesson task by strictly parsing the submitted params and recomputing the reading, so a student cannot pass by reporting a state they never reached." -- packages/stem-sims
```

---

### Task 6: Chemical formula parser and equation balance

**Files:**
- Create: `packages/stem-sims/src/chem/elements.ts`, `packages/stem-sims/src/chem/formula.ts`
- Modify: `packages/stem-sims/src/index.ts` (add `export * from './chem/formula';`)
- Test: `packages/stem-sims/test/formula.test.ts`

**Interfaces:**
- Produces:
  - `FormulaError`;
  - `parseFormula(formula: string): Map<string, number>`;
  - `parseEquation(equation: string): { reactants: EquationTerm[]; products: EquationTerm[] }`, where `EquationTerm = { coefficient: number; formula: string }`;
  - `atomBalance(equation: string): { balanced: boolean; reactants: Record<string, number>; products: Record<string, number> }`, which throws `FormulaError`;
  - `isBalanced(equation: string): boolean`, which never throws.
- S5's AI fallback calls `isBalanced`, and `stem-content` tests call `atomBalance`.

- [ ] **Step 1: Write the failing test**

`packages/stem-sims/test/formula.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  atomBalance,
  FormulaError,
  isBalanced,
  parseEquation,
  parseFormula,
} from '../src/chem/formula';

const counts = (formula: string) => Object.fromEntries(parseFormula(formula));

describe('parseFormula', () => {
  it('counts simple, bracketed and hydrated formulas', () => {
    expect(counts('H2O')).toEqual({ H: 2, O: 1 });
    expect(counts('Ca(OH)2')).toEqual({ Ca: 1, O: 2, H: 2 });
    expect(counts('Fe2(SO4)3')).toEqual({ Fe: 2, S: 3, O: 12 });
    expect(counts('CuSO4·5H2O')).toEqual({ Cu: 1, S: 1, O: 9, H: 10 });
    expect(counts('Cu(OH)2(s)')).toEqual({ Cu: 1, O: 2, H: 2 });
    expect(counts('NaHCO3(aq)')).toEqual({ Na: 1, H: 1, C: 1, O: 3 });
  });

  it('rejects unknown elements and broken brackets', () => {
    expect(() => parseFormula('Xy2')).toThrow(FormulaError);
    expect(() => parseFormula('Ca(OH')).toThrow(FormulaError);
    expect(() => parseFormula('CaOH)2')).toThrow(FormulaError);
    expect(() => parseFormula('')).toThrow(FormulaError);
    expect(() => parseFormula('h2o')).toThrow(FormulaError);
  });
});

describe('parseEquation and atomBalance', () => {
  it('reads coefficients on both sides of either arrow', () => {
    expect(parseEquation('2H2O2 → 2H2O + O2')).toEqual({
      reactants: [{ coefficient: 2, formula: 'H2O2' }],
      products: [
        { coefficient: 2, formula: 'H2O' },
        { coefficient: 1, formula: 'O2' },
      ],
    });
  });

  it('finds balanced and unbalanced equations', () => {
    expect(atomBalance('2H2 + O2 -> 2H2O').balanced).toBe(true);
    expect(atomBalance('H2 + O2 -> H2O').balanced).toBe(false);
    expect(atomBalance('Ca(OH)2 + CO2 → CaCO3 + H2O').balanced).toBe(true);
    expect(atomBalance('CuSO4·5H2O -> CuSO4 + 5H2O').balanced).toBe(true);
    expect(atomBalance('FeCl3 + 3NaOH -> Fe(OH)3 + 3NaCl').balanced).toBe(true);
  });

  it('treats an element missing from one side as unbalanced', () => {
    expect(atomBalance('Na + H2O -> NaOH').balanced).toBe(false);
  });

  it('never throws from isBalanced', () => {
    expect(isBalanced('not an equation')).toBe(false);
    expect(isBalanced('A -> B -> C')).toBe(false);
    expect(isBalanced('HCl + NaOH -> NaCl + H2O')).toBe(true);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx -y pnpm@10.34.7 --filter @just-imagine/stem-sims test -- formula`
Expected: FAIL, cannot find `../src/chem/formula`.

- [ ] **Step 3: Implement**

`packages/stem-sims/src/chem/elements.ts`:

```ts
/** All 118 element symbols. */
export const ELEMENT_SYMBOLS: ReadonlySet<string> = new Set(
  (
    'H He Li Be B C N O F Ne Na Mg Al Si P S Cl Ar K Ca Sc Ti V Cr Mn Fe Co Ni Cu Zn Ga Ge As Se ' +
    'Br Kr Rb Sr Y Zr Nb Mo Tc Ru Rh Pd Ag Cd In Sn Sb Te I Xe Cs Ba La Ce Pr Nd Pm Sm Eu Gd Tb ' +
    'Dy Ho Er Tm Yb Lu Hf Ta W Re Os Ir Pt Au Hg Tl Pb Bi Po At Rn Fr Ra Ac Th Pa U Np Pu Am Cm ' +
    'Bk Cf Es Fm Md No Lr Rf Db Sg Bh Hs Mt Ds Rg Cn Nh Fl Mc Lv Ts Og'
  ).split(' '),
);
```

`packages/stem-sims/src/chem/formula.ts`:

```ts
import { ELEMENT_SYMBOLS } from './elements';

export class FormulaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FormulaError';
  }
}

export type AtomCounts = Map<string, number>;
export interface EquationTerm {
  coefficient: number;
  formula: string;
}

function addInto(target: AtomCounts, source: AtomCounts, times: number): void {
  for (const [element, n] of source) target.set(element, (target.get(element) ?? 0) + n * times);
}

function parseGroup(text: string): AtomCounts {
  let pos = 0;
  const readNumber = (): number => {
    const match = /^\d+/.exec(text.slice(pos));
    if (!match) return 1;
    pos += match[0].length;
    return Number(match[0]);
  };
  const sequence = (closing: boolean): AtomCounts => {
    const counts: AtomCounts = new Map();
    while (pos < text.length) {
      const ch = text[pos]!;
      if (ch === '(' || ch === '[') {
        pos++;
        const inner = sequence(true);
        addInto(counts, inner, readNumber());
        continue;
      }
      if (ch === ')' || ch === ']') {
        if (!closing) throw new FormulaError(`Unexpected "${ch}" in ${text}.`);
        pos++;
        return counts;
      }
      const match = /^[A-Z][a-z]?/.exec(text.slice(pos));
      if (!match || !ELEMENT_SYMBOLS.has(match[0]))
        throw new FormulaError(`Unknown element at "${text.slice(pos)}" in ${text}.`);
      pos += match[0].length;
      addInto(counts, new Map([[match[0], 1]]), readNumber());
    }
    if (closing) throw new FormulaError(`Unclosed bracket in ${text}.`);
    return counts;
  };
  const counts = sequence(false);
  if (counts.size === 0) throw new FormulaError('Empty formula.');
  return counts;
}

/** Counts atoms in a formula such as Fe2(SO4)3, CuSO4·5H2O or Cu(OH)2(s). */
export function parseFormula(formula: string): AtomCounts {
  const text = formula.replace(/\s+/g, '').replace(/\((?:s|l|g|aq)\)$/, '');
  if (text === '') throw new FormulaError('Empty formula.');
  const total: AtomCounts = new Map();
  for (const [index, part] of text.split(/[·.*]/).entries()) {
    const hydrate = index > 0 ? /^(\d+)(.+)$/.exec(part) : null;
    addInto(total, parseGroup(hydrate ? hydrate[2]! : part), hydrate ? Number(hydrate[1]) : 1);
  }
  return total;
}

function parseSide(side: string): EquationTerm[] {
  const terms = side
    .split('+')
    .map((t) => t.trim())
    .filter(Boolean);
  if (terms.length === 0) throw new FormulaError('An equation side is empty.');
  return terms.map((term) => {
    const match = /^(\d*)\s*(.+)$/.exec(term)!;
    return { coefficient: match[1] ? Number(match[1]) : 1, formula: match[2]! };
  });
}

export function parseEquation(equation: string): {
  reactants: EquationTerm[];
  products: EquationTerm[];
} {
  const sides = equation.split(/->|→|=/);
  if (sides.length !== 2) throw new FormulaError('An equation needs exactly one arrow.');
  return { reactants: parseSide(sides[0]!), products: parseSide(sides[1]!) };
}

function total(terms: EquationTerm[]): Record<string, number> {
  const counts: AtomCounts = new Map();
  for (const term of terms) addInto(counts, parseFormula(term.formula), term.coefficient);
  return Object.fromEntries(counts);
}

/** Atom counts on each side; throws FormulaError for anything it cannot read. */
export function atomBalance(equation: string): {
  balanced: boolean;
  reactants: Record<string, number>;
  products: Record<string, number>;
} {
  const { reactants, products } = parseEquation(equation);
  const left = total(reactants);
  const right = total(products);
  const elements = new Set([...Object.keys(left), ...Object.keys(right)]);
  const balanced = [...elements].every((e) => (left[e] ?? 0) === (right[e] ?? 0));
  return { balanced, reactants: left, products: right };
}

export function isBalanced(equation: string): boolean {
  try {
    return atomBalance(equation).balanced;
  } catch {
    return false;
  }
}
```

Add `export * from './chem/formula';` to `src/index.ts`.

- [ ] **Step 4: Run the tests**

Run: `npx -y pnpm@10.34.7 --filter @just-imagine/stem-sims test && npx -y pnpm@10.34.7 --filter @just-imagine/stem-sims typecheck && npx -y pnpm@10.34.7 --filter @just-imagine/stem-sims lint`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/stem-sims
git commit -m "feat(stem-sims): chemical formula parser and equation atom balance

Reads brackets, hydrates and state suffixes against the real element symbols, and checks that every element balances, which the chemistry lab's AI fallback will rely on." -- packages/stem-sims
```

---

### Task 7: Chemistry lab schemas, indicators, mixer and lab tasks

**Files:**
- Create: `packages/stem-sims/src/chem/lab.ts`
- Modify: `packages/stem-sims/src/index.ts` (add `export * from './chem/lab';`)
- Test: `packages/stem-sims/test/lab.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks at runtime (the tables come in as arguments).
- Produces:
  - Schemas and types: `BilingualSchema`, `HexColourSchema`, `ReagentSchema`/`Reagent`, `ReactionSchema`/`Reaction`.
  - `INDICATOR_IDS = ['litmus', 'phenolphthalein', 'methyl-orange']`.
  - `indicatorColour(id, ph): string | null`.
  - `MixError`; `mixKey(reagentIds, heat)`.
  - `mix(input: { reagentIds: string[]; heat: boolean }, reagents: readonly Reagent[], reactions: readonly Reaction[]): MixResult`, where `MixResult = { key: string; contents: string[]; reaction: Reaction | null; ph: number | null; indicator: { id: string; colour: string | null } | null }`.
  - `LabTaskSchema`, `LabTask`; `checkLabTask(result: MixResult, task: LabTask): boolean`.

- [ ] **Step 1: Write the failing test**

`packages/stem-sims/test/lab.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  checkLabTask,
  indicatorColour,
  mix,
  mixKey,
  MixError,
  ReactionSchema,
  type Reaction,
  type Reagent,
} from '../src/chem/lab';

const name = (en: string, bn: string) => ({ en, bn });
const reagents: Reagent[] = [
  { id: 'hcl', formula: 'HCl', name: name('Hydrochloric acid', 'হাইড্রোক্লোরিক এসিড'), kind: 'acid', state: 'aq', ph: 1, colour: '#eaf3f5' },
  { id: 'naoh', formula: 'NaOH', name: name('Sodium hydroxide', 'সোডিয়াম হাইড্রক্সাইড'), kind: 'base', state: 'aq', ph: 13, colour: '#eaf3f5' },
  { id: 'cuco3', formula: 'CuCO3', name: name('Copper carbonate', 'কপার কার্বনেট'), kind: 'carbonate', state: 's', colour: '#3f8f6b' },
  { id: 'phenolphthalein', formula: 'C20H14O4', name: name('Phenolphthalein', 'ফেনলফথালিন'), kind: 'indicator', state: 'aq', colour: '#f2f2f2' },
  { id: 'litmus', formula: null, name: name('Litmus', 'লিটমাস'), kind: 'indicator', state: 'aq', colour: '#8e6bb0' },
];
const reactions: Reaction[] = [
  ReactionSchema.parse({
    id: 'neutral-hcl-naoh',
    reagents: ['hcl', 'naoh'],
    requires: { heat: false },
    equation: 'HCl + NaOH -> NaCl + H2O',
    products: [
      { formula: 'NaCl', state: 'aq', name: name('Sodium chloride', 'সোডিয়াম ক্লোরাইড') },
      { formula: 'H2O', state: 'l', name: name('Water', 'পানি') },
    ],
    observations: { tempChange: 'up' },
    phAfter: 7,
    explanation: name('An acid and a base neutralise each other.', 'এসিড ও ক্ষার একে অপরকে প্রশমিত করে।'),
  }),
  ReactionSchema.parse({
    id: 'heat-cuco3',
    reagents: ['cuco3'],
    requires: { heat: true },
    equation: 'CuCO3 -> CuO + CO2',
    products: [
      { formula: 'CuO', state: 's', name: name('Copper oxide', 'কপার অক্সাইড') },
      { formula: 'CO2', state: 'g', name: name('Carbon dioxide', 'কার্বন ডাইঅক্সাইড') },
    ],
    observations: { colourTo: '#1f1f1f', gas: 'CO2', tempChange: 'none' },
    explanation: name('Heat breaks copper carbonate down.', 'তাপে কপার কার্বনেট ভেঙে যায়।'),
  }),
];

describe('indicators', () => {
  it('colours by pH band', () => {
    expect(indicatorColour('litmus', 1)).toBe('#d1495b');
    expect(indicatorColour('litmus', 13)).toBe('#3d6fb6');
    expect(indicatorColour('phenolphthalein', 7)).toBeNull();
    expect(indicatorColour('phenolphthalein', 9)).toBe('#e85d9b');
    expect(indicatorColour('methyl-orange', 2)).toBe('#d1495b');
    expect(indicatorColour('methyl-orange', 6)).toBe('#f2c14e');
  });
});

describe('mix', () => {
  it('finds a reaction regardless of order and applies its pH to the indicator', () => {
    const result = mix(
      { reagentIds: ['naoh', 'phenolphthalein', 'hcl'], heat: false },
      reagents,
      reactions,
    );
    expect(result.reaction?.id).toBe('neutral-hcl-naoh');
    expect(result.ph).toBe(7);
    expect(result.indicator).toEqual({ id: 'phenolphthalein', colour: null });
    expect(result.key).toBe('hcl+naoh');
  });

  it('shows a lone solution pH through the indicator with no reaction', () => {
    const result = mix({ reagentIds: ['naoh', 'phenolphthalein'], heat: false }, reagents, reactions);
    expect(result.reaction).toBeNull();
    expect(result.ph).toBe(13);
    expect(result.indicator?.colour).toBe('#e85d9b');
  });

  it('needs heat for a heat-only reaction', () => {
    expect(mix({ reagentIds: ['cuco3'], heat: false }, reagents, reactions).reaction).toBeNull();
    expect(mix({ reagentIds: ['cuco3'], heat: true }, reagents, reactions).reaction?.id).toBe(
      'heat-cuco3',
    );
  });

  it('collapses duplicates and refuses unknown reagents', () => {
    expect(mix({ reagentIds: ['hcl', 'hcl', 'naoh'], heat: false }, reagents, reactions).reaction?.id).toBe(
      'neutral-hcl-naoh',
    );
    expect(() => mix({ reagentIds: ['hcl', 'tnt'], heat: false }, reagents, reactions)).toThrow(
      MixError,
    );
  });

  it('builds stable cache keys', () => {
    expect(mixKey(['naoh', 'hcl', 'hcl'], false)).toBe('hcl+naoh');
    expect(mixKey(['cuco3'], true)).toBe('cuco3|heat');
  });
});

describe('checkLabTask', () => {
  it('checks colour, pH, gas and precipitate goals', () => {
    const neutral = mix({ reagentIds: ['hcl', 'naoh', 'litmus'], heat: false }, reagents, reactions);
    expect(checkLabTask(neutral, { predicate: 'pHBetween', min: 6.5, max: 7.5 })).toBe(true);
    expect(checkLabTask(neutral, { predicate: 'solutionColour', colour: '#8e6bb0' })).toBe(true);
    const heated = mix({ reagentIds: ['cuco3'], heat: true }, reagents, reactions);
    expect(checkLabTask(heated, { predicate: 'producedGas', gas: 'CO2' })).toBe(true);
    expect(checkLabTask(heated, { predicate: 'solutionColour', colour: '#1f1f1f' })).toBe(true);
    expect(checkLabTask(heated, { predicate: 'formedPrecipitate', formula: 'CuO' })).toBe(false);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx -y pnpm@10.34.7 --filter @just-imagine/stem-sims test -- lab`
Expected: FAIL, cannot find `../src/chem/lab`.

- [ ] **Step 3: Implement**

`packages/stem-sims/src/chem/lab.ts`:

```ts
import { z } from 'zod';

export const BilingualSchema = z.strictObject({
  en: z.string().trim().min(1).max(400),
  bn: z.string().trim().min(1).max(400),
});
export const HexColourSchema = z.string().regex(/^#[0-9a-f]{6}$/);
export const PhysicalStateSchema = z.enum(['s', 'l', 'g', 'aq']);
export const ReagentKindSchema = z.enum([
  'acid',
  'base',
  'salt',
  'metal',
  'oxide',
  'carbonate',
  'indicator',
  'catalyst',
  'peroxide',
  'water',
  'gas',
]);

export const ReagentSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** Null only for mixtures such as litmus. */
  formula: z.string().min(1).nullable(),
  name: BilingualSchema,
  kind: ReagentKindSchema,
  state: PhysicalStateSchema,
  /** pH of the bench solution, where it has one. */
  ph: z.number().min(0).max(14).optional(),
  colour: HexColourSchema,
});
export type Reagent = z.infer<typeof ReagentSchema>;

export const ReactionSchema = z.strictObject({
  id: z.string().regex(/^[a-z0-9-]+$/),
  /** Bench reagent ids that must all be present, catalysts included, indicators excluded. */
  reagents: z.array(z.string()).min(1).max(3),
  requires: z.strictObject({ heat: z.boolean() }),
  equation: z.string().min(3),
  products: z
    .array(
      z.strictObject({ formula: z.string().min(1), state: PhysicalStateSchema, name: BilingualSchema }),
    )
    .min(1),
  observations: z.strictObject({
    colourTo: HexColourSchema.optional(),
    gas: z.string().optional(),
    precipitate: z.strictObject({ formula: z.string(), colour: HexColourSchema }).optional(),
    tempChange: z.enum(['up', 'down', 'none']),
  }),
  phAfter: z.number().min(0).max(14).optional(),
  explanation: BilingualSchema,
});
export type Reaction = z.infer<typeof ReactionSchema>;

export const INDICATOR_IDS = ['litmus', 'phenolphthalein', 'methyl-orange'] as const;
const RED = '#d1495b';

/** Indicator colour at a pH; null means colourless. Unknown indicators are colourless. */
export function indicatorColour(id: string, ph: number): string | null {
  switch (id) {
    case 'litmus':
      return ph < 5 ? RED : ph > 8 ? '#3d6fb6' : '#8e6bb0';
    case 'phenolphthalein':
      return ph >= 8.2 ? '#e85d9b' : null;
    case 'methyl-orange':
      return ph < 3.1 ? RED : ph > 4.4 ? '#f2c14e' : '#f08a3c';
    default:
      return null;
  }
}

export class MixError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MixError';
  }
}

export interface MixResult {
  /** Sorted, de-duplicated non-indicator reagent ids, plus `|heat`; the AI-fallback cache key. */
  key: string;
  contents: string[];
  reaction: Reaction | null;
  ph: number | null;
  indicator: { id: string; colour: string | null } | null;
}

export function mixKey(reagentIds: readonly string[], heat: boolean): string {
  return [...new Set(reagentIds)].sort().join('+') + (heat ? '|heat' : '');
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedB = [...b].sort();
  return [...a].sort().every((v, i) => v === sortedB[i]);
}

export function mix(
  input: { reagentIds: readonly string[]; heat: boolean },
  reagents: readonly Reagent[],
  reactions: readonly Reaction[],
): MixResult {
  const byId = new Map(reagents.map((r) => [r.id, r]));
  const chosen = [...new Set(input.reagentIds)].map((id) => {
    const reagent = byId.get(id);
    if (!reagent) throw new MixError(`Unknown reagent "${id}".`);
    return reagent;
  });
  const indicatorReagent = chosen.find((r) => r.kind === 'indicator') ?? null;
  const contents = chosen
    .filter((r) => r.kind !== 'indicator')
    .map((r) => r.id)
    .sort();
  const reaction =
    reactions.find((r) => sameSet(r.reagents, contents) && (!r.requires.heat || input.heat)) ??
    null;
  const solutionPhs = chosen
    .filter((r) => r.kind !== 'indicator' && r.ph !== undefined)
    .map((r) => r.ph!);
  const ph = reaction?.phAfter ?? (solutionPhs.length === 1 ? solutionPhs[0]! : null);
  return {
    key: mixKey(contents, input.heat),
    contents,
    reaction,
    ph,
    indicator: indicatorReagent
      ? {
          id: indicatorReagent.id,
          colour: ph === null ? indicatorReagent.colour : indicatorColour(indicatorReagent.id, ph),
        }
      : null,
  };
}

export const LabTaskSchema = z.discriminatedUnion('predicate', [
  z.strictObject({ predicate: z.literal('solutionColour'), colour: HexColourSchema }),
  z.strictObject({
    predicate: z.literal('pHBetween'),
    min: z.number().min(0).max(14),
    max: z.number().min(0).max(14),
  }),
  z.strictObject({ predicate: z.literal('producedGas'), gas: z.string().min(1) }),
  z.strictObject({ predicate: z.literal('formedPrecipitate'), formula: z.string().min(1) }),
]);
export type LabTask = z.infer<typeof LabTaskSchema>;

/** Graded on a server-recomputed MixResult, never on client-reported observations. */
export function checkLabTask(result: MixResult, task: LabTask): boolean {
  const obs = result.reaction?.observations;
  switch (task.predicate) {
    case 'solutionColour':
      return obs?.colourTo === task.colour || result.indicator?.colour === task.colour;
    case 'pHBetween':
      return result.ph !== null && result.ph >= task.min && result.ph <= task.max;
    case 'producedGas':
      return obs?.gas === task.gas;
    case 'formedPrecipitate':
      return obs?.precipitate?.formula === task.formula;
  }
}
```

Add `export * from './chem/lab';` to `src/index.ts`.

- [ ] **Step 4: Run the tests and format**

Run: `node_modules/.bin/prettier --write packages/stem-sims && npx -y pnpm@10.34.7 --filter @just-imagine/stem-sims test && npx -y pnpm@10.34.7 --filter @just-imagine/stem-sims typecheck && npx -y pnpm@10.34.7 --filter @just-imagine/stem-sims lint`
Expected: all PASS.

- [ ] **Step 5: Commit**

```bash
git add packages/stem-sims
git commit -m "feat(stem-sims): chemistry lab mixer, indicators and lab tasks

The mixer finds a reaction for an unordered set of bench reagents, needs heat only where the reaction does, shows pH through litmus, phenolphthalein or methyl orange, and grades lab goals from its own recomputed result." -- packages/stem-sims
```

---

### Task 8: `stem-content` scaffold and the NCTB taxonomy

**Files:**
- Create: `packages/stem-content/package.json`, `tsconfig.json`, `eslint.config.js`, `vitest.config.ts` (copy from Task 1, changing the name to `@just-imagine/stem-content` and adding the dependency `"@just-imagine/stem-sims": "workspace:*"`)
- Create: `packages/stem-content/src/taxonomy.ts`, `packages/stem-content/src/index.ts`
- Test: `packages/stem-content/test/taxonomy.test.ts`

**Interfaces:**
- Consumes: `SimIdSchema`, `SIM_IDS`, `SimId` from `@just-imagine/stem-sims`.
- Produces:
  - `SubjectIdSchema` (`'physics' | 'chemistry' | 'math'`), `GradeSchema` (`9 | 10`);
  - `ChapterSchema`/`Chapter` = `{ id, subject, book: 'physics'|'chemistry'|'general-math'|'higher-math', number, title: {en,bn}, sims: SimId[], lab: boolean }`;
  - `CHAPTERS`, `chapterById(id)`, `chaptersFor(subject)`, `TAXONOMY_SOURCE_NOTE`.
- S4's editor and S0's lesson schema reference chapter ids as strings, such as `physics-3`.

- [ ] **Step 1: Scaffold and install**

Create the four config files as described, then run `npx -y pnpm@10.34.7 install`.

- [ ] **Step 2: Write the failing test**

`packages/stem-content/test/taxonomy.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { SIM_IDS } from '@just-imagine/stem-sims';
import { CHAPTERS, chapterById, chaptersFor, ChapterSchema } from '../src/taxonomy';

const BENGALI = /[ঀ-৿]/;

describe('NCTB class 9-10 taxonomy', () => {
  it('has the full SSC chapter lists', () => {
    expect(chaptersFor('physics')).toHaveLength(14);
    expect(chaptersFor('chemistry')).toHaveLength(12);
    expect(CHAPTERS.filter((c) => c.book === 'general-math')).toHaveLength(17);
    expect(CHAPTERS.filter((c) => c.book === 'higher-math')).toHaveLength(14);
  });

  it('has unique ids, valid entries and real Bangla titles', () => {
    expect(new Set(CHAPTERS.map((c) => c.id)).size).toBe(CHAPTERS.length);
    for (const chapter of CHAPTERS) {
      expect(ChapterSchema.parse(chapter)).toEqual(chapter);
      expect(chapter.title.bn).toMatch(BENGALI);
    }
  });

  it('places every demo sim and the lab in their chapters', () => {
    const placed = new Set(CHAPTERS.flatMap((c) => c.sims));
    for (const id of SIM_IDS) expect(placed.has(id)).toBe(true);
    expect(chapterById('physics-2')?.sims).toEqual(['motion-graphs']);
    expect(chapterById('physics-3')?.sims).toEqual(['newton-cart']);
    expect(chapterById('physics-11')?.sims).toEqual(['ohms-circuit']);
    expect(chapterById('chemistry-7')?.lab).toBe(true);
    expect(chapterById('chemistry-9')?.lab).toBe(true);
    expect(chapterById('nope')).toBeUndefined();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

Run: `npx -y pnpm@10.34.7 --filter @just-imagine/stem-content test`
Expected: FAIL, cannot find `../src/taxonomy`.

- [ ] **Step 4: Implement**

`packages/stem-content/src/taxonomy.ts`:

```ts
import { z } from 'zod';
import { SimIdSchema, type SimId } from '@just-imagine/stem-sims';

/**
 * NCTB secondary (classes 9-10) books used for the 2026 SSC science group. Titles were
 * checked against secondary sources (spec §10.2); confirm against the official NCTB PDFs
 * before release and record the check in CHECKPOINT.md.
 */
export const TAXONOMY_SOURCE_NOTE = 'NCTB 2012-curriculum SSC books, as used for SSC 2026.';

export const SubjectIdSchema = z.enum(['physics', 'chemistry', 'math']);
export type SubjectId = z.infer<typeof SubjectIdSchema>;
export const GradeSchema = z.union([z.literal(9), z.literal(10)]);
export type Grade = z.infer<typeof GradeSchema>;
export const BookSchema = z.enum(['physics', 'chemistry', 'general-math', 'higher-math']);

export const ChapterSchema = z.strictObject({
  id: z.string().regex(/^[a-z]+(-[a-z]+)*-\d+$/),
  subject: SubjectIdSchema,
  book: BookSchema,
  number: z.number().int().min(1).max(20),
  title: z.strictObject({ en: z.string().min(1), bn: z.string().min(1) }),
  sims: z.array(SimIdSchema),
  lab: z.boolean(),
});
export type Chapter = z.infer<typeof ChapterSchema>;

type Row = readonly [en: string, bn: string, sims?: readonly SimId[], lab?: boolean];

function book(
  subject: SubjectId,
  bookId: z.infer<typeof BookSchema>,
  prefix: string,
  rows: readonly Row[],
): Chapter[] {
  return rows.map(([en, bn, sims = [], lab = false], index) => ({
    id: `${prefix}-${index + 1}`,
    subject,
    book: bookId,
    number: index + 1,
    title: { en, bn },
    sims: [...sims],
    lab,
  }));
}

const PHYSICS: Row[] = [
  ['Physical quantities and their measurement', 'ভৌত রাশি এবং পরিমাপ'],
  ['Motion', 'গতি', ['motion-graphs']],
  ['Force', 'বল', ['newton-cart']],
  ['Work, power and energy', 'কাজ, ক্ষমতা ও শক্তি'],
  ['State of matter and pressure', 'পদার্থের অবস্থা ও চাপ'],
  ['Effect of heat on substances', 'বস্তুর উপর তাপের প্রভাব'],
  ['Waves and sound', 'তরঙ্গ ও শব্দ'],
  ['Reflection of light', 'আলোর প্রতিফলন'],
  ['Refraction of light', 'আলোর প্রতিসরণ'],
  ['Static electricity', 'স্থির বিদ্যুৎ'],
  ['Current electricity', 'চল বিদ্যুৎ', ['ohms-circuit']],
  ['Magnetic effects of current', 'বিদ্যুতের চৌম্বক ক্রিয়া'],
  ['Modern physics and electronics', 'আধুনিক পদার্থবিজ্ঞান ও ইলেকট্রনিক্স'],
  ['Physics to save life', 'জীবন বাঁচাতে পদার্থবিজ্ঞান'],
];

const CHEMISTRY: Row[] = [
  ['Concepts of chemistry', 'রসায়নের ধারণা'],
  ['States of matter', 'পদার্থের অবস্থা'],
  ['Structure of matter', 'পদার্থের গঠন'],
  ['Periodic table', 'পর্যায় সারণি'],
  ['Chemical bonds', 'রাসায়নিক বন্ধন'],
  ['Concept of mole and chemical counting', 'মোলের ধারণা ও রাসায়নিক গণনা'],
  ['Chemical reactions', 'রাসায়নিক বিক্রিয়া', [], true],
  ['Chemistry and energy', 'রসায়ন ও শক্তি'],
  ['Acid-base balance', 'এসিড-ক্ষারক সমতা', [], true],
  ['Mineral resources: metals and non-metals', 'খনিজ সম্পদ: ধাতু-অধাতু'],
  ['Mineral resources: fossils', 'খনিজ সম্পদ: জীবাশ্ম'],
  ['Chemistry in our lives', 'আমাদের জীবনে রসায়ন'],
];

const GENERAL_MATH: Row[] = [
  ['Real numbers', 'বাস্তব সংখ্যা'],
  ['Sets and functions', 'সেট ও ফাংশন'],
  ['Algebraic expressions', 'বীজগাণিতিক রাশি'],
  ['Exponents and logarithms', 'সূচক ও লগারিদম'],
  ['Equations in one variable', 'এক চলকবিশিষ্ট সমীকরণ'],
  ['Lines, angles and triangles', 'রেখা, কোণ ও ত্রিভুজ'],
  ['Practical geometry', 'ব্যবহারিক জ্যামিতি'],
  ['Circles', 'বৃত্ত'],
  ['Trigonometric ratios', 'ত্রিকোণমিতিক অনুপাত', ['unit-circle']],
  ['Distance and height', 'দূরত্ব ও উচ্চতা'],
  ['Algebraic ratio and proportion', 'বীজগাণিতিক অনুপাত ও সমানুপাত'],
  ['Simple simultaneous equations in two variables', 'দুই চলকবিশিষ্ট সরল সহসমীকরণ', ['linear-graph']],
  ['Finite series', 'সসীম ধারা'],
  ['Ratio, similarity and symmetry', 'অনুপাত, সদৃশতা ও প্রতিসমতা'],
  ['Area-related theorems and constructions', 'ক্ষেত্রফল সম্পর্কিত উপপাদ্য ও সম্পাদ্য'],
  ['Mensuration', 'পরিমিতি'],
  ['Statistics', 'পরিসংখ্যান'],
];

const HIGHER_MATH: Row[] = [
  ['Sets and functions', 'সেট ও ফাংশন'],
  ['Algebraic expressions', 'বীজগাণিতিক রাশি'],
  ['Geometry', 'জ্যামিতি'],
  ['Geometric constructions', 'জ্যামিতিক অঙ্কন'],
  ['Equations', 'সমীকরণ'],
  ['Inequalities', 'অসমতা'],
  ['Infinite series', 'অসীম ধারা'],
  ['Trigonometry', 'ত্রিকোণমিতি', ['unit-circle']],
  ['Exponential and logarithmic functions', 'সূচকীয় ও লগারিদমীয় ফাংশন'],
  ['Binomial expansion', 'দ্বিপদী বিস্তৃতি'],
  ['Coordinate geometry', 'স্থানাঙ্ক জ্যামিতি', ['linear-graph']],
  ['Plane vectors', 'সমতলীয় ভেক্টর'],
  ['Solid geometry', 'ঘন জ্যামিতি'],
  ['Probability', 'সম্ভাবনা'],
];

export const CHAPTERS: readonly Chapter[] = [
  ...book('physics', 'physics', 'physics', PHYSICS),
  ...book('chemistry', 'chemistry', 'chemistry', CHEMISTRY),
  ...book('math', 'general-math', 'math-gm', GENERAL_MATH),
  ...book('math', 'higher-math', 'math-hm', HIGHER_MATH),
];

const BY_ID = new Map(CHAPTERS.map((c) => [c.id, c]));
export const chapterById = (id: string): Chapter | undefined => BY_ID.get(id);
export const chaptersFor = (subject: SubjectId): Chapter[] =>
  CHAPTERS.filter((c) => c.subject === subject);
```

`packages/stem-content/src/index.ts`:

```ts
export * from './taxonomy';
```

- [ ] **Step 5: Run the tests**

Run: `node_modules/.bin/prettier --write packages/stem-content && npx -y pnpm@10.34.7 --filter @just-imagine/stem-content test && npx -y pnpm@10.34.7 --filter @just-imagine/stem-content typecheck && npx -y pnpm@10.34.7 --filter @just-imagine/stem-content lint`
Expected: all PASS.

- [ ] **Step 6: Commit**

```bash
git add packages/stem-content
git commit -m "feat(stem-content): NCTB class 9-10 subject and chapter taxonomy

Lists the SSC Physics, Chemistry, General Math and Higher Math chapters in English and Bangla and places each demo sim and the chemistry lab in its chapter." -- packages/stem-content
```

---

### Task 9: Reagent bench and the 20-reaction table

**Files:**
- Create: `packages/stem-content/src/reagents.ts`, `packages/stem-content/src/reactions.ts`
- Modify: `packages/stem-content/src/index.ts` (add both exports)
- Test: `packages/stem-content/test/chemistry.test.ts`
- Modify: `CHECKPOINT.md` (append one note), `TODO.md` (tick S3 model items)

**Interfaces:**
- Consumes: `ReagentSchema`, `ReactionSchema`, `Reagent`, `Reaction`, `atomBalance`, `parseEquation`, `parseFormula`, `mix`, `mixKey` from `@just-imagine/stem-sims`.
- Produces: `REAGENTS: readonly Reagent[]` (26 entries), `REACTIONS: readonly Reaction[]` (20 entries), and `reagentById(id)`. S4 renders the bench from `REAGENTS`, and S5's AI fallback restricts the model to `REAGENTS` ids.

- [ ] **Step 1: Write the failing test**

`packages/stem-content/test/chemistry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import {
  atomBalance,
  mix,
  mixKey,
  parseEquation,
  parseFormula,
  ReactionSchema,
  ReagentSchema,
} from '@just-imagine/stem-sims';
import { REACTIONS, REAGENTS, reagentById } from '../src';

const BENGALI = /[ঀ-৿]/;

describe('reagent bench', () => {
  it('has 26 valid reagents with unique ids and readable formulas', () => {
    expect(REAGENTS).toHaveLength(26);
    expect(new Set(REAGENTS.map((r) => r.id)).size).toBe(REAGENTS.length);
    for (const reagent of REAGENTS) {
      expect(ReagentSchema.parse(reagent)).toEqual(reagent);
      expect(reagent.name.bn).toMatch(BENGALI);
      if (reagent.formula !== null) expect(() => parseFormula(reagent.formula!)).not.toThrow();
    }
    expect(reagentById('limewater')?.formula).toBe('Ca(OH)2');
  });
});

describe('reaction table', () => {
  it('has 20 valid reactions with unique ids and unique reagent keys', () => {
    expect(REACTIONS).toHaveLength(20);
    expect(new Set(REACTIONS.map((r) => r.id)).size).toBe(20);
    expect(new Set(REACTIONS.map((r) => mixKey(r.reagents, r.requires.heat))).size).toBe(20);
  });

  for (const reaction of REACTIONS) {
    describe(reaction.id, () => {
      it('is valid, bilingual and balanced', () => {
        expect(ReactionSchema.parse(reaction)).toEqual(reaction);
        expect(reaction.explanation.bn).toMatch(BENGALI);
        for (const p of reaction.products) expect(p.name.bn).toMatch(BENGALI);
        expect(atomBalance(reaction.equation).balanced).toBe(true);
      });

      it('uses exactly its bench reagents (catalysts aside) and lists exactly its products', () => {
        const { reactants, products } = parseEquation(reaction.equation);
        const benchFormulas = reaction.reagents
          .map((id) => reagentById(id))
          .filter((r) => r !== undefined && r.kind !== 'catalyst')
          .map((r) => r!.formula);
        expect(reaction.reagents.every((id) => reagentById(id) !== undefined)).toBe(true);
        expect(reactants.map((t) => t.formula).sort()).toEqual([...benchFormulas].sort());
        expect(products.map((t) => t.formula).sort()).toEqual(
          reaction.products.map((p) => p.formula).sort(),
        );
      });

      it('reports gases and precipitates that match its products', () => {
        const gases = reaction.products.filter((p) => p.state === 'g').map((p) => p.formula);
        expect(reaction.observations.gas ? [reaction.observations.gas] : []).toEqual(gases);
        const precipitate = reaction.observations.precipitate;
        if (precipitate)
          expect(
            reaction.products.some((p) => p.formula === precipitate.formula && p.state === 's'),
          ).toBe(true);
      });

      it('is what the mixer finds for its own reagents', () => {
        const result = mix(
          { reagentIds: reaction.reagents, heat: reaction.requires.heat },
          REAGENTS,
          REACTIONS,
        );
        expect(result.reaction?.id).toBe(reaction.id);
      });
    });
  }
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx -y pnpm@10.34.7 --filter @just-imagine/stem-content test -- chemistry`
Expected: FAIL, `REAGENTS` is not exported.

- [ ] **Step 3: Implement the bench**

`packages/stem-content/src/reagents.ts`:

```ts
import { ReagentSchema, type Reagent } from '@just-imagine/stem-sims';

const CLEAR = '#eaf3f5';
const WHITE = '#f4f4f0';
const r = (reagent: Reagent): Reagent => ReagentSchema.parse(reagent);

/** The closed school bench. Students can only ever mix these; the AI fallback sees only these. */
export const REAGENTS: readonly Reagent[] = [
  r({ id: 'hcl', formula: 'HCl', name: { en: 'Dilute hydrochloric acid', bn: 'লঘু হাইড্রোক্লোরিক এসিড' }, kind: 'acid', state: 'aq', ph: 1, colour: CLEAR }),
  r({ id: 'h2so4', formula: 'H2SO4', name: { en: 'Dilute sulfuric acid', bn: 'লঘু সালফিউরিক এসিড' }, kind: 'acid', state: 'aq', ph: 1, colour: CLEAR }),
  r({ id: 'naoh', formula: 'NaOH', name: { en: 'Sodium hydroxide solution', bn: 'সোডিয়াম হাইড্রক্সাইড দ্রবণ' }, kind: 'base', state: 'aq', ph: 13, colour: CLEAR }),
  r({ id: 'koh', formula: 'KOH', name: { en: 'Potassium hydroxide solution', bn: 'পটাশিয়াম হাইড্রক্সাইড দ্রবণ' }, kind: 'base', state: 'aq', ph: 13, colour: CLEAR }),
  r({ id: 'limewater', formula: 'Ca(OH)2', name: { en: 'Limewater', bn: 'চুনের পানি' }, kind: 'base', state: 'aq', ph: 12.4, colour: CLEAR }),
  r({ id: 'nacl', formula: 'NaCl', name: { en: 'Sodium chloride solution', bn: 'সোডিয়াম ক্লোরাইড দ্রবণ' }, kind: 'salt', state: 'aq', ph: 7, colour: CLEAR }),
  r({ id: 'agno3', formula: 'AgNO3', name: { en: 'Silver nitrate solution', bn: 'সিলভার নাইট্রেট দ্রবণ' }, kind: 'salt', state: 'aq', ph: 6, colour: CLEAR }),
  r({ id: 'bacl2', formula: 'BaCl2', name: { en: 'Barium chloride solution', bn: 'বেরিয়াম ক্লোরাইড দ্রবণ' }, kind: 'salt', state: 'aq', ph: 7, colour: CLEAR }),
  r({ id: 'na2so4', formula: 'Na2SO4', name: { en: 'Sodium sulfate solution', bn: 'সোডিয়াম সালফেট দ্রবণ' }, kind: 'salt', state: 'aq', ph: 7, colour: CLEAR }),
  r({ id: 'cuso4', formula: 'CuSO4', name: { en: 'Copper sulfate solution', bn: 'কপার সালফেট দ্রবণ' }, kind: 'salt', state: 'aq', ph: 4, colour: '#3a8fd1' }),
  r({ id: 'fecl3', formula: 'FeCl3', name: { en: 'Iron(III) chloride solution', bn: 'ফেরিক ক্লোরাইড দ্রবণ' }, kind: 'salt', state: 'aq', ph: 2, colour: '#c98a2b' }),
  r({ id: 'zn', formula: 'Zn', name: { en: 'Zinc granules', bn: 'জিংকের দানা' }, kind: 'metal', state: 's', colour: '#a8b0b5' }),
  r({ id: 'mg', formula: 'Mg', name: { en: 'Magnesium ribbon', bn: 'ম্যাগনেসিয়াম ফিতা' }, kind: 'metal', state: 's', colour: '#c9ced1' }),
  r({ id: 'fe', formula: 'Fe', name: { en: 'Iron filings', bn: 'লোহার গুঁড়া' }, kind: 'metal', state: 's', colour: '#6e6e6e' }),
  r({ id: 'caco3', formula: 'CaCO3', name: { en: 'Marble chips', bn: 'মার্বেল পাথরের টুকরা' }, kind: 'carbonate', state: 's', colour: WHITE }),
  r({ id: 'na2co3', formula: 'Na2CO3', name: { en: 'Sodium carbonate solution', bn: 'সোডিয়াম কার্বনেট দ্রবণ' }, kind: 'carbonate', state: 'aq', ph: 11, colour: CLEAR }),
  r({ id: 'nahco3', formula: 'NaHCO3', name: { en: 'Baking soda solution', bn: 'খাবার সোডার দ্রবণ' }, kind: 'carbonate', state: 'aq', ph: 8.3, colour: CLEAR }),
  r({ id: 'cao', formula: 'CaO', name: { en: 'Quicklime', bn: 'কলিচুন' }, kind: 'oxide', state: 's', colour: '#f1efe8' }),
  r({ id: 'water', formula: 'H2O', name: { en: 'Water', bn: 'পানি' }, kind: 'water', state: 'l', ph: 7, colour: CLEAR }),
  r({ id: 'h2o2', formula: 'H2O2', name: { en: 'Hydrogen peroxide solution', bn: 'হাইড্রোজেন পার-অক্সাইড দ্রবণ' }, kind: 'peroxide', state: 'aq', ph: 6, colour: CLEAR }),
  r({ id: 'mno2', formula: 'MnO2', name: { en: 'Manganese dioxide powder', bn: 'ম্যাঙ্গানিজ ডাইঅক্সাইড চূর্ণ' }, kind: 'catalyst', state: 's', colour: '#2b2b2b' }),
  r({ id: 'cuco3', formula: 'CuCO3', name: { en: 'Copper carbonate powder', bn: 'কপার কার্বনেট চূর্ণ' }, kind: 'carbonate', state: 's', colour: '#3f8f6b' }),
  r({ id: 'co2', formula: 'CO2', name: { en: 'Carbon dioxide gas', bn: 'কার্বন ডাইঅক্সাইড গ্যাস' }, kind: 'gas', state: 'g', colour: '#f7fafb' }),
  r({ id: 'litmus', formula: null, name: { en: 'Litmus solution', bn: 'লিটমাস দ্রবণ' }, kind: 'indicator', state: 'aq', colour: '#8e6bb0' }),
  r({ id: 'phenolphthalein', formula: 'C20H14O4', name: { en: 'Phenolphthalein', bn: 'ফেনলফথালিন' }, kind: 'indicator', state: 'aq', colour: '#f2f2f2' }),
  r({ id: 'methyl-orange', formula: 'C14H14N3NaO3S', name: { en: 'Methyl orange', bn: 'মিথাইল অরেঞ্জ' }, kind: 'indicator', state: 'aq', colour: '#f08a3c' }),
];

const BY_ID = new Map(REAGENTS.map((reagent) => [reagent.id, reagent]));
export const reagentById = (id: string): Reagent | undefined => BY_ID.get(id);
```

- [ ] **Step 4: Implement the reaction table**

`packages/stem-content/src/reactions.ts`:

```ts
import { ReactionSchema, type Reaction } from '@just-imagine/stem-sims';

const CLEAR = '#eaf3f5';
const WHITE_PPT = '#f5f5f5';
const PALE_GREEN = '#cfe3c8';
const COPPER = '#b5651d';
const rx = (reaction: Reaction): Reaction => ReactionSchema.parse(reaction);
const n = (en: string, bn: string) => ({ en, bn });

const water = { formula: 'H2O', state: 'l' as const, name: n('Water', 'পানি') };
const hydrogen = { formula: 'H2', state: 'g' as const, name: n('Hydrogen gas', 'হাইড্রোজেন গ্যাস') };
const carbonDioxide = {
  formula: 'CO2',
  state: 'g' as const,
  name: n('Carbon dioxide gas', 'কার্বন ডাইঅক্সাইড গ্যাস'),
};
const copper = { formula: 'Cu', state: 's' as const, name: n('Copper', 'কপার (তামা)') };

const NEUTRAL = n(
  'An acid and a base neutralise each other to make a salt and water, and the mixture warms up.',
  'এসিড ও ক্ষারক একে অপরকে প্রশমিত করে লবণ ও পানি তৈরি করে, আর মিশ্রণটি গরম হয়।',
);
const METAL_ACID = n(
  'A reactive metal pushes hydrogen out of the acid, so hydrogen gas bubbles off.',
  'সক্রিয় ধাতু এসিড থেকে হাইড্রোজেনকে প্রতিস্থাপন করে, তাই হাইড্রোজেন গ্যাসের বুদবুদ ওঠে।',
);
const CARBONATE_ACID = n(
  'An acid breaks a carbonate down, releasing carbon dioxide gas that fizzes.',
  'এসিড কার্বনেটকে ভেঙে কার্বন ডাইঅক্সাইড গ্যাস তৈরি করে, যা বুদবুদ করে বের হয়।',
);

/** The curated table (spec §10.3). A chemistry teacher reviews it before the demo. */
export const REACTIONS: readonly Reaction[] = [
  rx({
    id: 'neutral-hcl-naoh',
    reagents: ['hcl', 'naoh'],
    requires: { heat: false },
    equation: 'HCl + NaOH -> NaCl + H2O',
    products: [{ formula: 'NaCl', state: 'aq', name: n('Sodium chloride', 'সোডিয়াম ক্লোরাইড') }, water],
    observations: { tempChange: 'up' },
    phAfter: 7,
    explanation: NEUTRAL,
  }),
  rx({
    id: 'neutral-h2so4-naoh',
    reagents: ['h2so4', 'naoh'],
    requires: { heat: false },
    equation: 'H2SO4 + 2NaOH -> Na2SO4 + 2H2O',
    products: [{ formula: 'Na2SO4', state: 'aq', name: n('Sodium sulfate', 'সোডিয়াম সালফেট') }, water],
    observations: { tempChange: 'up' },
    phAfter: 7,
    explanation: NEUTRAL,
  }),
  rx({
    id: 'neutral-hcl-koh',
    reagents: ['hcl', 'koh'],
    requires: { heat: false },
    equation: 'HCl + KOH -> KCl + H2O',
    products: [{ formula: 'KCl', state: 'aq', name: n('Potassium chloride', 'পটাশিয়াম ক্লোরাইড') }, water],
    observations: { tempChange: 'up' },
    phAfter: 7,
    explanation: NEUTRAL,
  }),
  rx({
    id: 'zn-hcl',
    reagents: ['zn', 'hcl'],
    requires: { heat: false },
    equation: 'Zn + 2HCl -> ZnCl2 + H2',
    products: [{ formula: 'ZnCl2', state: 'aq', name: n('Zinc chloride', 'জিংক ক্লোরাইড') }, hydrogen],
    observations: { gas: 'H2', tempChange: 'up' },
    explanation: METAL_ACID,
  }),
  rx({
    id: 'mg-hcl',
    reagents: ['mg', 'hcl'],
    requires: { heat: false },
    equation: 'Mg + 2HCl -> MgCl2 + H2',
    products: [{ formula: 'MgCl2', state: 'aq', name: n('Magnesium chloride', 'ম্যাগনেসিয়াম ক্লোরাইড') }, hydrogen],
    observations: { gas: 'H2', tempChange: 'up' },
    explanation: METAL_ACID,
  }),
  rx({
    id: 'fe-h2so4',
    reagents: ['fe', 'h2so4'],
    requires: { heat: false },
    equation: 'Fe + H2SO4 -> FeSO4 + H2',
    products: [{ formula: 'FeSO4', state: 'aq', name: n('Iron(II) sulfate', 'ফেরাস সালফেট') }, hydrogen],
    observations: { colourTo: PALE_GREEN, gas: 'H2', tempChange: 'up' },
    explanation: METAL_ACID,
  }),
  rx({
    id: 'zn-h2so4',
    reagents: ['zn', 'h2so4'],
    requires: { heat: false },
    equation: 'Zn + H2SO4 -> ZnSO4 + H2',
    products: [{ formula: 'ZnSO4', state: 'aq', name: n('Zinc sulfate', 'জিংক সালফেট') }, hydrogen],
    observations: { gas: 'H2', tempChange: 'up' },
    explanation: METAL_ACID,
  }),
  rx({
    id: 'caco3-hcl',
    reagents: ['caco3', 'hcl'],
    requires: { heat: false },
    equation: 'CaCO3 + 2HCl -> CaCl2 + H2O + CO2',
    products: [{ formula: 'CaCl2', state: 'aq', name: n('Calcium chloride', 'ক্যালসিয়াম ক্লোরাইড') }, water, carbonDioxide],
    observations: { gas: 'CO2', tempChange: 'none' },
    explanation: CARBONATE_ACID,
  }),
  rx({
    id: 'na2co3-hcl',
    reagents: ['na2co3', 'hcl'],
    requires: { heat: false },
    equation: 'Na2CO3 + 2HCl -> 2NaCl + H2O + CO2',
    products: [{ formula: 'NaCl', state: 'aq', name: n('Sodium chloride', 'সোডিয়াম ক্লোরাইড') }, water, carbonDioxide],
    observations: { gas: 'CO2', tempChange: 'none' },
    explanation: CARBONATE_ACID,
  }),
  rx({
    id: 'nahco3-hcl',
    reagents: ['nahco3', 'hcl'],
    requires: { heat: false },
    equation: 'NaHCO3 + HCl -> NaCl + H2O + CO2',
    products: [{ formula: 'NaCl', state: 'aq', name: n('Sodium chloride', 'সোডিয়াম ক্লোরাইড') }, water, carbonDioxide],
    observations: { gas: 'CO2', tempChange: 'down' },
    explanation: n(
      'Baking soda and acid fizz out carbon dioxide, and this reaction takes in heat, so the beaker cools.',
      'খাবার সোডা ও এসিড বিক্রিয়ায় কার্বন ডাইঅক্সাইড বের হয়, আর এই বিক্রিয়া তাপ শোষণ করে, তাই বিকার ঠান্ডা হয়।',
    ),
  }),
  rx({
    id: 'agno3-nacl',
    reagents: ['agno3', 'nacl'],
    requires: { heat: false },
    equation: 'AgNO3 + NaCl -> AgCl + NaNO3',
    products: [
      { formula: 'AgCl', state: 's', name: n('Silver chloride', 'সিলভার ক্লোরাইড') },
      { formula: 'NaNO3', state: 'aq', name: n('Sodium nitrate', 'সোডিয়াম নাইট্রেট') },
    ],
    observations: { precipitate: { formula: 'AgCl', colour: WHITE_PPT }, tempChange: 'none' },
    explanation: n(
      'Silver and chloride ions meet and form solid silver chloride, a white precipitate. This is the test for chloride.',
      'সিলভার ও ক্লোরাইড আয়ন মিলে কঠিন সিলভার ক্লোরাইডের সাদা অধঃক্ষেপ তৈরি করে। এটি ক্লোরাইড শনাক্তের পরীক্ষা।',
    ),
  }),
  rx({
    id: 'bacl2-na2so4',
    reagents: ['bacl2', 'na2so4'],
    requires: { heat: false },
    equation: 'BaCl2 + Na2SO4 -> BaSO4 + 2NaCl',
    products: [
      { formula: 'BaSO4', state: 's', name: n('Barium sulfate', 'বেরিয়াম সালফেট') },
      { formula: 'NaCl', state: 'aq', name: n('Sodium chloride', 'সোডিয়াম ক্লোরাইড') },
    ],
    observations: { precipitate: { formula: 'BaSO4', colour: '#f7f7f7' }, tempChange: 'none' },
    explanation: n(
      'Barium and sulfate ions form insoluble barium sulfate, a white precipitate. This is the test for sulfate.',
      'বেরিয়াম ও সালফেট আয়ন অদ্রবণীয় বেরিয়াম সালফেটের সাদা অধঃক্ষেপ তৈরি করে। এটি সালফেট শনাক্তের পরীক্ষা।',
    ),
  }),
  rx({
    id: 'cuso4-naoh',
    reagents: ['cuso4', 'naoh'],
    requires: { heat: false },
    equation: 'CuSO4 + 2NaOH -> Cu(OH)2 + Na2SO4',
    products: [
      { formula: 'Cu(OH)2', state: 's', name: n('Copper(II) hydroxide', 'কপার হাইড্রক্সাইড') },
      { formula: 'Na2SO4', state: 'aq', name: n('Sodium sulfate', 'সোডিয়াম সালফেট') },
    ],
    observations: { colourTo: CLEAR, precipitate: { formula: 'Cu(OH)2', colour: '#4a90d9' }, tempChange: 'none' },
    explanation: n(
      'Hydroxide ions pull copper out of solution as a pale blue precipitate of copper hydroxide.',
      'হাইড্রক্সাইড আয়ন দ্রবণ থেকে কপারকে হালকা নীল কপার হাইড্রক্সাইডের অধঃক্ষেপ হিসেবে বের করে আনে।',
    ),
  }),
  rx({
    id: 'fecl3-naoh',
    reagents: ['fecl3', 'naoh'],
    requires: { heat: false },
    equation: 'FeCl3 + 3NaOH -> Fe(OH)3 + 3NaCl',
    products: [
      { formula: 'Fe(OH)3', state: 's', name: n('Iron(III) hydroxide', 'ফেরিক হাইড্রক্সাইড') },
      { formula: 'NaCl', state: 'aq', name: n('Sodium chloride', 'সোডিয়াম ক্লোরাইড') },
    ],
    observations: { colourTo: CLEAR, precipitate: { formula: 'Fe(OH)3', colour: '#9b4a22' }, tempChange: 'none' },
    explanation: n(
      'Hydroxide ions pull iron out of solution as a red-brown precipitate of iron(III) hydroxide.',
      'হাইড্রক্সাইড আয়ন দ্রবণ থেকে লোহাকে লালচে-বাদামি ফেরিক হাইড্রক্সাইডের অধঃক্ষেপ হিসেবে বের করে আনে।',
    ),
  }),
  rx({
    id: 'fe-cuso4',
    reagents: ['fe', 'cuso4'],
    requires: { heat: false },
    equation: 'Fe + CuSO4 -> FeSO4 + Cu',
    products: [{ formula: 'FeSO4', state: 'aq', name: n('Iron(II) sulfate', 'ফেরাস সালফেট') }, copper],
    observations: { colourTo: PALE_GREEN, precipitate: { formula: 'Cu', colour: COPPER }, tempChange: 'up' },
    explanation: n(
      'Iron is more reactive than copper, so it takes copper’s place: the blue solution turns pale green and copper coats the iron.',
      'লোহা কপারের চেয়ে বেশি সক্রিয়, তাই এটি কপারকে প্রতিস্থাপন করে: নীল দ্রবণ হালকা সবুজ হয় আর লোহার গায়ে তামা জমে।',
    ),
  }),
  rx({
    id: 'zn-cuso4',
    reagents: ['zn', 'cuso4'],
    requires: { heat: false },
    equation: 'Zn + CuSO4 -> ZnSO4 + Cu',
    products: [{ formula: 'ZnSO4', state: 'aq', name: n('Zinc sulfate', 'জিংক সালফেট') }, copper],
    observations: { colourTo: CLEAR, precipitate: { formula: 'Cu', colour: COPPER }, tempChange: 'up' },
    explanation: n(
      'Zinc is more reactive than copper, so it takes copper’s place: the blue fades and red-brown copper appears.',
      'জিংক কপারের চেয়ে বেশি সক্রিয়, তাই এটি কপারকে প্রতিস্থাপন করে: নীল রং মিলিয়ে যায় আর লালচে-বাদামি তামা দেখা দেয়।',
    ),
  }),
  rx({
    id: 'cao-water',
    reagents: ['cao', 'water'],
    requires: { heat: false },
    equation: 'CaO + H2O -> Ca(OH)2',
    products: [{ formula: 'Ca(OH)2', state: 'aq', name: n('Calcium hydroxide (slaked lime)', 'ক্যালসিয়াম হাইড্রক্সাইড (কলিচুন ভেজানো)') }],
    observations: { tempChange: 'up' },
    phAfter: 12.4,
    explanation: n(
      'Quicklime combines with water to make slaked lime and gives out a lot of heat.',
      'কলিচুন পানির সাথে যুক্ত হয়ে ক্যালসিয়াম হাইড্রক্সাইড তৈরি করে এবং প্রচুর তাপ উৎপন্ন করে।',
    ),
  }),
  rx({
    id: 'co2-limewater',
    reagents: ['co2', 'limewater'],
    requires: { heat: false },
    equation: 'CO2 + Ca(OH)2 -> CaCO3 + H2O',
    products: [{ formula: 'CaCO3', state: 's', name: n('Calcium carbonate', 'ক্যালসিয়াম কার্বনেট') }, water],
    observations: { precipitate: { formula: 'CaCO3', colour: '#f3f3ee' }, tempChange: 'none' },
    explanation: n(
      'Carbon dioxide turns limewater milky as insoluble calcium carbonate forms. This is the test for carbon dioxide.',
      'কার্বন ডাইঅক্সাইড চুনের পানিকে ঘোলা করে, কারণ অদ্রবণীয় ক্যালসিয়াম কার্বনেট তৈরি হয়। এটি কার্বন ডাইঅক্সাইড শনাক্তের পরীক্ষা।',
    ),
  }),
  rx({
    id: 'h2o2-mno2',
    reagents: ['h2o2', 'mno2'],
    requires: { heat: false },
    equation: '2H2O2 -> 2H2O + O2',
    products: [water, { formula: 'O2', state: 'g', name: n('Oxygen gas', 'অক্সিজেন গ্যাস') }],
    observations: { gas: 'O2', tempChange: 'up' },
    explanation: n(
      'Manganese dioxide is a catalyst: it speeds up hydrogen peroxide breaking into water and oxygen without being used up.',
      'ম্যাঙ্গানিজ ডাইঅক্সাইড একটি প্রভাবক: নিজে খরচ না হয়ে এটি হাইড্রোজেন পার-অক্সাইডকে পানি ও অক্সিজেনে ভাঙার গতি বাড়ায়।',
    ),
  }),
  rx({
    id: 'heat-cuco3',
    reagents: ['cuco3'],
    requires: { heat: true },
    equation: 'CuCO3 -> CuO + CO2',
    products: [{ formula: 'CuO', state: 's', name: n('Copper(II) oxide', 'কপার অক্সাইড') }, carbonDioxide],
    observations: { colourTo: '#1f1f1f', gas: 'CO2', tempChange: 'none' },
    explanation: n(
      'Heat breaks green copper carbonate down into black copper oxide and carbon dioxide.',
      'তাপে সবুজ কপার কার্বনেট ভেঙে কালো কপার অক্সাইড ও কার্বন ডাইঅক্সাইড তৈরি হয়।',
    ),
  }),
];
```

Note: `na2co3-hcl` lists `NaCl` once in `products` while the equation has `2NaCl`. The product-list test compares formulas, not coefficients, so the list stays de-duplicated.

`packages/stem-content/src/index.ts`:

```ts
export * from './taxonomy';
export * from './reagents';
export * from './reactions';
```

- [ ] **Step 5: Run the tests, then fix data until green**

Run: `node_modules/.bin/prettier --write packages/stem-content packages/stem-sims && npx -y pnpm@10.34.7 --filter @just-imagine/stem-sims test && npx -y pnpm@10.34.7 --filter @just-imagine/stem-content test && npx -y pnpm@10.34.7 --filter @just-imagine/stem-content typecheck && npx -y pnpm@10.34.7 --filter @just-imagine/stem-content lint`
Expected: all PASS. A failure here is a data error, such as an unbalanced equation or a formula spelled differently from the bench. Fix the data, never the test.

- [ ] **Step 6: Record and commit**

Append to `CHECKPOINT.md`:

```markdown

## Parallel session notes (Claude Code, 2026-10-17) — S3 sims and chemistry packages landed

New packages `@just-imagine/stem-sims` (five models, `checkSimTask`, formula parser and `atomBalance`, chemistry mixer and lab tasks) and `@just-imagine/stem-content` (NCTB taxonomy, 26-reagent bench, 20-reaction table). The working-tree `pnpm-lock.yaml` now has importers for both; it was not committed because it also holds Codex's uncommitted changes — whoever next commits the lockfile carries them. The reaction table and Bangla terms still need review by a chemistry teacher (spec §20 item 3).
```

In `TODO.md`'s "Schools + STEM" section, add the line `- [x] S3 models: stem-sims and stem-content (views move to S4, AI fallback to S5).` directly under the S3 line.

```bash
git add packages/stem-content packages/stem-sims
git commit -m "feat(stem-content): school chemistry bench and 20-reaction table

Adds the closed 26-reagent bench and the curated reactions for SSC Chemistry chapters 7 and 9, each checked for atom balance, matching bench formulas, gas and precipitate consistency, and recovery by the mixer." -- packages/stem-content packages/stem-sims
```

---

## Self-review notes

- **Spec coverage:** §10.1 (packages, pure models, server re-check) is covered by Tasks 1–5 and 8. §10.2's five sims are Tasks 1–4; chem-lab tasks are Task 7. §10.3's table, lookup, atom balance and closed bench are Tasks 6, 7 and 9. The §10.3 AI fallback endpoint moves to S5, as the master plan records. The spec's lab parameters (volumes and concentrations) are deliberately dropped in v1: the stoichiometric mixer reports end states, and the change is recorded here.
- **Type consistency:** `checkSimTask`, `SimTask`, `mix`, `MixResult`, `checkLabTask`, `LabTask`, `REAGENTS`, `REACTIONS` and `CHAPTERS` are named identically everywhere they appear.
