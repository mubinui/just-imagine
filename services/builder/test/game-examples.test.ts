import { it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { checkScript } from '@just-imagine/game-runtime';
import { GAME_API_DECLARATIONS, GAME_EXAMPLES } from '../src/game-examples';

const runtime = new URL('../../../packages/game-runtime/', import.meta.url);

it('embeds the Game API declarations exactly as the runtime ships them', () => {
  expect(GAME_API_DECLARATIONS).toBe(readFileSync(new URL('src/api.d.ts', runtime), 'utf8'));
});

it('embeds the eight example programmes exactly, each passing the static check', () => {
  const dir = new URL('test/examples/', runtime);
  const files = readdirSync(dir).filter((f) => f.endsWith('.js'));
  expect(GAME_EXAMPLES).toHaveLength(8);
  expect(GAME_EXAMPLES.map((e) => `${e.name}.js`).sort()).toEqual(files.sort());
  for (const example of GAME_EXAMPLES) {
    expect(example.source).toBe(readFileSync(new URL(`${example.name}.js`, dir), 'utf8'));
    expect(checkScript(example.source).ok).toBe(true);
    expect(example.scene.entities.length).toBeGreaterThan(1);
  }
});
