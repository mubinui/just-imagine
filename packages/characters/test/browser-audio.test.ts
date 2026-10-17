import { it, expect, vi, afterEach } from 'vitest';
import { BrowserAudio } from '../src/browser-audio';
import { runInNewContext } from 'node:vm';
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
  let playback: {
    onmessage: ((event: { data: { rms: number; generation: number } }) => void) | null;
  };
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
  playback!.onmessage!({ data: { rms: 0.12, generation: 0 } });
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
  port!.onmessage!({ data: { idle: barrier, generation: 0 } });
  expect(await first).toBe(true);
  const cancelled = audio.whenPlaybackIdle();
  audio.flush();
  expect(await cancelled).toBe(false);
});

it('versions actual worklet frames, energy, overflow and idle acknowledgements across flushes', async () => {
  type Port = { onmessage?: (event: { data: unknown }) => void; postMessage(data: unknown): void };
  type Processor = { port: Port; process(inputs: unknown[], outputs: Float32Array[][]): boolean };
  let moduleBlob!: Blob;
  const processors = new Map<string, new () => Processor>();
  const replies: unknown[] = [];
  let processor!: Processor;
  let mainPort!: Port;
  vi.stubGlobal('URL', {
    createObjectURL: (blob: Blob) => {
      moduleBlob = blob;
      return 'blob:worklet-test';
    },
    revokeObjectURL: () => {},
  });
  vi.stubGlobal(
    'AudioContext',
    class {
      state = 'running';
      destination = {};
      resume = async () => {};
      close = async () => {};
      audioWorklet = {
        addModule: async () => {
          runInNewContext(await moduleBlob.text(), {
            sampleRate: 48000,
            AudioWorkletProcessor: class {
              port: Port = { postMessage: (data) => replies.push(data) };
            },
            registerProcessor: (name: string, constructor: new () => Processor) =>
              processors.set(name, constructor),
          });
        },
      };
    },
  );
  vi.stubGlobal(
    'AudioWorkletNode',
    class {
      port: Port;
      constructor(_context: unknown, name: string) {
        const Constructor = processors.get(name)!;
        processor = new Constructor();
        this.port = mainPort = { postMessage: (data) => processor.port.onmessage?.({ data }) };
      }
      connect() {}
      disconnect() {}
    },
  );
  const audio = new BrowserAudio(),
    mouth = vi.fn(),
    error = vi.fn();
  audio.onMouth = mouth;
  audio.onPlaybackError = error;
  // A stop while worklet installation is pending must initialize the node to the current epoch.
  const unlocking = audio.unlock();
  audio.flush();
  await unlocking;
  const render = (blocks: number) => {
    for (let i = 0; i < blocks; i++) processor.process([], [[new Float32Array(128)]]);
  };
  const deliver = () => {
    for (const data of replies.splice(0)) mainPort.onmessage?.({ data });
  };
  audio.play(new Int16Array(3600).fill(12000).buffer);
  render(14);
  expect(replies.some((data) => (data as { rms?: number }).rms! > 0)).toBe(true);
  // Overflow belongs to the same old playback epoch, even if its notification is delayed.
  audio.play(new Int16Array(24000 * 30 + 1).buffer);
  audio.flush();
  deliver();
  expect(mouth).toHaveBeenLastCalledWith(0);
  expect(error).not.toHaveBeenCalled();
  audio.play(new Int16Array(960).fill(12000).buffer);
  let idle: boolean | undefined;
  const drained = audio.whenPlaybackIdle().then((finished) => {
    idle = finished;
    return finished;
  });
  render(3);
  deliver();
  await Promise.resolve();
  expect(idle).toBeUndefined();
  render(100);
  deliver();
  expect(await drained).toBe(true);
  expect(mouth.mock.calls.some(([value]) => value > 0)).toBe(true);
  const cancelled = audio.whenPlaybackIdle();
  render(1); // The acknowledgement is queued, but a subsequent flush must cancel it.
  audio.flush();
  deliver();
  expect(await cancelled).toBe(false);
  await audio.dispose();
});
