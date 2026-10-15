import { describe, it, expect, vi } from 'vitest';

const hooks = vi.hoisted(() => ({ get: vi.fn(), onSnapshot: vi.fn() }));
vi.mock('../src/firebase', () => ({ db: () => ({ doc: () => hooks }) }));
import { isKillSwitchOn, watchKillSwitch } from '../src/kill-switch';

describe('kill switch read failures', () => {
  it('fails closed when a read fails', async () => {
    hooks.get.mockRejectedValueOnce(new Error('unavailable'));
    await expect(isKillSwitchOn()).resolves.toBe(true);
  });
  it('fails closed when a watcher reports an error', () => {
    const stop = vi.fn();
    hooks.onSnapshot.mockImplementationOnce((_next, error: () => void) => {
      error();
      return stop;
    });
    const seen = vi.fn();
    const unsubscribe = watchKillSwitch(seen);
    expect(seen).toHaveBeenCalledWith(true);
    unsubscribe();
    expect(stop).toHaveBeenCalledOnce();
  });
});
