import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { checkScript } from '../src/static-check';
import { createGameHost, type GameError } from '../src/host';
import { nodeWorkerFactory } from '../src/node';
import type { BudgetBreach } from '../src/budgets';

const dir = new URL('./red-team/', import.meta.url);
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.js'))
  .sort();

interface Expectation {
  stage: 'static' | 'runtime';
  /** Static: the expected issue code. Runtime: `budget:<kind>` or `error:<regex>`; `|` separates alternatives. */
  detail: string;
}

function expectation(source: string): Expectation {
  const match = /^\/\/ expect: (static|runtime) (\S+)/.exec(source);
  if (!match)
    throw new Error(
      'every red-team fixture starts with "// expect: static <code>" or "// expect: runtime <what>"',
    );
  return { stage: match[1] as Expectation['stage'], detail: match[2]! };
}

/** Runs a script in the host with a Node worker and two seconds of ticks plus a tap. */
async function runInHost(source: string) {
  const errors: GameError[] = [];
  const breaches: BudgetBreach[] = [];
  const handle = createGameHost(
    source,
    { onCommand: () => {} },
    { worker: nodeWorkerFactory, budgets: { hangMs: 300 } },
  );
  handle.onError((e) => errors.push(e));
  handle.onBudget((b) => breaches.push(b));
  handle.start(1);
  handle.pushState({
    time: 0,
    entities: [
      {
        id: 'frog',
        tags: ['frog', 'hero'],
        x: 2,
        y: 7,
        rotation: 0,
        vx: 0,
        vy: 0,
        width: 1,
        height: 1,
      },
      { id: 'fly', tags: ['fly'], x: 5, y: 2, rotation: 0, vx: 0, vy: 0, width: 0.4, height: 0.4 },
    ],
  });
  for (let i = 1; i <= 40 && handle.status !== 'failed'; i++) {
    handle.pushEvent({ type: 'tick', time: i * 0.05, dt: 0.05 });
    if (i === 10) handle.pushEvent({ type: 'tap', target: 'fly', x: 5, y: 2 });
    await handle.drain();
  }
  handle.stop();
  return { errors, breaches };
}

describe('red-team scripts', () => {
  it('has at least twenty escape attempts', () => {
    expect(files.length).toBeGreaterThanOrEqual(20);
  });

  describe.each(files)('%s', (file) => {
    const source = readFileSync(new URL(file, dir), 'utf8');
    const want = expectation(source);
    const alternatives = want.detail.split('|');

    if (want.stage === 'static') {
      it(`is rejected by the static check with ${want.detail}`, () => {
        const result = checkScript(source);
        expect(result.ok, 'the static check must reject it').toBe(false);
        const codes = result.ok ? [] : result.errors.map((e) => e.code);
        expect(
          codes.some((c) => alternatives.includes(c)),
          `codes: ${codes.join(', ')}`,
        ).toBe(true);
      });
    } else {
      it(`passes the static check and is stopped at runtime by ${want.detail}`, async () => {
        const check = checkScript(source);
        expect(check.ok, JSON.stringify(check)).toBe(true);
        const { errors, breaches } = await runInHost(source);
        const reasons = [
          ...breaches.map((b) => `budget:${b.kind}`),
          ...errors.map((e) => `${e.code}:${e.message}`),
        ];
        const matched = alternatives.some((alt) => {
          if (alt.startsWith('budget:')) return breaches.some((b) => `budget:${b.kind}` === alt);
          if (alt.startsWith('error:'))
            return errors.some(
              (e) => e.code === 'runtime' && new RegExp(alt.slice(6)).test(e.message),
            );
          return false;
        });
        expect(matched, `blocked for: ${reasons.join(' / ') || 'nothing'}`).toBe(true);
      });
    }
  });
});
