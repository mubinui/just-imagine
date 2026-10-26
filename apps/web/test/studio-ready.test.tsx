import { describe, expect, it } from 'vitest';
import { onWorldJob } from '../lib/studio-world-job';

describe('worldJob handling in the Studio', () => {
  it('stops the voice and selects the game when the world the child asked for is ready', () => {
    expect(onWorldJob({ status: 'ready', worldId: 'w_1' }, { askedThisSession: true })).toEqual({
      stopVoice: true,
      select: 'w_1',
      clearBadge: true,
    });
  });
  it('leaves the voice alone when a ready arrives for a world this session did not build', () => {
    const out = onWorldJob({ status: 'ready', worldId: 'w_2' }, { askedThisSession: false });
    expect(out.stopVoice).toBe(false);
    expect(out.clearBadge).toBe(true);
  });
  it('keeps the voice running while the world is still building', () => {
    const out = onWorldJob({ status: 'building', worldId: 'w_1' }, { askedThisSession: true });
    expect(out.stopVoice).toBe(false);
    expect(out.clearBadge).toBe(false);
  });
});
