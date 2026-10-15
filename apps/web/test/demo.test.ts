import { beforeEach, it, expect } from 'vitest';
import { demoRequest, readDemo } from '../lib/demo';
const store = new Map<string, string>();
beforeEach(() => {
  store.clear();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (k: string) => store.get(k) || null,
      setItem: (k: string, v: string) => store.set(k, v),
      removeItem: (k: string) => store.delete(k),
    },
  });
});
it('persists profile edits, restricts malformed writes and respects plan limits', () => {
  demoRequest('updateChild', { childId: 'c_fixture' }, { captions: false });
  expect(readDemo().children[0]?.captions).toBe(false);
  expect(() =>
    demoRequest('createChild', {}, { firstName: '', avatar: 'fox', ageBand: '8-10' }),
  ).toThrow();
  for (let i = 0; i < 3; i++)
    demoRequest('createChild', {}, { firstName: 'Kid', avatar: 'fox', ageBand: '8-10' });
  expect(() =>
    demoRequest('createChild', {}, { firstName: 'Kid', avatar: 'fox', ageBand: '8-10' }),
  ).toThrow(/limit/);
});
it('never pretends preview billing succeeded', () => {
  expect(() => demoRequest('checkout', {}, {})).toThrow(/No payment/);
});
it('deletes a sample world from listings', () => {
  const before = demoRequest('listWorlds', {}, undefined) as { worlds: { id: string }[] };
  demoRequest('deleteWorld', { worldId: before.worlds[0]!.id }, undefined);
  const after = demoRequest('listWorlds', {}, undefined) as { worlds: { id: string }[] };
  expect(after.worlds).toHaveLength(3);
});
