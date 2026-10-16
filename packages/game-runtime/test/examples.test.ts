import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { checkScript, scanApiCalls } from '../src/static-check';
import { driveScript } from '../src/drive';
import { nodeWorkerFactory } from '../src/node';
import { FakeStage } from './helpers/stage';
import { EXAMPLE_SCENES } from './examples/scenes';

const dir = new URL('./examples/', import.meta.url);
const files = readdirSync(dir)
  .filter((f) => f.endsWith('.js'))
  .sort();

export const EXAMPLE_NAMES = [
  'catch-the-flies',
  'stack-higher-than-the-giraffe',
  'snail-race-in-the-rain',
  'soft-moon-landing',
  'catapult-the-acorns',
  'keep-the-bubble-alive',
  'marble-run-to-the-cup',
  'frog-and-owl-chase',
];

describe('example games', () => {
  it('ships the eight example games with a scene each', () => {
    expect(files).toEqual([...EXAMPLE_NAMES].sort().map((n) => `${n}.js`));
    expect(Object.keys(EXAMPLE_SCENES).sort()).toEqual([...EXAMPLE_NAMES].sort());
  });

  describe.each(files)('%s', (file) => {
    const name = file.replace(/\.js$/, '');
    const source = readFileSync(new URL(file, dir), 'utf8');

    it('passes the static check without warnings', () => {
      expect(checkScript(source)).toEqual({ ok: true, warnings: [] });
    });

    it('uses several Game API calls including a goal', () => {
      const calls = scanApiCalls(source);
      expect(calls.size).toBeGreaterThanOrEqual(6);
      expect(calls.has('score') || calls.has('win')).toBe(true);
      expect(calls.has('on')).toBe(true);
    });

    it('runs ten simulated seconds on a fake stage without errors and scores or wins', async () => {
      const scene = EXAMPLE_SCENES[name as keyof typeof EXAMPLE_SCENES];
      const stage = FakeStage.fromScene(scene);
      const result = await driveScript(source, stage, {
        seconds: 10,
        seed: 7,
        worker: nodeWorkerFactory,
      });
      expect(result.ok, JSON.stringify(result, null, 1)).toBe(true);
      const stats = result.stats;
      expect(stats.ticks).toBe(200);
      expect(stats.errors).toBe(0);
      expect((stats.commands.score ?? 0) + (stats.commands.win ?? 0)).toBeGreaterThan(0);
      expect(stats.strings.length).toBeGreaterThan(0);
    });
  });
});
