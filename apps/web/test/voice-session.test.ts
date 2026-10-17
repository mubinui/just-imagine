import { beforeEach, expect, it, vi } from 'vitest';
import type { ChildResponse } from '@just-imagine/protocol';

const mocks = vi.hoisted(() => ({
  token: vi.fn(),
  connect: vi.fn(),
  send: vi.fn(),
  end: vi.fn(),
  unlock: vi.fn(),
  session: undefined as { childId: string } | undefined,
}));
vi.mock('../lib/env', () => ({ env: { fake: false, gatewayUrl: 'ws://synthetic' } }));
vi.mock('../lib/firebase', () => ({ currentIdToken: mocks.token }));
vi.mock('@just-imagine/characters', () => ({
  VoiceClient: class {
    get session() {
      return mocks.session;
    }
    connect = mocks.connect;
    send = mocks.send;
    end = () => {
      mocks.end();
      mocks.session = undefined;
    };
    unlockAudio = mocks.unlock;
    subscribeStatus = () => () => {};
    dispose = () => {};
  },
}));
import { ensureChildVoice, releaseVoice, stopChildVoice, unlockChildVoice } from '../lib/voice';
const child = {
  id: 'c_one',
  ageBand: '8-10',
  companion: { kind: 'preset', characterId: 'bhombol', name: 'Synthetic' },
} as ChildResponse;
beforeEach(() => {
  releaseVoice();
  mocks.session = undefined;
  vi.clearAllMocks();
  mocks.token.mockResolvedValue('synthetic');
  mocks.unlock.mockResolvedValue(undefined);
  mocks.connect.mockImplementation(async (hello) => {
    mocks.session = { childId: hello.childId };
  });
});

it('uses the latest character and gallery world chosen before token acquisition completes', async () => {
  let resolve!: (token: string) => void;
  mocks.token.mockReturnValue(
    new Promise<string>((r) => {
      resolve = r;
    }),
  );
  const first = ensureChildVoice(child, 'w_old', 'bhombol');
  const latest = ensureChildVoice(child, 'w_latest', 'chandni');
  resolve('synthetic');
  await Promise.all([first, latest]);
  expect(mocks.connect).toHaveBeenCalledOnce();
  expect(mocks.connect).toHaveBeenCalledWith(
    expect.objectContaining({ childId: child.id, worldId: 'w_latest', characterId: 'chandni' }),
  );
});

it('sends requested context changes into an existing same-child session without opening another microphone', async () => {
  await ensureChildVoice(child, 'w_old');
  await ensureChildVoice(child, 'w_latest', 'mishti');
  expect(mocks.connect).toHaveBeenCalledOnce();
  expect(mocks.send.mock.calls.map(([message]) => message)).toEqual([
    { type: 'openWorld', worldId: 'w_latest' },
    { type: 'switchCharacter', characterId: 'mishti' },
  ]);
});

it('cancels an obsolete child opening before it can attach to the replacement child session', async () => {
  let resolve!: (token: string) => void;
  mocks.token
    .mockReturnValueOnce(
      new Promise<string>((r) => {
        resolve = r;
      }),
    )
    .mockResolvedValueOnce('synthetic-new');
  const old = ensureChildVoice(child, 'w_old');
  await ensureChildVoice({ ...child, id: 'c_two' }, 'w_new');
  resolve('synthetic-old');
  await old;
  expect(mocks.connect).toHaveBeenCalledOnce();
  expect(mocks.connect).toHaveBeenCalledWith(
    expect.objectContaining({ childId: 'c_two', worldId: 'w_new' }),
  );
});

it('does not connect after a stop while token acquisition is still pending', async () => {
  let resolve!: (token: string) => void;
  mocks.token.mockReturnValue(
    new Promise<string>((r) => {
      resolve = r;
    }),
  );
  const pending = ensureChildVoice(child);
  stopChildVoice();
  resolve('synthetic');
  await pending;
  expect(mocks.connect).not.toHaveBeenCalled();
});

it('cancels a start awaiting audio unlock, while allowing an explicit later call', async () => {
  let resolve!: () => void;
  mocks.unlock.mockReturnValueOnce(new Promise<void>((r) => (resolve = r)));
  const start = async () => {
    if (await unlockChildVoice()) await ensureChildVoice(child);
  };
  const pending = start();
  stopChildVoice();
  resolve();
  await pending;
  expect(mocks.connect).not.toHaveBeenCalled();
  await start();
  expect(mocks.connect).toHaveBeenCalledOnce();
});

it('discards a cancelled unlock rejection without reporting an error in a newer call', async () => {
  let reject!: (error: Error) => void;
  mocks.unlock.mockReturnValueOnce(new Promise<void>((_, r) => (reject = r)));
  const pending = unlockChildVoice();
  stopChildVoice();
  expect(await unlockChildVoice()).toBe(true);
  reject(new Error('Old audio context request failed'));
  await expect(pending).resolves.toBe(false);
});

it('cancels audio unlock when the child layout disposes the voice client', async () => {
  let resolve!: () => void;
  mocks.unlock.mockReturnValueOnce(new Promise<void>((r) => (resolve = r)));
  const pending = unlockChildVoice();
  releaseVoice();
  resolve();
  await expect(pending).resolves.toBe(false);
});
