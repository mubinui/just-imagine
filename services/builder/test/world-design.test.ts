import { describe, it, expect } from 'vitest';
import { WORLD_DESIGN_RULES } from '../src/prompts/world-design';
import { scenePromptV1 } from '../src/prompts/v1';
import { BuildWorldJobSchema } from '@just-imagine/protocol';

describe('world design rules', () => {
  it('cover story, magnet, child as hero, discovery and the eleven rules', () => {
    for (const word of [
      'For a requested story',
      'magnet',
      'child is the hero',
      'surprise',
      'Plus it',
    ])
      expect(WORLD_DESIGN_RULES).toContain(word);
    expect(WORLD_DESIGN_RULES.match(/^\d+\./gm)?.length).toBe(11);
  });
  it('are part of the scene prompt', () => {
    const job = BuildWorldJobSchema.parse({
      kind: 'build',
      jobId: 'j1',
      worldId: 'w1',
      uid: 'u1',
      childId: 'c1',
      sessionId: 's1',
      plan: 'free',
      description: 'a jelly dragon on a cloud',
      concepts: ['bounce'],
      ageBand: '6-7',
      tier: 'playground',
      styleVersion: 'style-v1',
      promptVersion: 'v1',
      conversationSummary: 'The child wants a jelly dragon.',
    });
    expect(scenePromptV1(job)).toContain(WORLD_DESIGN_RULES);
  });
});
