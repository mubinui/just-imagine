import { beforeEach, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  listener: undefined as ((status: string) => void) | undefined,
  setConversation: vi.fn(),
}));
vi.mock('../lib/env', () => ({ env: { fake: true, gatewayUrl: 'ws://synthetic' } }));
vi.mock('../lib/firebase', () => ({ currentIdToken: vi.fn() }));
vi.mock('../lib/sound', () => ({ getMixer: () => ({ setConversation: mocks.setConversation }) }));
vi.mock('@just-imagine/characters', () => ({
  VoiceClient: class {
    subscribeStatus(listener: (status: string) => void) {
      mocks.listener = listener;
      return () => {
        mocks.listener = undefined;
      };
    }
    dispose = () => {};
    end = () => {};
  },
}));
import { getVoice, releaseVoice } from '../lib/voice';

beforeEach(() => {
  releaseVoice();
  vi.clearAllMocks();
});

it('quiets game sound while a conversation with a character is open', () => {
  getVoice();
  for (const status of ['connecting', 'connected', 'reconnecting']) {
    mocks.listener!(status);
    expect(mocks.setConversation).toHaveBeenLastCalledWith(true);
  }
  for (const status of ['closed', 'error', 'idle']) {
    mocks.listener!(status);
    expect(mocks.setConversation).toHaveBeenLastCalledWith(false);
  }
});

it('returns game sound when the voice is released', () => {
  getVoice();
  mocks.listener!('connected');
  releaseVoice();
  expect(mocks.setConversation).toHaveBeenLastCalledWith(false);
  expect(mocks.listener).toBeUndefined();
});
