import {
  CUE_NAMES,
  FORMAT_MIME,
  MUSIC_LOOP_SECONDS,
  SOUND_FORMATS,
  cueUrls,
  isCueName,
  musicUrls,
  type CueName,
  type MusicTheme,
  type SoundFormat,
} from './manifest';

/**
 * The Web Audio mixer behind every sound in the Studio.
 *
 * Graph: cue sources -> gain [-> panner] -> cueBus -> master -> destination
 *        music source -> fade gain -> duck -> musicBus -> master -> destination
 *
 * - Nothing plays before `unlock()`, which must follow a pointer gesture.
 * - Buffers decode lazily on first use and are cached per cue and theme.
 * - `setSpeaking(true)` ducks the music bus to -12 dB within 100 ms and
 *   `setSpeaking(false)` brings it back over 600 ms (Review Focus 6).
 * - `setMuted(true)` is a hard, immediate mute of everything; cues requested
 *   while muted are dropped. `setReducedMotion(true)` silences only the bed.
 * - At most `maxVoices` cues sound at once; the oldest is stopped to make room.
 */
export interface CueOptions {
  /** 0..1 linear gain, default 1. */
  gain?: number;
  /** -1 (left) .. 1 (right), default 0. */
  pan?: number;
  /** Playback rate 0.25..4, default 1. */
  rate?: number;
}

export interface Mixer {
  unlock(): Promise<void>;
  preload(names?: readonly CueName[]): Promise<void>;
  playCue(name: CueName, opts?: CueOptions): void;
  /**
   * Plays a same-origin clip outside the cue pack (an animal's real call, the toy-phone ring),
   * given as a path without extension; resolves to its length in seconds, or 0 when silent.
   * An optional signal cancels only this playback, including a pending decode.
   */
  playClip(path: string, opts?: CueOptions & { signal?: AbortSignal }): Promise<number>;
  playMusic(theme: MusicTheme): void;
  stopMusic(): void;
  setSpeaking(speaking: boolean): void;
  setMuted(muted: boolean): void;
  setReducedMotion(reduced: boolean): void;
  dispose(): void;
}

export interface MixerOptions {
  /** Fetches an asset; defaults to `fetch`. Injected by tests. */
  load?: (url: string) => Promise<ArrayBuffer>;
  /** Whether the browser can decode a format; defaults to `<audio>.canPlayType`. */
  canPlay?: (format: SoundFormat) => boolean;
  /** Creates a context on unlock when none was injected; defaults to `new AudioContext()`. */
  createContext?: () => AudioContext | undefined;
  /** Maximum simultaneous cues, default 6. */
  maxVoices?: number;
}

export const DUCK_GAIN = Math.pow(10, -12 / 20);
export const DUCK_IN_SECONDS = 0.1;
export const DUCK_OUT_SECONDS = 0.6;
export const MAX_VOICES = 6;
const MUSIC_FADE_IN = 0.8;
const MUSIC_FADE_OUT = 0.5;
const CUE_STEAL_FADE = 0.02;

const clamp = (value: number, lo: number, hi: number, fallback: number) =>
  Number.isFinite(value) ? Math.min(hi, Math.max(lo, value)) : fallback;

function defaultLoad(url: string) {
  return fetch(url).then((response) => {
    if (!response.ok) throw new Error(`${response.status} ${url}`);
    return response.arrayBuffer();
  });
}

function defaultCanPlay(): (format: SoundFormat) => boolean {
  if (typeof document === 'undefined') return () => true;
  let probe: HTMLAudioElement | undefined;
  try {
    probe = document.createElement('audio');
  } catch {
    return () => true;
  }
  return (format) => probe!.canPlayType(FORMAT_MIME[format]) !== '';
}

function defaultCreateContext() {
  const Ctor = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext;
  return Ctor ? new Ctor() : undefined;
}

interface Voice {
  source: AudioBufferSourceNode;
  gain: GainNode;
  cleanup(): void;
}

interface Bed {
  theme: MusicTheme;
  source: AudioBufferSourceNode;
  gain: GainNode;
}

export function createMixer(context?: AudioContext, options: MixerOptions = {}): Mixer {
  const load = options.load ?? defaultLoad;
  const maxVoices = options.maxVoices ?? MAX_VOICES;
  let canPlay = options.canPlay;
  let ctx = context;
  let ownsContext = false;
  let graph: { master: GainNode; cueBus: GainNode; musicBus: GainNode; duck: GainNode } | undefined;
  let unlocked = false;
  let disposed = false;
  let speaking = false;
  let muted = false;
  let reducedMotion = false;
  let pendingTheme: MusicTheme | undefined;
  let bed: Bed | undefined;
  let loadingTheme: MusicTheme | undefined;
  let musicToken = 0;
  const voices: Voice[] = [];
  // Includes stolen voices while their short fade is finishing, so dispose cleans them too.
  const liveVoices = new Set<Voice>();
  const buffers = new Map<string, Promise<AudioBuffer | undefined>>();

  function ensureGraph() {
    if (graph || !ctx) return graph;
    const master = ctx.createGain();
    const cueBus = ctx.createGain();
    const musicBus = ctx.createGain();
    const duck = ctx.createGain();
    cueBus.connect(master);
    duck.connect(musicBus);
    musicBus.connect(master);
    master.connect(ctx.destination);
    graph = { master, cueBus, musicBus, duck };
    applyMute();
    applyReducedMotion();
    applyDuck();
    return graph;
  }

  function orderedFormats() {
    canPlay ??= defaultCanPlay();
    const playable = SOUND_FORMATS.filter((f) => canPlay!(f));
    const rest = SOUND_FORMATS.filter((f) => !playable.includes(f));
    return [...playable, ...rest];
  }

  function buffer(key: string, urls: (formats: readonly SoundFormat[]) => string[]) {
    let pending = buffers.get(key);
    if (!pending) {
      pending = (async () => {
        for (const url of urls(orderedFormats())) {
          try {
            const data = await load(url);
            if (!ctx) return undefined;
            return await ctx.decodeAudioData(data);
          } catch {
            continue;
          }
        }
        return undefined;
      })();
      buffers.set(key, pending);
    }
    return pending;
  }

  const cueBuffer = (name: CueName) => buffer(`cue:${name}`, (f) => cueUrls(name, f));
  const musicBuffer = (theme: MusicTheme) => buffer(`music:${theme}`, (f) => musicUrls(theme, f));

  function ready() {
    return !disposed && unlocked && !!ctx && !!graph;
  }

  function stopVoice(voice: Voice, fade: number) {
    const now = ctx!.currentTime;
    voice.gain.gain.cancelScheduledValues(now);
    voice.gain.gain.setValueAtTime(voice.gain.gain.value, now);
    voice.gain.gain.linearRampToValueAtTime(0, now + fade);
    try {
      voice.source.stop(now + fade);
    } catch {
      /* already stopped */
    }
  }

  function startCue(audio: AudioBuffer, opts: CueOptions, signal?: AbortSignal) {
    if (!ready() || muted || signal?.aborted) return;
    while (voices.length >= maxVoices) stopVoice(voices.shift()!, CUE_STEAL_FADE);
    const source = ctx!.createBufferSource();
    source.buffer = audio;
    source.playbackRate.value = clamp(opts.rate ?? 1, 0.25, 4, 1);
    const gain = ctx!.createGain();
    gain.gain.value = clamp(opts.gain ?? 1, 0, 1, 1);
    source.connect(gain);
    const pan = clamp(opts.pan ?? 0, -1, 1, 0);
    let tail: AudioNode = gain;
    if (pan !== 0 && typeof ctx!.createStereoPanner === 'function') {
      const panner = ctx!.createStereoPanner();
      panner.pan.value = pan;
      gain.connect(panner);
      tail = panner;
    }
    tail.connect(graph!.cueBus);
    const cleanup = () => {
      if (!liveVoices.delete(voice)) return;
      signal?.removeEventListener('abort', abort);
      source.onended = null;
      const index = voices.indexOf(voice);
      if (index >= 0) voices.splice(index, 1);
      source.disconnect();
      gain.disconnect();
      if (tail !== gain) tail.disconnect();
    };
    const abort = () => {
      try {
        source.stop(ctx!.currentTime);
      } catch {
        /* already stopped */
      }
      cleanup();
    };
    const voice: Voice = { source, gain, cleanup };
    voices.push(voice);
    liveVoices.add(voice);
    source.onended = cleanup;
    signal?.addEventListener('abort', abort, { once: true });
    source.start(ctx!.currentTime);
    return voice;
  }

  function fadeOutBed(current: Bed, seconds: number) {
    const now = ctx!.currentTime;
    current.gain.gain.cancelScheduledValues(now);
    current.gain.gain.setValueAtTime(current.gain.gain.value, now);
    current.gain.gain.linearRampToValueAtTime(0, now + seconds);
    try {
      current.source.stop(now + seconds);
    } catch {
      /* already stopped */
    }
  }

  async function startMusic(theme: MusicTheme) {
    const token = ++musicToken;
    loadingTheme = theme;
    const audio = await musicBuffer(theme);
    if (loadingTheme === theme) loadingTheme = undefined;
    if (token !== musicToken || !audio || !ready()) return;
    if (bed) fadeOutBed(bed, MUSIC_FADE_OUT);
    const now = ctx!.currentTime;
    const source = ctx!.createBufferSource();
    source.buffer = audio;
    source.loop = true;
    source.loopStart = 0;
    source.loopEnd = Math.min(audio.duration, MUSIC_LOOP_SECONDS[theme]);
    const gain = ctx!.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(1, now + MUSIC_FADE_IN);
    source.connect(gain);
    gain.connect(graph!.duck);
    const next: Bed = { theme, source, gain };
    source.onended = () => {
      source.disconnect();
      gain.disconnect();
      if (bed === next) bed = undefined;
    };
    source.start(now);
    bed = next;
  }

  function applyDuck() {
    if (!graph || !ctx) return;
    const now = ctx.currentTime;
    const param = graph.duck.gain;
    param.cancelScheduledValues(now);
    param.setValueAtTime(param.value, now);
    param.linearRampToValueAtTime(
      speaking ? DUCK_GAIN : 1,
      now + (speaking ? DUCK_IN_SECONDS : DUCK_OUT_SECONDS),
    );
  }

  function applyMute() {
    if (!graph || !ctx) return;
    const now = ctx.currentTime;
    graph.master.gain.cancelScheduledValues(now);
    graph.master.gain.setValueAtTime(muted ? 0 : 1, now);
  }

  function applyReducedMotion() {
    if (!graph || !ctx) return;
    const now = ctx.currentTime;
    graph.musicBus.gain.cancelScheduledValues(now);
    graph.musicBus.gain.setValueAtTime(reducedMotion ? 0 : 1, now);
  }

  return {
    async unlock() {
      if (disposed) return;
      if (!ctx) {
        ctx = (options.createContext ?? defaultCreateContext)();
        ownsContext = !!ctx;
      }
      if (!ctx) return;
      ensureGraph();
      if (ctx.state === 'suspended') {
        try {
          await ctx.resume();
        } catch {
          /* no gesture yet; stay locked */
        }
      }
      if (ctx.state !== 'running' || disposed) return;
      unlocked = true;
      if (pendingTheme && !bed && loadingTheme !== pendingTheme) void startMusic(pendingTheme);
    },
    async preload(names = CUE_NAMES) {
      if (!ready()) return;
      await Promise.all(names.filter(isCueName).map(cueBuffer));
    },
    playCue(name, opts = {}) {
      if (!ready() || muted || !isCueName(name)) return;
      void cueBuffer(name).then((audio) => {
        if (audio) startCue(audio, opts);
      });
    },
    async playClip(path, opts = {}) {
      if (
        !ready() ||
        muted ||
        opts.signal?.aborted ||
        !/^\/(?:[a-z0-9_-]+\/)*[a-z0-9_-]+$/.test(path)
      )
        return 0;
      const audio = await buffer(`clip:${path}`, (formats) => formats.map((f) => `${path}.${f}`));
      if (!audio || opts.signal?.aborted) return 0;
      return startCue(audio, opts, opts.signal)
        ? audio.duration / clamp(opts.rate ?? 1, 0.25, 4, 1)
        : 0;
    },
    playMusic(theme) {
      pendingTheme = theme;
      if (!ready()) return;
      if (bed?.theme === theme || loadingTheme === theme) return;
      void startMusic(theme);
    },
    stopMusic() {
      pendingTheme = undefined;
      loadingTheme = undefined;
      musicToken++;
      if (bed && ctx) fadeOutBed(bed, MUSIC_FADE_OUT);
      bed = undefined;
    },
    setSpeaking(value) {
      if (value === speaking) return;
      speaking = value;
      applyDuck();
    },
    setMuted(value) {
      if (value === muted) return;
      muted = value;
      applyMute();
    },
    setReducedMotion(value) {
      if (value === reducedMotion) return;
      reducedMotion = value;
      applyReducedMotion();
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      unlocked = false;
      musicToken++;
      if (ctx) {
        for (const voice of liveVoices) {
          try {
            voice.source.stop(ctx.currentTime);
          } catch {
            /* already stopped */
          }
          voice.cleanup();
        }
        if (bed) {
          try {
            bed.source.stop(ctx.currentTime);
          } catch {
            /* already stopped */
          }
          bed = undefined;
        }
        graph?.master.disconnect();
        if (ownsContext) void ctx.close().catch(() => {});
      }
      buffers.clear();
    },
  };
}
