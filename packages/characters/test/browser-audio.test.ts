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
