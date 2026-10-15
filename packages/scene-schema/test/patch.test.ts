import { describe, it, expect } from 'vitest';
import { applyScenePatch, PatchOpsSchema } from '../src/patch';
import { minimalScene } from './helpers';

describe('PatchOpsSchema', () => {
  it('accepts replace, add, remove, and move ops', () => {
    const ops = [
      { op: 'replace', path: '/title', value: 'New title' },
      { op: 'add', path: '/entities/1/tags/-', value: 'shiny' },
      { op: 'remove', path: '/joints/0' },
      { op: 'move', from: '/rules/0', path: '/rules/1' },
    ];
    expect(PatchOpsSchema.safeParse(ops).success).toBe(true);
  });
  it('rejects unknown ops and paths without a leading slash', () => {
    expect(PatchOpsSchema.safeParse([{ op: 'merge', path: '/title', value: 'x' }]).success).toBe(
      false,
    );
    expect(PatchOpsSchema.safeParse([{ op: 'replace', path: 'title', value: 'x' }]).success).toBe(
      false,
    );
  });
});

describe('applyScenePatch', () => {
  it('applies a valid patch and re-validates', () => {
    const doc = minimalScene();
    const r = applyScenePatch(doc, [
      { op: 'replace', path: '/entities/1/body/size', value: { width: 2, height: 2 } },
    ]);
    expect(r.ok).toBe(true);
    expect(r.doc?.entities[1]?.body.size).toEqual({ width: 2, height: 2 });
    expect(doc.entities[1]!.body.size.width).toBe(1);
  });

  it('rejects a patch that removes the hero entity with HERO_MISSING', () => {
    const r = applyScenePatch(minimalScene(), [{ op: 'remove', path: '/entities/1' }]);
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.code)).toContain('HERO_MISSING');
  });

  it('reports PATCH_INVALID when a path does not exist', () => {
    const r = applyScenePatch(minimalScene(), [
      { op: 'replace', path: '/entities/9/name', value: 'x' },
    ]);
    expect(r.ok).toBe(false);
    expect(r.doc).toBeNull();
    expect(r.issues[0]?.code).toBe('PATCH_INVALID');
  });

  it('reports SCHEMA_INVALID when the patched document breaks the schema', () => {
    const r = applyScenePatch(minimalScene(), [
      { op: 'replace', path: '/schemaVersion', value: 7 },
    ]);
    expect(r.ok).toBe(false);
    expect(r.issues.map((i) => i.code)).toContain('SCHEMA_INVALID');
  });
});
