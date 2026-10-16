import { describe, it, expect } from 'vitest';
import { createHash } from 'node:crypto';
import { validateScene } from '@just-imagine/scene-schema';
import { GAME_WORLDS } from '../src/worlds';

describe('game fixture worlds', () => {
  it('ships a valid generated-game world with a hashed script', () => {
    const doc = GAME_WORLDS.catchTheFlies;
    expect(validateScene(doc).issues).toEqual([]);
    expect(doc.tier).toBe('playground');
    const script = doc.game?.script;
    expect(script?.apiVersion).toBe(1);
    expect(script?.hash).toBe(createHash('sha256').update(script!.source).digest('hex'));
    expect(script?.source).toContain("game.on('tap'");
    expect(doc.entities.filter((e) => e.tags.includes('fly')).length).toBeGreaterThanOrEqual(3);
  });
});
