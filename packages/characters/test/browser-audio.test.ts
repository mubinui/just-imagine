import { it, expect, vi, afterEach } from 'vitest';
import { BrowserAudio } from '../src/browser-audio';
afterEach(() => vi.unstubAllGlobals());
it('deduplicates capture requests and stops a microphone granted after leaving', async () => {
  let grant: (stream: MediaStream) => void = () => {};
  const getUserMedia = vi.fn(
    () =>
      new Promise<MediaStream>((resolve) => {
        grant = resolve;
      }),
  );
  const stop = vi.fn(),
    attach = vi.fn();
  vi.stubGlobal('navigator', { mediaDevices: { getUserMedia } });
  vi.stubGlobal(
    'AudioContext',
    class {
      state = 'running';
      destination = {};
      audioWorklet = { addModule: async () => {} };
      resume = async () => {};
      createMediaStreamSource = attach;
    },
  );
  vi.stubGlobal(
    'AudioWorkletNode',
    class {
      port = { onmessage: null, postMessage: () => {} };
      connect() {}
      disconnect() {}
    },
  );
  const audio = new BrowserAudio();
  await audio.unlock();
  const first = audio.startCapture(),
    second = audio.startCapture();
  await Promise.resolve();
  expect(getUserMedia).toHaveBeenCalledOnce();
  audio.stopCapture();
  grant({ getTracks: () => [{ stop }] } as unknown as MediaStream);
  await Promise.all([first, second]);
  expect(stop).toHaveBeenCalledOnce();
  expect(attach).not.toHaveBeenCalled();
});

it('fans actual playback energy out to independent portraits and resets them on interruption', async () => {
  let playback: { onmessage: ((event: { data: number }) => void) | null };
  vi.stubGlobal(
    'AudioContext',
    class {
      state = 'running';
      destination = {};
      audioWorklet = { addModule: async () => {} };
      resume = async () => {};
      close = async () => {};
    },
  );
  vi.stubGlobal(
    'AudioWorkletNode',
    class {
      port = { onmessage: null, postMessage: () => {} };
      constructor() {
        playback = this.port;
      }
      connect() {}
      disconnect() {}
    },
  );
  const audio = new BrowserAudio(),
    first = vi.fn(),
    second = vi.fn(),
    legacy = vi.fn();
  audio.onMouth = legacy;
  const offFirst = audio.subscribeMouth(first),
    offSecond = audio.subscribeMouth(second);
  await audio.unlock();
  playback!.onmessage!({ data: 0.12 });
  const energy = first.mock.lastCall![0];
  expect(energy).toBeGreaterThan(0);
  expect(second).toHaveBeenLastCalledWith(energy);
  expect(legacy).toHaveBeenLastCalledWith(energy);
  offFirst();
  audio.flush();
  expect(first).toHaveBeenLastCalledWith(energy);
  expect(second).toHaveBeenLastCalledWith(0);
  offSecond();
  await audio.dispose();
});

it('waits for a worklet drain acknowledgement and cancels pending advances on flush', async () => {
  let port: {
    onmessage: ((e: { data: unknown }) => void) | null;
    postMessage: ReturnType<typeof vi.fn>;
  };
  vi.stubGlobal(
    'AudioContext',
    class {
      state = 'running';
      destination = {};
      audioWorklet = { addModule: async () => {} };
      resume = async () => {};
    },
  );
  vi.stubGlobal(
    'AudioWorkletNode',
    class {
      port = { onmessage: null, postMessage: vi.fn() };
      constructor() {
        port = this.port;
      }
      connect() {}
    },
  );
  const audio = new BrowserAudio();
  await audio.unlock();
  let ended = false;
  const first = audio.whenPlaybackIdle().then((ok) => {
    ended = ok;
    return ok;
  });
  await Promise.resolve();
  expect(ended).toBe(false);
  const barrier = port!.postMessage.mock.lastCall![0].barrier;
  port!.onmessage!({ data: { idle: barrier } });
  expect(await first).toBe(true);
  const cancelled = audio.whenPlaybackIdle();
  audio.flush();
  expect(await cancelled).toBe(false);
});
