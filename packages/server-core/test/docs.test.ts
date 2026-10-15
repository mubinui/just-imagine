import { describe, it, expect, beforeEach } from 'vitest';
import { ChildDocSchema, paths } from '@just-imagine/protocol';
import { clearFirestore } from './emulator';
import { readDoc, writeDoc, updateDoc, DocShapeError } from '../src/docs';

const child = {
  firstName: 'Mira',
  avatar: 'owl' as const,
  ageBand: '8-10' as const,
  tier: 'playground' as const,
  labsUnlocked: false,
  captions: true,
  sessionTargetMinutes: 8,
  loopsCompleted: 0,
  createdAt: 1,
};

describe('typed documents', () => {
  beforeEach(clearFirestore);

  it('writes and reads a document through its schema', async () => {
    await writeDoc(paths.child('u1', 'c1'), ChildDocSchema, child);
    await expect(readDoc(paths.child('u1', 'c1'), ChildDocSchema)).resolves.toEqual(child);
  });
  it('returns null for a missing document', async () => {
    await expect(readDoc(paths.child('u1', 'nope'), ChildDocSchema)).resolves.toBeNull();
  });
  it('refuses to write data that fails the schema', async () => {
    await expect(
      writeDoc(paths.child('u1', 'c1'), ChildDocSchema, { ...child, ageBand: '14-16' }),
    ).rejects.toBeInstanceOf(DocShapeError);
  });
  it('merges a partial update and re-validates the result', async () => {
    await writeDoc(paths.child('u1', 'c1'), ChildDocSchema, child);
    await updateDoc(paths.child('u1', 'c1'), ChildDocSchema, { loopsCompleted: 3 });
    await expect(readDoc(paths.child('u1', 'c1'), ChildDocSchema)).resolves.toEqual({
      ...child,
      loopsCompleted: 3,
    });
  });
});
