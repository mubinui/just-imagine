import { describe, expect, it } from 'vitest';
import { onWorldJob, type WorldJobStatus } from '../lib/studio-world-job';

type Ask = string | undefined;
function run(statuses: WorldJobStatus[], worldId: string, selected: Ask, asked: Ask = undefined) {
  return statuses.map((status) => {
    const out = onWorldJob({ status, worldId }, { selectedWorldId: selected, askedWorldId: asked });
    asked = out.askedWorldId;
    return out;
  });
}

describe('worldJob handling in the Studio', () => {
  it('stops the voice and selects the game once, when a newly asked world is ready', () => {
    const [queued, , ready] = run(['queued', 'building', 'ready'], 'w_1', undefined);
    expect(queued?.stopVoice).toBe(false);
    expect(ready).toEqual({
      stopVoice: true,
      select: 'w_1',
      clearBadge: true,
      askedWorldId: undefined,
    });
  });
  it('keeps the voice running through a voice edit of the selected world', () => {
    const outs = run(['queued', 'building', 'ready'], 'w_1', 'w_1');
    expect(outs.map((o) => o.stopVoice)).toEqual([false, false, false]);
    expect(outs[2]?.clearBadge).toBe(true);
  });
  it('does not stop the voice again for a second ready of the already-stopped world', () => {
    const first = run(['queued', 'ready'], 'w_1', undefined);
    expect(first[1]?.stopVoice).toBe(true);
    const [again] = run(['ready'], 'w_1', 'w_1', first[1]?.askedWorldId);
    expect(again?.stopVoice).toBe(false);
  });
  it('leaves the voice alone for a ready this session never asked for', () => {
    const [out] = run(['ready'], 'w_2', undefined);
    expect(out?.stopVoice).toBe(false);
    expect(out?.clearBadge).toBe(true);
  });
});
