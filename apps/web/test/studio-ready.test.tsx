import { describe, expect, it } from 'vitest';
import type { Creation } from '@just-imagine/protocol';
import { isFallbackWorld, onWorldJob, type WorldJobStatus } from '../lib/studio-world-job';

type Ask = string | undefined;
/** `fallback` is what the loaded world document says, or 'unloaded' before it loads. */
function run(
  statuses: WorldJobStatus[],
  worldId: string,
  selected: Ask,
  asked: Ask = undefined,
  fallback: boolean | 'unloaded' = false,
) {
  return statuses.map((status) => {
    const out = onWorldJob(
      { status, worldId },
      {
        selectedWorldId: selected,
        askedWorldId: asked,
        fallback: fallback === 'unloaded' ? undefined : fallback,
      },
    );
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
      stopVoiceOnLoad: undefined,
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
  it('keeps the voice on for a fallback world, so the friend can explain it, and still selects it', () => {
    const outs = run(['queued', 'placeholders', 'ready'], 'w_1', undefined, undefined, true);
    expect(outs.map((o) => o.stopVoice)).toEqual([false, false, false]);
    expect(outs[2]).toEqual({
      stopVoice: false,
      stopVoiceOnLoad: undefined,
      select: 'w_1',
      clearBadge: true,
      askedWorldId: undefined,
    });
  });
  it('leaves the stop to the world document when it has not loaded by ready', () => {
    const [, ready] = run(['queued', 'ready'], 'w_1', undefined, undefined, 'unloaded');
    expect(ready).toMatchObject({ stopVoice: false, stopVoiceOnLoad: 'w_1', select: 'w_1' });
    // A voice edit never waits on its document to stop the voice.
    const [, edit] = run(['queued', 'ready'], 'w_1', 'w_1', undefined, 'unloaded');
    expect(edit).toMatchObject({ stopVoice: false, stopVoiceOnLoad: undefined });
  });
  it('reads the fallback from the world creation record', () => {
    const creation: Creation = { originalWish: 'frogs', changes: [], mode: 'game' };
    const fellBack = (fallback: 'template' | 'sample') => ({
      creation: { ...creation, fallback } as Creation,
    });
    expect(isFallbackWorld(fellBack('template'))).toBe(true);
    expect(isFallbackWorld(fellBack('sample'))).toBe(true);
    expect(isFallbackWorld({ creation })).toBe(false);
    expect(isFallbackWorld({})).toBe(false);
  });
  it('leaves the voice alone for a ready this session never asked for', () => {
    const [out] = run(['ready'], 'w_2', undefined);
    expect(out?.stopVoice).toBe(false);
    expect(out?.clearBadge).toBe(true);
  });
});
