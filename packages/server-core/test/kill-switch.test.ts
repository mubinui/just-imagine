import { describe, it, expect, beforeEach } from 'vitest';
import { RuntimeConfigDocSchema, paths } from '@just-imagine/protocol';
import { clearFirestore } from './emulator';
import { writeDoc } from '../src/docs';
import { isKillSwitchOn, watchKillSwitch } from '../src/kill-switch';

describe('kill switch', () => {
  beforeEach(clearFirestore);

  it('is off when the config document is missing', async () => {
    await expect(isKillSwitchOn()).resolves.toBe(false);
  });

  it('fails closed for malformed config', async () => {
    const { db } = await import('../src/firebase');
    await db().doc(paths.runtimeConfig()).set({ killSwitch: 'false' });
    await expect(isKillSwitchOn()).resolves.toBe(true);
    const seen: boolean[] = [];
    const stop = watchKillSwitch((on) => seen.push(on));
    await expect.poll(() => seen.at(-1)).toBe(true);
    stop();
  });
  it('reflects the config document and notifies watchers', async () => {
    const seen: boolean[] = [];
    const stop = watchKillSwitch((on) => seen.push(on));
    await writeDoc(paths.runtimeConfig(), RuntimeConfigDocSchema, {
      killSwitch: true,
      updatedAt: 1,
    });
    await new Promise((r) => setTimeout(r, 500));
    await expect(isKillSwitchOn()).resolves.toBe(true);
    expect(seen.at(-1)).toBe(true);
    stop();
  });
});
