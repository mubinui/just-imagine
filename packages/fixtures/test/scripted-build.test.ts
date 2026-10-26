import { describe, it, expect } from 'vitest';
import { DocumentIdSchema, WorldDocSchema } from '@just-imagine/protocol';
import { GAME_WORLDS } from '../src/worlds';
import { isScriptedBuild, scriptedBuildId, scriptedBuildWorld } from '../src/scripted-build';

describe('scripted build', () => {
  it('names a new world per build and recognises only those names', () => {
    expect(scriptedBuildId(1)).not.toBe(scriptedBuildId(2));
    expect(isScriptedBuild(scriptedBuildId(7))).toBe(true);
    expect(isScriptedBuild('w_fixture_jelly_dragon')).toBe(false);
    expect(isScriptedBuild(GAME_WORLDS.catchTheFlies.worldId)).toBe(false);
  });

  it('serves Catch the Flies, ready, under the built world id', () => {
    const id = scriptedBuildId(3);
    const world = scriptedBuildWorld(id);
    expect(() => WorldDocSchema.extend({ id: DocumentIdSchema }).parse(world)).not.toThrow();
    expect(world.id).toBe(id);
    expect(world.doc.worldId).toBe(id);
    expect(world.status).toBe('ready');
    expect(world.title).toBe('Catch the Flies');
    expect(world.doc.game).toEqual(GAME_WORLDS.catchTheFlies.game);
    expect(world.creation).toBeUndefined();
  });

  it('serves a template fallback build as a world whose creation says so', () => {
    const id = scriptedBuildId(4, 'template');
    expect(isScriptedBuild(id)).toBe(true);
    expect(id).not.toBe(scriptedBuildId(4));
    const world = scriptedBuildWorld(id);
    expect(() => WorldDocSchema.extend({ id: DocumentIdSchema }).parse(world)).not.toThrow();
    expect(world.id).toBe(id);
    expect(world.title).toBe('Catch the Flies');
    expect(world.creation).toMatchObject({ mode: 'game', fallback: 'template' });
  });
});
