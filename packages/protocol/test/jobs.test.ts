import { describe, it, expect } from 'vitest';
import { BuilderJobSchema } from '../src/jobs';

const base = {
  jobId: 'j_1',
  worldId: 'w_1',
  uid: 'u_1',
  childId: 'c_1',
  sessionId: 's_1',
  plan: 'free' as const,
};

describe('BuilderJobSchema', () => {
  it('accepts a build job', () => {
    const r = BuilderJobSchema.safeParse({
      ...base,
      kind: 'build',
      description: 'a jelly dragon on a cloud',
      concepts: ['bounce'],
      ageBand: '6-7',
      tier: 'playground',
      styleVersion: 'style-v1',
      promptVersion: 'imagine-v1',
      conversationSummary: 'The child wants a jelly dragon.',
    });
    expect(r.success).toBe(true);
  });
  it('accepts a patch job', () => {
    const r = BuilderJobSchema.safeParse({
      ...base,
      kind: 'patch',
      instruction: 'make the dragon bigger',
      promptVersion: 'patch-v1',
    });
    expect(r.success).toBe(true);
  });
  it('rejects a build job with four concepts', () => {
    const r = BuilderJobSchema.safeParse({
      ...base,
      kind: 'build',
      description: 'x',
      concepts: ['bounce', 'gravity', 'mass', 'speed'],
      ageBand: '6-7',
      tier: 'playground',
      styleVersion: 'style-v1',
      promptVersion: 'imagine-v1',
      conversationSummary: 'x',
    });
    expect(r.success).toBe(false);
  });
});
