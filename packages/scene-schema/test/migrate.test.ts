import { describe, it, expect } from 'vitest';
import { migrateScene, CURRENT_SCHEMA_VERSION } from '../src/migrate';
import { minimalScene } from './helpers';

describe('migrateScene', () => {
  it('passes a current document through unchanged', () => {
    const doc = minimalScene();
    const r = migrateScene(doc);
    expect(r).toEqual({ ok: true, doc });
  });
  it('refuses a document newer than the library', () => {
    expect(migrateScene({ ...minimalScene(), schemaVersion: CURRENT_SCHEMA_VERSION + 1 })).toEqual({
      ok: false,
      reason: 'NEWER_THAN_SUPPORTED',
    });
  });
  it('refuses non-objects and missing versions', () => {
    expect(migrateScene('nope')).toEqual({ ok: false, reason: 'NOT_AN_OBJECT' });
    expect(migrateScene({ title: 'x' })).toEqual({ ok: false, reason: 'MISSING_VERSION' });
  });
});
