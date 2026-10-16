#!/usr/bin/env node
/**
 * Synthesises the Just Imagine sound pack and the placeholder music beds.
 *
 *   node scripts/make-sounds.mjs              forty cues -> public/sound/<name>.{ogg,m4a}
 *   node scripts/make-sounds.mjs --music      six loops  -> public/music/<theme>.{ogg,m4a}
 *   node scripts/make-sounds.mjs --provenance docs/art/sound-provenance.md
 *   node scripts/make-sounds.mjs --all        all of the above
 *
 * Every sample is built here from oscillators, seeded noise, filters and
 * envelopes. Nothing is downloaded and no third-party material is used. Audio
 * is rendered at 44.1 kHz, written as 16-bit WAV and transcoded with ffmpeg
 * (Opus in Ogg, AAC in M4A) when ffmpeg is on PATH; otherwise the WAV ships.
 */
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const SAMPLE_RATE = 44100;
const TAU = Math.PI * 2;

// ---------------------------------------------------------------------------
// Deterministic randomness: every cue renders byte-identically on every run.
// ---------------------------------------------------------------------------
function seedOf(name) {
  let h = 2166136261;
  for (const c of name) {
    h ^= c.charCodeAt(0);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---------------------------------------------------------------------------
// Building blocks. Signals are Float32Array at SAMPLE_RATE; envelopes and
// frequency arguments may be numbers or functions of time in seconds.
// ---------------------------------------------------------------------------
const samples = (seconds) => Math.round(seconds * SAMPLE_RATE);
const at = (value, t) => (typeof value === 'function' ? value(t) : value);
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));

function waveform(wave, p) {
  switch (wave) {
    case 'triangle':
      return 1 - 4 * Math.abs(p - 0.5);
    case 'saw':
      return 2 * p - 1;
    case 'square':
      return p < 0.5 ? 1 : -1;
    default:
      return Math.sin(TAU * p);
  }
}

/** An oscillator with a fixed or time-varying frequency. */
export function tone(seconds, freq, wave = 'sine') {
  const out = new Float32Array(samples(seconds));
  let phase = 0;
  for (let i = 0; i < out.length; i++) {
    phase += at(freq, i / SAMPLE_RATE) / SAMPLE_RATE;
    phase -= Math.floor(phase);
    out[i] = waveform(wave, phase);
  }
  return out;
}

export function noise(seconds, seed) {
  const r = rng(seed);
  const out = new Float32Array(samples(seconds));
  for (let i = 0; i < out.length; i++) out[i] = r() * 2 - 1;
  return out;
}

/** Exponential glide from `a` to `b` over `seconds`, holding `b` afterwards. */
const glide = (a, b, seconds) => (t) => a * Math.pow(b / a, clamp(t / seconds, 0, 1));
/** Exponential decay reaching about -43 dB at `seconds`. */
const decay =
  (seconds, curve = 5) =>
  (t) =>
    Math.exp((-curve * t) / seconds);
/** Linear attack, decay to sustain, hold, linear release. */
const adsr = (a, d, s, r, total) => (t) => {
  if (t < a) return t / a;
  if (t < a + d) return 1 - (1 - s) * ((t - a) / d);
  if (t < total - r) return s;
  return s * clamp((total - t) / r, 0, 1);
};
/** A smooth hump that rises and falls over `seconds`. */
const swell =
  (seconds, power = 2) =>
  (t) =>
    Math.sin(Math.PI * clamp(t / seconds, 0, 1)) ** power;

export function shape(signal, env) {
  for (let i = 0; i < signal.length; i++) signal[i] *= at(env, i / SAMPLE_RATE);
  return signal;
}
function scale(signal, gain) {
  for (let i = 0; i < signal.length; i++) signal[i] *= gain;
  return signal;
}
/** Adds `source` into `target` starting at `offsetSeconds`, growing the target if needed. */
function place(target, source, offsetSeconds = 0, gain = 1) {
  const start = samples(offsetSeconds);
  const needed = start + source.length;
  const out = needed > target.length ? grow(target, needed) : target;
  for (let i = 0; i < source.length; i++) out[start + i] += source[i] * gain;
  return out;
}
function grow(signal, length) {
  const out = new Float32Array(length);
  out.set(signal);
  return out;
}
function mix(...parts) {
  let out = new Float32Array(0);
  for (const [signal, gain = 1, offset = 0] of parts) out = place(out, signal, offset, gain);
  return out;
}

/** One-pole lowpass, `passes` times (6 dB per pass per octave). */
export function lowpass(signal, cutoff, passes = 2) {
  const dt = 1 / SAMPLE_RATE;
  for (let pass = 0; pass < passes; pass++) {
    let y = 0;
    for (let i = 0; i < signal.length; i++) {
      const rc = 1 / (TAU * clamp(at(cutoff, i / SAMPLE_RATE), 10, 20000));
      const alpha = dt / (rc + dt);
      y += alpha * (signal[i] - y);
      signal[i] = y;
    }
  }
  return signal;
}
export function highpass(signal, cutoff, passes = 1) {
  const dt = 1 / SAMPLE_RATE;
  for (let pass = 0; pass < passes; pass++) {
    let y = 0,
      prev = 0;
    for (let i = 0; i < signal.length; i++) {
      const rc = 1 / (TAU * clamp(at(cutoff, i / SAMPLE_RATE), 10, 20000));
      const alpha = rc / (rc + dt);
      const x = signal[i];
      y = alpha * (y + x - prev);
      prev = x;
      signal[i] = y;
    }
  }
  return signal;
}
/** RBJ band-pass biquad with a fixed or sweeping centre; coefficients refresh every 32 samples. */
export function bandpass(signal, center, q = 1) {
  let b0 = 0,
    b2 = 0,
    a1 = 0,
    a2 = 0;
  const refresh = (t) => {
    const w0 = (TAU * clamp(at(center, t), 20, 20000)) / SAMPLE_RATE;
    const alpha = Math.sin(w0) / (2 * q);
    const a0 = 1 + alpha;
    b0 = alpha / a0;
    b2 = -alpha / a0;
    a1 = (-2 * Math.cos(w0)) / a0;
    a2 = (1 - alpha) / a0;
  };
  let x1 = 0,
    x2 = 0,
    y1 = 0,
    y2 = 0;
  for (let i = 0; i < signal.length; i++) {
    if (i % 32 === 0) refresh(i / SAMPLE_RATE);
    const x = signal[i];
    const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    signal[i] = y;
  }
  return signal;
}
/** Feedback delay for shimmer tails. */
function echo(signal, seconds, feedback = 0.35, wet = 0.3) {
  const d = samples(seconds);
  const line = new Float32Array(signal.length);
  const out = new Float32Array(signal.length);
  for (let i = 0; i < signal.length; i++) {
    const delayed = i >= d ? line[i - d] : 0;
    line[i] = signal[i] + feedback * delayed;
    out[i] = signal[i] + wet * delayed;
  }
  return out;
}
function softClip(signal, drive = 1) {
  for (let i = 0; i < signal.length; i++) signal[i] = Math.tanh(signal[i] * drive);
  return signal;
}
function normalize(signal, peak = 0.9) {
  let max = 0;
  for (const s of signal) max = Math.max(max, Math.abs(s));
  if (max > 0) scale(signal, peak / max);
  return signal;
}
function fadeEdges(signal, inSeconds, outSeconds) {
  const n = samples(inSeconds),
    m = samples(outSeconds);
  for (let i = 0; i < Math.min(n, signal.length); i++) signal[i] *= i / n;
  for (let i = 0; i < Math.min(m, signal.length); i++) signal[signal.length - 1 - i] *= i / m;
  return signal;
}
function fit(signal, seconds) {
  const n = samples(seconds);
  return signal.length === n ? signal : signal.length > n ? signal.slice(0, n) : grow(signal, n);
}

/** Karplus-Strong plucked string. `damping` near 1 rings longer; `soft` pre-filters the burst. */
export function pluck(freq, seconds, seed, { damping = 0.996, soft = 0 } = {}) {
  const n = samples(seconds);
  const out = new Float32Array(n);
  const period = Math.max(2, Math.round(SAMPLE_RATE / freq));
  const line = noise(period / SAMPLE_RATE, seed);
  if (soft > 0) lowpass(line, 8000 * (1 - soft) + 800, 1);
  let idx = 0;
  for (let i = 0; i < n; i++) {
    const cur = line[idx];
    const next = line[(idx + 1) % period];
    out[i] = cur;
    line[idx] = damping * 0.5 * (cur + next);
    idx = (idx + 1) % period;
  }
  return out;
}

/** A struck bell: a fundamental with gently inharmonic partials. */
function bell(freq, seconds, partials = [1, 0.35, 0.12], ratios = [1, 2.0, 3.43]) {
  let out = new Float32Array(samples(seconds));
  partials.forEach((level, i) => {
    const partial = shape(tone(seconds, freq * ratios[i]), decay(seconds / (1 + i * 0.6)));
    out = place(out, partial, 0, level);
  });
  return out;
}
/** A few musical notes struck in sequence. */
function sequence(notes, spacing, noteSeconds, wave = 'sine', partial = 0.25) {
  let out = new Float32Array(0);
  notes.forEach((freq, i) => {
    const t = i * spacing;
    out = place(out, shape(tone(noteSeconds, freq, wave), decay(noteSeconds)), t, 1);
    out = place(
      out,
      shape(tone(noteSeconds * 0.7, freq * 2), decay(noteSeconds * 0.7)),
      t,
      partial,
    );
  });
  return out;
}
const NOTE = (name) => {
  const names = { C: -9, D: -7, E: -5, F: -4, G: -2, A: 0, B: 2 };
  const m = /^([A-G])(#?)(\d)$/.exec(name);
  const semis = names[m[1]] + (m[2] ? 1 : 0) + (Number(m[3]) - 4) * 12;
  return 440 * Math.pow(2, semis / 12);
};

// ---------------------------------------------------------------------------
// Cue recipes. `seconds` is the shipped length; `peak` the normalised level
// (quiet ambience and soft variants sit lower); `recipe` is the provenance text.
// ---------------------------------------------------------------------------
const thump = (seconds, from, to, glideSeconds, seed, noiseCut, noiseSeconds) =>
  mix(
    [shape(tone(seconds, glide(from, to, glideSeconds)), decay(seconds))],
    [shape(lowpass(noise(noiseSeconds, seed), noiseCut), decay(noiseSeconds)), 0.5],
  );

export const CUES = {
  boing: {
    seconds: 0.45,
    recipe:
      'triangle 320 to 90 Hz exponential glide over 0.35 s with a 14 Hz vibrato that fades; lowpass 2.5 kHz; exponential decay over 0.45 s',
    render: () =>
      shape(
        lowpass(
          tone(
            0.45,
            (t) => glide(320, 90, 0.35)(t) * (1 + 0.06 * Math.sin(TAU * 14 * t) * Math.exp(-3 * t)),
            'triangle',
          ),
          2500,
        ),
        decay(0.45),
      ),
  },
  splat: {
    seconds: 0.25,
    recipe:
      'white noise burst lowpassed at 700 Hz decaying over 0.12 s, plus a sine thump 140 to 50 Hz over 0.15 s; tanh soft clip',
    render: () => softClip(thump(0.25, 140, 50, 0.15, seedOf('splat'), 700, 0.12), 1.6),
  },
  splash: {
    seconds: 0.55,
    recipe:
      'band-passed noise sweeping 1.8 kHz to 600 Hz (Q 0.8) with a 20 ms attack and 0.45 s decay, three rising sine bubble chirps 500 to 1300 Hz, and a 150 to 60 Hz thump',
    render: () => {
      const r = rng(seedOf('splash'));
      let out = shape(
        bandpass(noise(0.55, seedOf('splash-noise')), glide(1800, 600, 0.4), 0.8),
        adsr(0.02, 0.1, 0.6, 0.3, 0.55),
      );
      for (const t of [0.08, 0.17, 0.3]) {
        const f0 = 500 + r() * 200;
        out = place(out, shape(tone(0.07, glide(f0, f0 * 2.6, 0.06)), decay(0.07)), t, 0.35);
      }
      return place(out, shape(tone(0.12, glide(150, 60, 0.1)), decay(0.12)), 0, 0.6);
    },
  },
  whoosh: {
    seconds: 0.45,
    recipe:
      'band-passed noise (Q 1.2) whose centre rises 400 Hz to 2.4 kHz over 0.2 s then falls to 700 Hz; sine-squared swell envelope',
    render: () =>
      shape(
        bandpass(
          noise(0.45, seedOf('whoosh')),
          (t) => (t < 0.2 ? glide(400, 2400, 0.2)(t) : glide(2400, 700, 0.25)(t - 0.2)),
          1.2,
        ),
        swell(0.45),
      ),
  },
  ding: {
    seconds: 0.65,
    recipe:
      'bell at 1320 Hz with partials at 2x (0.35) and 3.43x (0.12) decaying over 0.65, 0.4 and 0.25 s; 5 ms high-passed noise strike',
    render: () =>
      mix(
        [bell(1320, 0.65)],
        [shape(highpass(noise(0.01, seedOf('ding')), 3000), decay(0.005)), 0.4],
      ),
  },
  pop: {
    seconds: 0.11,
    recipe: 'sine 520 to 140 Hz over 50 ms decaying over 70 ms, plus a 3 ms noise click',
    render: () =>
      mix(
        [shape(tone(0.11, glide(520, 140, 0.05)), decay(0.07))],
        [shape(noise(0.005, seedOf('pop')), decay(0.003)), 0.4],
      ),
  },
  pop_soft: {
    seconds: 0.14,
    peak: 0.6,
    recipe: 'sine 380 to 160 Hz over 70 ms decaying over 0.1 s, lowpassed at 1.2 kHz',
    render: () => lowpass(shape(tone(0.14, glide(380, 160, 0.07)), decay(0.1)), 1200),
  },
  thud: {
    seconds: 0.28,
    recipe:
      'sine 120 to 45 Hz over 0.12 s decaying over 0.28 s, plus lowpassed (400 Hz) noise decaying over 40 ms; light soft clip',
    render: () => softClip(thump(0.28, 120, 45, 0.12, seedOf('thud'), 400, 0.04), 1.3),
  },
  thud_big: {
    seconds: 0.5,
    recipe:
      'sine 85 to 30 Hz over 0.25 s decaying over 0.5 s, 40 Hz sub decaying over 0.4 s, lowpassed (250 Hz) noise over 80 ms; heavier soft clip',
    render: () =>
      softClip(
        mix(
          [thump(0.5, 85, 30, 0.25, seedOf('thud_big'), 250, 0.08)],
          [shape(tone(0.4, 40), decay(0.4)), 0.4],
        ),
        1.8,
      ),
  },
  chime: {
    seconds: 1.0,
    recipe:
      'bells C6, E6, G6 struck 70 ms apart, each with 2x and 3.43x partials, decaying over 0.8 s',
    render: () => {
      let out = new Float32Array(0);
      ['C6', 'E6', 'G6'].forEach((n, i) => {
        out = place(out, bell(NOTE(n), 0.8), i * 0.07, 1);
      });
      return out;
    },
  },
  chime_magic: {
    seconds: 1.3,
    recipe:
      'bell arpeggio C6 E6 G6 B6 D7 at 55 ms spacing, a high-passed (5 kHz) noise shimmer decaying over 0.5 s, through a 110 ms feedback delay (0.35, wet 0.3)',
    render: () => {
      let out = new Float32Array(0);
      ['C6', 'E6', 'G6', 'B6', 'D7'].forEach((n, i) => {
        out = place(out, bell(NOTE(n), 0.9), i * 0.055, 0.8);
      });
      out = place(
        out,
        shape(highpass(noise(0.5, seedOf('chime_magic')), 5000), decay(0.5)),
        0,
        0.12,
      );
      return echo(fit(out, 1.3), 0.11, 0.35, 0.3);
    },
  },
  sparkle: {
    seconds: 0.6,
    recipe: 'eight sine blips at random pitches 4 to 8 kHz across 0.5 s, each decaying over 80 ms',
    render: () => {
      const r = rng(seedOf('sparkle'));
      let out = new Float32Array(samples(0.6));
      for (let i = 0; i < 8; i++) {
        const f = 4000 + r() * 4000;
        out = place(out, shape(tone(0.08, f), decay(0.08)), r() * 0.5, 0.5);
      }
      return out;
    },
  },
  confetti: {
    seconds: 0.7,
    recipe:
      'seven band-passed noise pops (random centres 1.5 to 4 kHz, Q 2, 40 ms decay) scattered over 0.5 s with a rising sine 1760 to 2640 Hz over 0.3 s',
    render: () => {
      const r = rng(seedOf('confetti'));
      let out = new Float32Array(samples(0.7));
      for (let i = 0; i < 7; i++) {
        const pop = shape(
          bandpass(noise(0.06, seedOf(`confetti-${i}`)), 1500 + r() * 2500, 2),
          decay(0.04),
        );
        out = place(out, pop, r() * 0.5, 1);
      }
      return place(out, shape(tone(0.4, glide(1760, 2640, 0.3)), decay(0.4)), 0.05, 0.25);
    },
  },
  tick: {
    seconds: 0.05,
    recipe: 'sine 1.9 kHz decaying over 25 ms plus high-passed (2.5 kHz) noise over 10 ms',
    render: () =>
      mix(
        [shape(tone(0.05, 1900), decay(0.025))],
        [shape(highpass(noise(0.02, seedOf('tick')), 2500), decay(0.01)), 0.5],
      ),
  },
  tock: {
    seconds: 0.07,
    recipe: 'sine 900 Hz decaying over 40 ms plus lowpassed (1.5 kHz) noise over 15 ms',
    render: () =>
      mix(
        [shape(tone(0.07, 900), decay(0.04))],
        [shape(lowpass(noise(0.03, seedOf('tock')), 1500), decay(0.015)), 0.5],
      ),
  },
  swoosh_up: {
    seconds: 0.4,
    recipe:
      'band-passed noise (Q 1.5) centre gliding 300 Hz to 4 kHz over 0.35 s with a swell envelope',
    render: () =>
      shape(bandpass(noise(0.4, seedOf('swoosh_up')), glide(300, 4000, 0.35), 1.5), swell(0.4)),
  },
  swoosh_down: {
    seconds: 0.4,
    recipe:
      'band-passed noise (Q 1.5) centre gliding 4 kHz to 300 Hz over 0.35 s with a swell envelope',
    render: () =>
      shape(bandpass(noise(0.4, seedOf('swoosh_down')), glide(4000, 300, 0.35), 1.5), swell(0.4)),
  },
  bubble: {
    seconds: 0.14,
    recipe: 'sine gliding 600 Hz to 1.5 kHz over 90 ms, 5 ms attack, decaying over 0.1 s',
    render: () => shape(tone(0.14, glide(600, 1500, 0.09)), adsr(0.005, 0.1, 0.05, 0.02, 0.14)),
  },
  drip: {
    seconds: 0.22,
    recipe: 'sine chirp 1.9 kHz to 1 kHz over 30 ms, then a 420 to 560 Hz bloom over 0.15 s',
    render: () =>
      mix(
        [shape(tone(0.05, glide(1900, 1000, 0.03)), decay(0.04))],
        [shape(tone(0.18, glide(420, 560, 0.15)), adsr(0.01, 0.05, 0.5, 0.1, 0.18)), 0.8, 0.04],
      ),
  },
  rustle: {
    seconds: 0.4,
    recipe:
      'high-passed (1.8 kHz) noise with a random crackle envelope of twelve short bursts, decaying over 0.4 s',
    render: () => {
      const r = rng(seedOf('rustle-env'));
      const bursts = Array.from({ length: 12 }, () => [r() * 0.35, 0.01 + r() * 0.04]);
      const env = (t) =>
        bursts.reduce((a, [s, w]) => a + (t >= s && t < s + w ? 1 : 0), 0.15) * decay(0.4)(t);
      return shape(highpass(noise(0.4, seedOf('rustle')), 1800), env);
    },
  },
  click: {
    seconds: 0.03,
    recipe: 'sine 3.2 kHz decaying over 12 ms plus high-passed (4 kHz) noise over 4 ms',
    render: () =>
      mix(
        [shape(tone(0.03, 3200), decay(0.012))],
        [shape(highpass(noise(0.01, seedOf('click')), 4000), decay(0.004)), 0.6],
      ),
  },
  tap: {
    seconds: 0.07,
    recipe: 'sine 1.25 kHz decaying over 45 ms plus band-passed (2 kHz) noise over 10 ms',
    render: () =>
      mix(
        [shape(tone(0.07, 1250), decay(0.045))],
        [shape(bandpass(noise(0.02, seedOf('tap')), 2000, 1), decay(0.01)), 0.5],
      ),
  },
  tap_soft: {
    seconds: 0.08,
    peak: 0.6,
    recipe: 'sine 900 Hz decaying over 60 ms, lowpassed at 2 kHz',
    render: () => lowpass(shape(tone(0.08, 900), decay(0.06)), 2000),
  },
  select: {
    seconds: 0.22,
    recipe: 'sines E5 then A5 70 ms apart with an octave partial, each decaying over 0.12 s',
    render: () => sequence([NOTE('E5'), NOTE('A5')], 0.07, 0.12),
  },
  deselect: {
    seconds: 0.22,
    recipe: 'sines A5 then E5 70 ms apart with an octave partial, each decaying over 0.12 s',
    render: () => sequence([NOTE('A5'), NOTE('E5')], 0.07, 0.12),
  },
  open: {
    seconds: 0.24,
    recipe:
      'sine gliding 420 to 840 Hz over 0.18 s (ADSR 10/50 ms, 0.7, 80 ms) with band-passed noise rising 800 Hz to 2 kHz',
    render: () =>
      mix(
        [shape(tone(0.24, glide(420, 840, 0.18)), adsr(0.01, 0.05, 0.7, 0.08, 0.24))],
        [shape(bandpass(noise(0.24, seedOf('open')), glide(800, 2000, 0.2), 1), swell(0.24)), 0.2],
      ),
  },
  close: {
    seconds: 0.24,
    recipe:
      'sine gliding 840 to 420 Hz over 0.18 s (ADSR 10/50 ms, 0.7, 80 ms) with band-passed noise falling 2 kHz to 800 Hz',
    render: () =>
      mix(
        [shape(tone(0.24, glide(840, 420, 0.18)), adsr(0.01, 0.05, 0.7, 0.08, 0.24))],
        [shape(bandpass(noise(0.24, seedOf('close')), glide(2000, 800, 0.2), 1), swell(0.24)), 0.2],
      ),
  },
  success: {
    seconds: 0.75,
    recipe:
      'triangle and sine blend C5 E5 G5 C6 at 90 ms spacing, decaying over 0.3 s, the last over 0.5 s',
    render: () => {
      let out = new Float32Array(0);
      ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => {
        const len = i === 3 ? 0.5 : 0.3;
        out = place(out, shape(tone(len, NOTE(n), 'triangle'), decay(len)), i * 0.09, 0.6);
        out = place(out, shape(tone(len, NOTE(n)), decay(len)), i * 0.09, 0.6);
      });
      return out;
    },
  },
  fail_soft: {
    seconds: 0.55,
    peak: 0.7,
    recipe: 'triangle E4 (0.25 s decay) then C4 (0.35 s decay) 180 ms apart, lowpassed at 1.5 kHz',
    render: () =>
      lowpass(
        mix(
          [shape(tone(0.25, NOTE('E4'), 'triangle'), decay(0.25))],
          [shape(tone(0.37, NOTE('C4'), 'triangle'), decay(0.35)), 1, 0.18],
        ),
        1500,
      ),
  },
  level_up: {
    seconds: 1.1,
    recipe:
      'run C5 D5 E5 G5 C6 E6 at 70 ms spacing (0.25 s decays) into a C6 E6 G6 bell chord at 0.42 s decaying over 0.6 s, with a 90 ms shimmer delay',
    render: () => {
      let out = sequence(['C5', 'D5', 'E5', 'G5', 'C6', 'E6'].map(NOTE), 0.07, 0.25, 'triangle');
      for (const n of ['C6', 'E6', 'G6']) out = place(out, bell(NOTE(n), 0.6), 0.42, 0.6);
      return echo(fit(out, 1.1), 0.09, 0.3, 0.25);
    },
  },
  star: {
    seconds: 0.55,
    recipe:
      'bell at 2.2 kHz with a 2 percent upward bend over 50 ms, 2x and 3x partials, decaying over 0.45 s, through a 70 ms shimmer delay',
    render: () => {
      let out = new Float32Array(0);
      [1, 0.3, 0.1].forEach((level, i) => {
        const ratio = i + 1;
        const partial = shape(
          tone(0.45, (t) => 2200 * ratio * (1 + 0.02 * clamp(t / 0.05, 0, 1))),
          decay(0.45 / (1 + i * 0.5)),
        );
        out = place(out, partial, 0, level);
      });
      return echo(fit(out, 0.55), 0.07, 0.3, 0.25);
    },
  },
  star_3: {
    seconds: 0.9,
    recipe: 'three star bells at 1760, 2200 and 2640 Hz struck 150 ms apart',
    render: () => {
      let out = new Float32Array(0);
      [1760, 2200, 2640].forEach((f, i) => {
        out = place(out, bell(f, 0.5, [1, 0.3, 0.1], [1, 2, 3]), i * 0.15, 1);
      });
      return echo(fit(out, 0.9), 0.07, 0.3, 0.2);
    },
  },
  drumroll_short: {
    seconds: 0.85,
    recipe:
      'lowpassed (1.8 kHz) noise hits accelerating from 18 to 36 per second over 0.6 s under a rising envelope, ending in a 110 to 50 Hz thump',
    render: () => {
      let out = new Float32Array(samples(0.85));
      let t = 0,
        i = 0;
      while (t < 0.6) {
        const hit = shape(lowpass(noise(0.04, seedOf(`roll-${i}`)), 1800), decay(0.02));
        out = place(out, hit, t, 0.4 + (0.6 * t) / 0.6);
        t += 1 / (18 + (18 * t) / 0.6);
        i++;
      }
      return place(out, thump(0.25, 110, 50, 0.12, seedOf('roll-end'), 500, 0.05), 0.6, 1);
    },
  },
  wind_gust: {
    seconds: 1.5,
    peak: 0.6,
    recipe:
      'band-passed noise (Q 0.6) with the centre wandering 500 to 1100 Hz on a slow sine, under a sine-squared swell over 1.5 s',
    render: () =>
      shape(
        bandpass(
          noise(1.5, seedOf('wind_gust')),
          (t) => 800 + 300 * Math.sin(TAU * 0.4 * t) + 200 * Math.sin(TAU * 1.3 * t),
          0.6,
        ),
        swell(1.5, 1.5),
      ),
  },
  rain_soft: {
    seconds: 1.5,
    peak: 0.5,
    recipe:
      'band-passed (3 kHz, Q 0.5) noise bed fading in and out over 0.3 s, with eighteen random sine drips 2.5 kHz to 1.2 kHz decaying over 30 ms',
    render: () => {
      const r = rng(seedOf('rain_soft'));
      let out = shape(
        bandpass(noise(1.5, seedOf('rain-bed')), 3000, 0.5),
        adsr(0.3, 0.1, 1, 0.3, 1.5),
      );
      for (let i = 0; i < 18; i++) {
        const f = 2000 + r() * 1200;
        out = place(out, shape(tone(0.04, glide(f, f * 0.5, 0.03)), decay(0.03)), r() * 1.4, 0.35);
      }
      return out;
    },
  },
  snow_soft: {
    seconds: 1.5,
    peak: 0.45,
    recipe:
      'lowpassed (900 Hz) noise with slow 0.7 Hz swells fading over 0.4 s, with four soft sine blips between 2.5 and 3.5 kHz decaying over 0.15 s',
    render: () => {
      const r = rng(seedOf('snow_soft'));
      let out = shape(
        lowpass(noise(1.5, seedOf('snow-bed')), 900),
        (t) => (0.6 + 0.4 * Math.sin(TAU * 0.7 * t)) * adsr(0.4, 0.1, 1, 0.4, 1.5)(t),
      );
      for (let i = 0; i < 4; i++)
        out = place(out, shape(tone(0.15, 2500 + r() * 1000), decay(0.15)), 0.2 + r() * 1.1, 0.12);
      return out;
    },
  },
  launch: {
    seconds: 0.5,
    recipe:
      'saw gliding 150 to 900 Hz over 0.45 s under a lowpass opening 600 Hz to 4 kHz (ADSR 20/100 ms, 0.8, 100 ms), with band-passed noise rising 500 Hz to 3 kHz',
    render: () =>
      mix(
        [
          shape(
            lowpass(tone(0.5, glide(150, 900, 0.45), 'saw'), glide(600, 4000, 0.45)),
            adsr(0.02, 0.1, 0.8, 0.1, 0.5),
          ),
        ],
        [shape(bandpass(noise(0.5, seedOf('launch')), glide(500, 3000, 0.45), 1), swell(0.5)), 0.5],
      ),
  },
  land: {
    seconds: 0.3,
    recipe:
      'sine 130 to 50 Hz thump decaying over 0.15 s with lowpassed (900 Hz) noise over 50 ms, then a smaller 200 to 90 Hz bounce at 120 ms',
    render: () =>
      mix(
        [thump(0.2, 130, 50, 0.1, seedOf('land'), 900, 0.05)],
        [shape(tone(0.1, glide(200, 90, 0.08)), decay(0.08)), 0.4, 0.12],
      ),
  },
  draw_start: {
    seconds: 0.14,
    recipe:
      'high-passed (2.5 kHz) noise scratch decaying over 0.1 s with a sine blip rising 500 to 900 Hz',
    render: () =>
      mix(
        [shape(highpass(noise(0.14, seedOf('draw_start')), 2500), decay(0.1)), 0.6],
        [shape(tone(0.1, glide(500, 900, 0.06)), decay(0.08))],
      ),
  },
  draw_end: {
    seconds: 0.16,
    recipe:
      'high-passed (2.5 kHz) noise scratch decaying over 0.1 s with a sine blip falling 900 to 450 Hz',
    render: () =>
      mix(
        [shape(highpass(noise(0.16, seedOf('draw_end')), 2500), decay(0.1)), 0.6],
        [shape(tone(0.12, glide(900, 450, 0.08)), decay(0.1))],
      ),
  },
};

/**
 * Renders a cue to a mono Float32Array of exactly `CUES[name].seconds`.
 * @param {string} name
 * @returns {Float32Array}
 */
export function renderCue(name) {
  const cue = CUES[name];
  if (!cue) throw new Error(`Unknown cue ${name}`);
  const signal = fit(cue.render(), cue.seconds);
  return fadeEdges(normalize(signal, cue.peak ?? 0.9), 0.002, 0.012);
}

// ---------------------------------------------------------------------------
// Music beds: layered pads, plucks and bass over a chord progression whose
// beats sum to the loop. Tails wrap to the start so the loop is seamless.
// ---------------------------------------------------------------------------
const CHORD = {
  I: [0, 4, 7],
  I7: [0, 4, 7, 11],
  ii: [2, 5, 9],
  ii7: [2, 5, 9, 12],
  IV: [5, 9, 12],
  IV7: [5, 9, 12, 16],
  V: [7, 11, 14],
  vi: [9, 12, 16],
  vi7: [9, 12, 16, 19],
  bVII: [10, 14, 17],
  i: [0, 3, 7],
  III: [3, 7, 10],
  VI: [8, 12, 15],
  VII: [10, 14, 17],
};
const SCALE = {
  majorPentatonic: [0, 2, 4, 7, 9],
  minorPentatonic: [0, 3, 5, 7, 10],
  major: [0, 2, 4, 5, 7, 9, 11],
};

export const MUSIC = {
  meadow: {
    bpm: 80,
    bars: 10,
    root: NOTE('G3'),
    key: 'G major',
    chords: ['I', 'IV', 'vi', 'V', 'I'],
    chordBeats: [8, 8, 8, 8, 8],
    scale: 'majorPentatonic',
    pad: { wave: 'triangle', cutoff: 1200, level: 0.4 },
    pluck: { density: 0.45, octave: 2, damping: 0.995, soft: 0.2, level: 0.45 },
    bass: { level: 0.3 },
    sparkle: null,
    recipe:
      'detuned triangle pad (lowpass 1.2 kHz, 0.08 Hz wobble), bright Karplus-Strong plucks on G major pentatonic, sine bass; I IV vi V I, two bars each',
  },
  pond: {
    bpm: 72,
    bars: 9,
    root: NOTE('F3'),
    key: 'F major',
    chords: ['I7', 'IV7', 'ii7'],
    chordBeats: [12, 12, 12],
    scale: 'majorPentatonic',
    pad: { wave: 'triangle', cutoff: 700, level: 0.4 },
    pluck: { density: 0.3, octave: 2, damping: 0.994, soft: 0.6, level: 0.4 },
    bass: { level: 0.3 },
    sparkle: { density: 0.06, octave: 8, level: 0.12, bubble: true },
    recipe:
      'soft detuned triangle pad (lowpass 700 Hz), muted Karplus-Strong plucks on F major pentatonic, rising sine bubble blips, sine bass; Imaj7 IVmaj7 ii7, three bars each',
  },
  sky: {
    bpm: 90,
    bars: 11,
    root: NOTE('D4'),
    key: 'D major',
    chords: ['I', 'V', 'vi', 'IV', 'I'],
    chordBeats: [8, 8, 8, 8, 12],
    scale: 'majorPentatonic',
    pad: { wave: 'saw', cutoff: 1500, level: 0.3 },
    pluck: { density: 0.5, octave: 2, damping: 0.996, soft: 0.1, level: 0.4 },
    bass: { level: 0.22 },
    sparkle: { density: 0.12, octave: 8, level: 0.12, bubble: false },
    recipe:
      'airy detuned saw pad (lowpass 1.5 kHz), bright plucks on D major pentatonic, high sine sparkles with echo, light sine bass; I V vi IV I, the last chord three bars',
  },
  moon: {
    bpm: 75,
    bars: 9,
    root: NOTE('A3'),
    key: 'A minor',
    chords: ['i', 'VI', 'III', 'VII'],
    chordBeats: [8, 8, 8, 12],
    scale: 'minorPentatonic',
    pad: { wave: 'triangle', cutoff: 600, level: 0.45 },
    pluck: { density: 0.25, octave: 4, damping: 0.997, soft: 0.5, level: 0.35 },
    bass: { level: 0.32 },
    sparkle: { density: 0.08, octave: 8, level: 0.1, bubble: false },
    recipe:
      'dreamy detuned triangle pad (lowpass 600 Hz), sparse high plucks on A minor pentatonic with echo, sparse sine sparkles, deep sine bass; i VI III VII, the last chord three bars',
  },
  lab: {
    bpm: 88,
    bars: 11,
    root: NOTE('C4'),
    key: 'C major',
    chords: ['I', 'bVII', 'IV', 'V', 'I'],
    chordBeats: [8, 8, 8, 8, 12],
    scale: 'majorPentatonic',
    pad: { wave: 'square', cutoff: 800, level: 0.22 },
    pluck: { density: 0.55, octave: 2, damping: 0.99, soft: 0, level: 0.35, blip: true },
    bass: { level: 0.3, punchy: true },
    sparkle: { density: 0.1, octave: 8, level: 0.1, bubble: false },
    recipe:
      'square pad (lowpass 800 Hz), short lowpassed square blips on C major pentatonic, sine sparkles, punchy triangle bass on every beat; I bVII IV V I, the last chord three bars',
  },
  room: {
    bpm: 76,
    bars: 9,
    root: NOTE('D#3'),
    key: 'E flat major',
    chords: ['I7', 'vi7', 'IV7'],
    chordBeats: [12, 12, 12],
    scale: 'major',
    pad: { wave: 'triangle', cutoff: 500, level: 0.35 },
    pluck: { density: 0.4, octave: 2, damping: 0.995, soft: 0.7, level: 0.45 },
    bass: { level: 0.28 },
    sparkle: null,
    recipe:
      'warm detuned triangle pad (lowpass 500 Hz), felt-piano style muted plucks on E flat major, soft sine bass; Imaj7 vi7 IVmaj7, three bars each',
  },
};

/**
 * Renders a stereo loop for a theme; `loopSamples` is the exact bar-aligned length.
 * @param {string} theme
 * @returns {{ left: Float32Array; right: Float32Array; loopSamples: number; bpm: number; bars: number }}
 */
export function renderMusic(theme) {
  const spec = MUSIC[theme];
  if (!spec) throw new Error(`Unknown music theme ${theme}`);
  const beat = 60 / spec.bpm;
  const totalBeats = spec.bars * 4;
  const loopSamples = Math.round(totalBeats * beat * SAMPLE_RATE);
  const left = new Float32Array(loopSamples);
  const right = new Float32Array(loopSamples);
  const r = rng(seedOf(`music-${theme}`));
  const wrap = (channel, signal, startSeconds, gain) => {
    const start = Math.round(startSeconds * SAMPLE_RATE);
    for (let i = 0; i < signal.length; i++) channel[(start + i) % loopSamples] += signal[i] * gain;
  };
  const both = (signal, startSeconds, gain, pan = 0) => {
    wrap(left, signal, startSeconds, gain * Math.cos(((pan + 1) * Math.PI) / 4));
    wrap(right, signal, startSeconds, gain * Math.sin(((pan + 1) * Math.PI) / 4));
  };
  const hz = (semis, octave = 1) => spec.root * Math.pow(2, semis / 12) * octave;
  const chordAt = (beatIndex) => {
    let cursor = 0;
    for (let i = 0; i < spec.chords.length; i++) {
      cursor += spec.chordBeats[i];
      if (beatIndex < cursor) return CHORD[spec.chords[i]];
    }
    return CHORD[spec.chords[spec.chords.length - 1]];
  };

  // Pad and bass per chord.
  let cursor = 0;
  spec.chords.forEach((name, index) => {
    const beats = spec.chordBeats[index];
    const start = cursor * beat;
    const seconds = beats * beat;
    const release = beat;
    const tones = CHORD[name];
    for (const semis of tones) {
      const f = hz(semis);
      const env = adsr(beat, 0, 1, release, seconds + release);
      const cutoff = (t) => spec.pad.cutoff * (1 + 0.25 * Math.sin(TAU * 0.08 * (t + start)));
      const a = shape(lowpass(tone(seconds + release, f * 0.997, spec.pad.wave), cutoff), env);
      const b = shape(lowpass(tone(seconds + release, f * 1.003, spec.pad.wave), cutoff), env);
      wrap(left, a, start, spec.pad.level / tones.length);
      wrap(right, b, start, spec.pad.level / tones.length);
      wrap(left, b, start, (spec.pad.level * 0.3) / tones.length);
      wrap(right, a, start, (spec.pad.level * 0.3) / tones.length);
    }
    const bassNotes = spec.bass.punchy ? beats : Math.ceil(beats / 2);
    const bassLen = spec.bass.punchy ? beat : beat * 2;
    for (let n = 0; n < bassNotes; n++) {
      const env = spec.bass.punchy
        ? adsr(0.01, 0.15, 0.4, 0.1, bassLen)
        : adsr(0.03, 0.4, 0.6, 0.3, bassLen);
      const wave = spec.bass.punchy ? 'triangle' : 'sine';
      const note = lowpass(tone(bassLen, hz(tones[0], 0.5), wave), 400, 1);
      both(shape(note, env), start + n * bassLen, spec.bass.level);
    }
    cursor += beats;
  });

  // Plucks on eighths, biased to chord tones, panned alternately.
  const scaleSemis = SCALE[spec.scale];
  let side = -1;
  let lastSemis = -1;
  for (let e = 0; e < totalBeats * 2; e++) {
    const beatIndex = Math.floor(e / 2);
    const chord = chordAt(beatIndex);
    const onChordStart = e % 2 === 0 && spec.chordBeats.includes(beatIndex) && beatIndex === 0;
    if (!onChordStart && r() > spec.pluck.density) continue;
    const pool = r() < 0.6 ? chord : scaleSemis;
    let semis = pool[Math.floor(r() * pool.length)];
    if (semis === lastSemis) semis = pool[(pool.indexOf(semis) + 1) % pool.length];
    lastSemis = semis;
    const f = hz(semis, spec.pluck.octave);
    side = -side;
    const t = (e * beat) / 2;
    if (spec.pluck.blip) {
      const blip = shape(lowpass(tone(0.18, f, 'square'), 2500), adsr(0.005, 0.05, 0.5, 0.1, 0.18));
      both(blip, t, spec.pluck.level, side * 0.5);
    } else {
      const string = pluck(f, 1.6, seedOf(`${theme}-pluck-${e}`), {
        damping: spec.pluck.damping,
        soft: spec.pluck.soft,
      });
      both(string, t, spec.pluck.level, side * 0.5);
    }
  }

  // Sparkles on sixteenths, with a short echo.
  if (spec.sparkle) {
    for (let s = 0; s < totalBeats * 4; s++) {
      if (r() > spec.sparkle.density) continue;
      const chord = chordAt(Math.floor(s / 4));
      const semis = chord[Math.floor(r() * chord.length)];
      const f = hz(semis, spec.sparkle.octave);
      const t = (s * beat) / 4;
      const blip = spec.sparkle.bubble
        ? shape(tone(0.12, glide(f * 0.5, f, 0.1)), adsr(0.005, 0.08, 0.1, 0.02, 0.12))
        : echo(shape(tone(0.5, f), decay(0.3)), 0.12, 0.4, 0.4);
      both(blip, t, spec.sparkle.level, (r() * 2 - 1) * 0.8);
    }
  }

  let max = 0;
  for (let i = 0; i < loopSamples; i++) {
    left[i] = Math.tanh(left[i] * 1.2);
    right[i] = Math.tanh(right[i] * 1.2);
    max = Math.max(max, Math.abs(left[i]), Math.abs(right[i]));
  }
  if (max > 0) {
    scale(left, 0.85 / max);
    scale(right, 0.85 / max);
  }
  return { left, right, loopSamples, bpm: spec.bpm, bars: spec.bars };
}

// ---------------------------------------------------------------------------
// Encoding.
// ---------------------------------------------------------------------------
/**
 * Encodes channels as interleaved 16-bit PCM WAV.
 * @param {Float32Array[]} channels
 * @param {number} [sampleRate]
 * @returns {Buffer}
 */
export function encodeWav(channels, sampleRate = SAMPLE_RATE) {
  const frames = channels[0].length;
  const count = channels.length;
  const data = Buffer.alloc(frames * count * 2);
  for (let i = 0; i < frames; i++)
    for (let c = 0; c < count; c++) {
      const v = clamp(channels[c][i], -1, 1);
      data.writeInt16LE(Math.sign(v) * Math.round(Math.abs(v) * 32767), (i * count + c) * 2);
    }
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + data.length, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(count, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(sampleRate * count * 2, 28);
  header.writeUInt16LE(count * 2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(data.length, 40);
  return Buffer.concat([header, data]);
}

export function ffmpegAvailable() {
  const probe = spawnSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  return !probe.error && probe.status === 0;
}

const BITRATES = {
  cue: { opus: '64k', aac: '96k' },
  music: { opus: '96k', aac: '128k' },
};

/** Transcodes a WAV to `<base>.ogg` (Opus) and `<base>.m4a` (AAC). Returns the written paths. */
export function transcode(wavPath, base, kind) {
  const rates = BITRATES[kind];
  const run = (args, out) => {
    const result = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-i', wavPath, ...args, out], {
      stdio: ['ignore', 'ignore', 'pipe'],
    });
    if (result.status !== 0)
      throw new Error(`ffmpeg failed for ${out}: ${result.stderr?.toString() ?? result.error}`);
    return out;
  };
  return [
    run(
      ['-c:a', 'libopus', '-b:a', rates.opus, '-vbr', 'on', '-application', 'audio'],
      `${base}.ogg`,
    ),
    run(['-c:a', 'aac', '-b:a', rates.aac, '-movflags', '+faststart'], `${base}.m4a`),
  ];
}

// ---------------------------------------------------------------------------
// Provenance document.
// ---------------------------------------------------------------------------
function table(headers, rows) {
  const widths = headers.map((h, c) => Math.max(h.length, ...rows.map((r) => r[c].length)));
  const line = (cells) => `| ${cells.map((cell, c) => cell.padEnd(widths[c])).join(' | ')} |`;
  return [line(headers), line(widths.map((w) => '-'.repeat(w))), ...rows.map(line)].join('\n');
}

/** @returns {string} */
export function provenanceMarkdown() {
  const cueRows = Object.entries(CUES).map(([name, cue]) => [
    `\`${name}\``,
    `${cue.seconds.toFixed(2)} s`,
    `${(cue.peak ?? 0.9).toFixed(2)}`,
    cue.recipe,
  ]);
  const musicRows = Object.entries(MUSIC).map(([theme, spec]) => [
    `\`${theme}\``,
    `${spec.bpm}`,
    `${spec.bars}`,
    `${((spec.bars * 4 * 60) / spec.bpm).toFixed(2)} s`,
    spec.key,
    spec.recipe,
  ]);
  return `# Sound provenance

Every file under \`apps/web/public/sound\` and \`apps/web/public/music\` is synthesised by
\`apps/web/scripts/make-sounds.mjs\` from oscillators, seeded noise, filters and envelopes.
Nothing is downloaded or sampled: **synthesised, no third-party material**. The script is
deterministic, so re-running it reproduces the same audio sample for sample.

Regenerate with \`node scripts/make-sounds.mjs --all\` from \`apps/web\`. Audio renders at
44.1 kHz 16-bit mono (cues) or stereo (music), then ffmpeg transcodes it to Opus in Ogg
(\`.ogg\`, 64 kbit/s cues, 96 kbit/s music) and AAC in M4A (\`.m4a\`, 96 and 128 kbit/s).
Without ffmpeg on PATH the WAV ships instead. Every cue is peak-normalised to the level in
the table and given a 2 ms fade in and a 12 ms fade out so it never clicks; the mixer
balances cues at play time through the manifest gains.

## Cues

${table(['Cue', 'Length', 'Peak', 'Synthesis'], cueRows)}

## Music beds

These six loops are **placeholders**. The quality programme specifies one 30-second bed per
theme generated offline with \`lyria-3-clip-preview\` (Lyria); until Vertex AI credentials for
Lyria exist these synthesised pads and plucks stand in. Each loop is an exact number of
4/4 bars at its tempo, and every tail wraps to the start, so the loop point at the end of
the last bar is seamless. \`MUSIC_LOOP_SECONDS\` in \`apps/web/lib/sound/manifest.ts\` carries the
exact loop length so the mixer can set \`loopEnd\` regardless of encoder padding.

${table(['Theme', 'BPM', 'Bars', 'Loop', 'Key', 'Synthesis'], musicRows)}

When the Lyria clips arrive, replace the files, keep the names, update \`MUSIC_TEMPO\` in the
manifest to the clip's tempo and bar count, and record the prompt and model version here.
`;
}

// ---------------------------------------------------------------------------
// Command line.
// ---------------------------------------------------------------------------
const here = dirname(fileURLToPath(import.meta.url));
export const WEB_ROOT = resolve(here, '..');
export const SOUND_DIR = join(WEB_ROOT, 'public', 'sound');
export const MUSIC_DIR = join(WEB_ROOT, 'public', 'music');
export const PROVENANCE_PATH = resolve(WEB_ROOT, '..', '..', 'docs', 'art', 'sound-provenance.md');

function writeAudio(outDir, name, channels, kind, useFfmpeg, scratch) {
  mkdirSync(outDir, { recursive: true });
  const wav = encodeWav(channels);
  if (!useFfmpeg) {
    const path = join(outDir, `${name}.wav`);
    writeFileSync(path, wav);
    return [path];
  }
  const wavPath = join(scratch, `${name}.wav`);
  writeFileSync(wavPath, wav);
  const written = transcode(wavPath, join(outDir, name), kind);
  for (const stale of ['wav']) {
    const old = join(outDir, `${name}.${stale}`);
    if (existsSync(old)) rmSync(old);
  }
  return written;
}

function report(paths) {
  let total = 0;
  for (const path of paths) {
    const size = statSync(path).size;
    total += size;
    console.log(`${(size / 1024).toFixed(1).padStart(8)} KB  ${path.replace(WEB_ROOT + '/', '')}`);
  }
  return total;
}

export function main(argv = process.argv.slice(2)) {
  const flags = new Set(argv);
  const all = flags.has('--all');
  const doMusic = all || flags.has('--music');
  const doProvenance = all || flags.has('--provenance');
  const doCues = all || flags.has('--cues') || (!doMusic && !doProvenance);
  const useFfmpeg = ffmpegAvailable();
  console.log(useFfmpeg ? 'ffmpeg found: writing ogg and m4a' : 'ffmpeg missing: writing wav only');
  const scratch = mkdtempSync(join(tmpdir(), 'ji-sounds-'));
  const written = [];
  try {
    if (doCues)
      for (const name of Object.keys(CUES))
        written.push(...writeAudio(SOUND_DIR, name, [renderCue(name)], 'cue', useFfmpeg, scratch));
    if (doMusic)
      for (const theme of Object.keys(MUSIC)) {
        const loop = renderMusic(theme);
        written.push(
          ...writeAudio(MUSIC_DIR, theme, [loop.left, loop.right], 'music', useFfmpeg, scratch),
        );
      }
    if (doProvenance) {
      mkdirSync(dirname(PROVENANCE_PATH), { recursive: true });
      writeFileSync(PROVENANCE_PATH, provenanceMarkdown());
      console.log(`wrote ${PROVENANCE_PATH}`);
    }
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
  const total = report(written);
  console.log(`${written.length} files, ${(total / 1024).toFixed(1)} KB total`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
