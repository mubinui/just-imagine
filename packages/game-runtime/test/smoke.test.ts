import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { FIXTURE_WORLDS } from '@just-imagine/fixtures';
import { smokeRun, createEngineStage } from '../src/smoke';
import { EXAMPLE_SCENES } from './examples/scenes';

const examplesDir = new URL('./examples/', import.meta.url);
const redTeamDir = new URL('./red-team/', import.meta.url);
const read = (dir: URL, file: string) => readFileSync(new URL(file, dir), 'utf8');
const exampleFiles = readdirSync(examplesDir).filter((f) => f.endsWith('.js'));
const redTeamFiles = readdirSync(redTeamDir).filter((f) => f.endsWith('.js'));

describe('createEngineStage over the real headless engine', () => {
  it('reports entity states with their tags', async () => {
    const stage = await createEngineStage(FIXTURE_WORLDS.moonBounce);
    const state = stage.state();
    expect(state.entities.map((e) => [e.id, e.tags])).toEqual([
      ['ground', ['ground']],
      ['ball', ['ball', 'hero']],
      ['bolt_toy', ['bolt']],
    ]);
    stage.dispose?.();
  });

  it('spawns a clone of a template entity with merged tags at the given position', async () => {
    const stage = await createEngineStage(FIXTURE_WORLDS.moonBounce);
    stage.apply({ type: 'spawn', id: 's1_ball', template: 'ball', x: 12, y: 3, tags: ['extra'] });
    const spawned = stage.state().entities.find((e) => e.id === 's1_ball');
    expect(spawned).toMatchObject({ tags: ['ball', 'hero', 'extra'], templateId: 'ball' });
    expect(spawned!.x).toBeCloseTo(12, 1);
    expect(spawned!.y).toBeCloseTo(3, 1);
    stage.dispose?.();
  });

  it('spawns a placeholder body for a library id', async () => {
    const stage = await createEngineStage(FIXTURE_WORLDS.moonBounce);
    stage.apply({
      type: 'spawn',
      id: 's1_lib',
      template: 'lib/meadow/acorn',
      x: 6,
      y: 2,
      tags: ['acorn'],
    });
    expect(stage.state().entities.find((e) => e.id === 's1_lib')?.tags).toEqual(['acorn']);
    stage.dispose?.();
  });

  it('removes by id and by tag', async () => {
    const stage = await createEngineStage(FIXTURE_WORLDS.moonBounce);
    stage.apply({ type: 'remove', target: 'bolt' });
    expect(stage.state().entities.map((e) => e.id)).toEqual(['ground', 'ball']);
    stage.apply({ type: 'remove', target: 'ball' });
    expect(stage.state().entities.map((e) => e.id)).toEqual(['ground']);
    stage.dispose?.();
  });

  it('applies impulse as a velocity change through flick', async () => {
    const stage = await createEngineStage(FIXTURE_WORLDS.moonBounce);
    stage.apply({ type: 'impulse', target: 'ball', x: 3, y: -4 });
    stage.step(1 / 60);
    const ball = stage.state().entities.find((e) => e.id === 'ball')!;
    expect(ball.vx).toBeCloseTo(3, 0);
    expect(ball.vy).toBeLessThan(-3);
    stage.dispose?.();
  });

  it('changes gravity and ignores materials outside the scene table', async () => {
    const stage = await createEngineStage(FIXTURE_WORLDS.moonBounce);
    stage.apply({ type: 'setGravity', x: 0, y: 0 });
    const before = stage.state().entities.find((e) => e.id === 'ball')!.y;
    stage.step(1);
    expect(stage.state().entities.find((e) => e.id === 'ball')!.y).toBeCloseTo(before, 3);
    expect(() =>
      stage.apply({ type: 'setMaterial', target: 'ball', material: 'adamantium' }),
    ).not.toThrow();
    stage.apply({ type: 'setMaterial', target: 'ball', material: 'metal' });
    stage.dispose?.();
  });

  it('reports contacts that begin, once per contact episode', async () => {
    const stage = await createEngineStage(FIXTURE_WORLDS.moonBounce);
    const seen: string[] = [];
    for (let i = 0; i < 80; i++) {
      stage.step(0.05);
      for (const c of stage.collisions()) seen.push([c.a, c.b].sort().join('+'));
    }
    expect(seen).toContain('ball+ground');
    stage.dispose?.();
  });
});

describe('smokeRun on the example games', () => {
  it.each(exampleFiles)('%s passes', async (file) => {
    const name = file.replace(/\.js$/, '') as keyof typeof EXAMPLE_SCENES;
    const result = await smokeRun(EXAMPLE_SCENES[name], read(examplesDir, file), {
      seconds: 10,
      language: 'en',
    });
    expect(result.ok, JSON.stringify(result)).toBe(true);
    if (!result.ok) return;
    expect(result.stats.ticks).toBe(200);
    expect(result.stats.won || (result.stats.commands.score ?? 0) > 0).toBe(true);
  });
});

describe('smokeRun on the red-team scripts', () => {
  it.each(redTeamFiles)('%s fails for the right reason', async (file) => {
    const source = read(redTeamDir, file);
    const [, stage, detail] = /^\/\/ expect: (static|runtime) (\S+)/.exec(source)!;
    const result = await smokeRun(EXAMPLE_SCENES['catch-the-flies'], source, {
      seconds: 10,
      language: 'en',
    });
    expect(result.ok).toBe(false);
    if (result.ok) return;
    if (stage === 'static') {
      expect(result.reason).toBe('static');
    } else {
      const kinds = detail!.split('|');
      const want = kinds.every((k) => k.startsWith('budget:')) ? 'budget' : 'runtime';
      expect(result.reason, JSON.stringify(result.detail)).toBe(want);
      if (want === 'budget')
        expect(kinds).toContain(`budget:${(result.detail as { kind: string }).kind}`);
    }
  });
});

describe('smokeRun goal and moderation checks', () => {
  const doc = EXAMPLE_SCENES['catch-the-flies'];

  it('allows scoreless interactive play while retaining sandbox and runtime checks', async () => {
    const result = await smokeRun(doc, `game.on('tap', () => game.sound('pop'));`, {
      seconds: 3,
      language: 'en',
      requireGoal: false,
    });
    expect(result.ok).toBe(true);
    expect(result.stats.commands.sound).toBeGreaterThan(0);
    expect(result.stats.commands.score).toBeUndefined();
    const unsafe = await smokeRun(doc, `fetch('https://outside.test');`, {
      seconds: 3,
      language: 'en',
      requireGoal: false,
    });
    expect(unsafe).toMatchObject({ ok: false, reason: 'static' });
    const broken = await smokeRun(doc, `game.on('tick', () => { const x = null; x.missing(); });`, {
      seconds: 3,
      language: 'en',
      requireGoal: false,
    });
    expect(broken).toMatchObject({ ok: false, reason: 'runtime' });
  });

  it('fails with no-goal when the script never calls score or win', async () => {
    const result = await smokeRun(doc, `game.on('tap', () => game.sound('pop'));`, {
      seconds: 10,
      language: 'en',
    });
    expect(result).toMatchObject({ ok: false, reason: 'no-goal' });
  });

  it('fails with no-goal when the goal call is present but never reached', async () => {
    const result = await smokeRun(doc, `game.on('tap', (e) => { if (e.x > 1000) game.win(); });`, {
      seconds: 10,
      language: 'en',
    });
    expect(result).toMatchObject({ ok: false, reason: 'no-goal' });
  });

  it('passes every say, ask and hud string to the moderator with the language', async () => {
    const seen: [string, string][] = [];
    const result = await smokeRun(
      doc,
      `game.say('Hello friend'); game.hud({ label: 'Catch flies' });
       game.on('tap', async () => { const i = await game.ask('Faster?', ['Yes', 'No']); game.score(i + 1); });`,
      {
        seconds: 10,
        language: 'bn',
        moderate: async (text, language) => {
          seen.push([text, language]);
          return true;
        },
      },
    );
    expect(result.ok, JSON.stringify(result)).toBe(true);
    expect(seen).toEqual([
      ['Hello friend', 'bn'],
      ['Catch flies', 'bn'],
      ['Faster?', 'bn'],
      ['Yes', 'bn'],
      ['No', 'bn'],
    ]);
  });

  it('fails with moderation when any string is rejected', async () => {
    const result = await smokeRun(
      doc,
      `game.say('You are silly'); game.on('tick', () => game.score(1));`,
      { seconds: 10, language: 'en', moderate: async (text) => !text.includes('silly') },
    );
    expect(result).toMatchObject({
      ok: false,
      reason: 'moderation',
      detail: { rejected: ['You are silly'] },
    });
  });
});
