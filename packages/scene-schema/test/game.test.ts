import { describe, it, expect } from 'vitest';
import {
  GAME_SCRIPT_MAX_BYTES,
  SceneDocSchema,
  generatedSceneJsonSchema,
  validateScene,
  type SceneDoc,
} from '../src/index';
import { minimalScene } from './helpers';

const HASH = 'a'.repeat(64);
const withGame = (source: string, extra: Record<string, unknown> = {}): SceneDoc =>
  ({
    ...minimalScene(),
    game: { script: { apiVersion: 1, source, hash: HASH, ...extra } },
  }) as SceneDoc;
const codes = (r: { issues: { code: string }[] }) => r.issues.map((i) => i.code);

describe('SceneDoc.game', () => {
  it('is optional and preserved through validation', () => {
    expect(validateScene(minimalScene()).ok).toBe(true);
    const r = validateScene(withGame('game.score(1);'));
    expect(r.ok).toBe(true);
    expect(r.doc?.game).toEqual({
      script: { apiVersion: 1, source: 'game.score(1);', hash: HASH },
    });
  });

  it('rejects other API versions, empty sources and malformed hashes', () => {
    expect(SceneDocSchema.safeParse(withGame('x', { apiVersion: 2 })).success).toBe(false);
    expect(SceneDocSchema.safeParse(withGame('')).success).toBe(false);
    expect(SceneDocSchema.safeParse(withGame('x', { hash: 'not a hash' })).success).toBe(false);
  });

  it('rejects a source longer than the limit in characters', () => {
    const r = validateScene(withGame('x'.repeat(GAME_SCRIPT_MAX_BYTES + 1)));
    expect(r.ok).toBe(false);
    expect(codes(r)).toContain('SCHEMA_INVALID');
  });

  it('rejects a source over the limit in UTF-8 bytes', () => {
    const r = validateScene(withGame('é'.repeat(GAME_SCRIPT_MAX_BYTES / 2 + 1)));
    expect(r.ok).toBe(false);
    expect(codes(r)).toEqual(['GAME_SCRIPT_TOO_LARGE']);
  });

  it('never offers the game field to the scene model', () => {
    const schema = generatedSceneJsonSchema() as { properties: Record<string, unknown> };
    expect(Object.keys(schema.properties)).not.toContain('game');
  });
});
