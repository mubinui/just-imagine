/** Streaming microphone downsampler. Buffers only one 20ms frame in memory. */
export class PcmCapture {
  private phase = 0;
  private sum = 0;
  private count = 0;
  private frame = new Int16Array(320);
  private offset = 0;
  constructor(private sourceRate: number) {
    if (!Number.isFinite(sourceRate) || sourceRate < 16000)
      throw new RangeError('Microphone sample rate must be at least 16kHz');
  }
  push(input: Float32Array): Int16Array[] {
    const frames: Int16Array[] = [];
    for (const sample of input) {
      this.sum += Number.isFinite(sample) ? sample : 0;
      this.count++;
      this.phase += 16000;
      if (this.phase >= this.sourceRate) {
        this.phase -= this.sourceRate;
        const value = Math.max(-1, Math.min(1, this.sum / this.count));
        this.frame[this.offset++] = Math.round(value * (value < 0 ? 32768 : 32767));
        this.sum = 0;
        this.count = 0;
        if (this.offset === 320) {
          frames.push(this.frame);
          this.frame = new Int16Array(320);
          this.offset = 0;
        }
      }
    }
    return frames;
  }
}
/** Bounded PCM queue with a short jitter cushion; never silently discard syllables. */
export class PcmPlayback {
  private data: Float32Array;
  private start = 0;
  private length = 0;
  private phase = 0;
  private playing = false;
  private waiting = 0;
  private gain = 0;
  private last = 0;
  private fade = 0;
  private readonly rampSamples: number;
  private readonly capacity: number;
  /** Milliseconds of speech gathered before a reply starts; grows on a busy device. */
  private cushion = 150;
  /** Output samples played since the queue last ran dry while speaking, or undefined. */
  private sinceDry: number | undefined = undefined;
  constructor(
    private outputRate: number,
    capacity = 24000 * 30,
  ) {
    if (
      !Number.isFinite(outputRate) ||
      outputRate < 16000 ||
      !Number.isInteger(capacity) ||
      capacity < 2
    )
      throw new RangeError('Invalid playback configuration');
    this.data = new Float32Array(capacity);
    this.rampSamples = Math.max(1, Math.round(outputRate * 0.005));
    this.capacity = capacity;
  }
  get queuedSamples() {
    return this.length;
  }
  get cushionMs() {
    return this.cushion;
  }
  /** Input samples ever queued and ever played: a mark at `pushed` is heard once `played` reaches it. */
  pushed = 0;
  played = 0;
  private get prebuffer() {
    return Math.min(this.capacity, Math.round(this.cushion * 24));
  }
  /** A false return requests explicit recovery instead of dropping earlier speech. */
  push(samples: Int16Array): boolean {
    if (samples.length > this.data.length - this.length) return false;
    // Audio arriving soon after the queue ran dry was a hiccup, not the end of a reply:
    // gather a larger cushion from now on (up to 400 ms) so a busy device stops cutting out.
    if (this.sinceDry !== undefined && this.sinceDry < this.outputRate * 0.6)
      this.cushion = Math.min(400, this.cushion + 100);
    this.sinceDry = undefined;
    for (const sample of samples) {
      this.data[(this.start + this.length) % this.data.length] = sample / 32768;
      this.length++;
    }
    this.pushed += samples.length;
    return true;
  }
  clear() {
    this.played = this.pushed;
    this.start = 0;
    this.length = 0;
    this.phase = 0;
    this.playing = false;
    this.waiting = 0;
    this.gain = 0;
    this.fade = this.rampSamples;
  }
  read(size: number): Float32Array {
    const output = new Float32Array(size);
    this.readInto(output);
    return output;
  }
  /** Called on the audio thread: reuse the browser's output array. */
  readInto(output: Float32Array): void {
    output.fill(0);
    if (this.sinceDry !== undefined) this.sinceDry += output.length;
    for (let i = 0; i < output.length; i++) {
      // Fade residual output over5ms on interruption or starvation, never a hard cut.
      if (this.fade > 0) {
        output[i] = this.last * (--this.fade / this.rampSamples);
        if (!this.fade) this.last = 0;
        continue;
      }
      if (!this.playing) {
        if (!this.length) continue;
        this.waiting++;
        // Short replies must also start: waiting at most the cushion needs no turn-end event.
        if (this.length < this.prebuffer && this.waiting < (this.outputRate * this.cushion) / 1000)
          continue;
        this.playing = true;
        this.waiting = 0;
        this.gain = 0;
      }
      if (!this.length) {
        this.playing = false;
        this.phase = 0;
        this.fade = this.rampSamples;
        this.sinceDry = output.length - i;
        output[i] = this.last;
        continue;
      }
      const a = this.data[this.start] ?? 0;
      const b = this.length > 1 ? (this.data[(this.start + 1) % this.data.length] ?? a) : a;
      this.gain = Math.min(1, this.gain + 1 / this.rampSamples);
      this.last = (a + (b - a) * this.phase) * this.gain;
      output[i] = this.last;
      this.phase += 24000 / this.outputRate;
      while (this.phase >= 1 && this.length > 0) {
        this.start = (this.start + 1) % this.data.length;
        this.length--;
        this.played++;
        this.phase--;
      }
    }
  }
}
export function mouthOpen(rms: number, previous = 0): number {
  if (!Number.isFinite(rms)) return 0;
  const target = Math.min(1, Math.max(0, (rms - 0.01) * 8));
  return target === 0 ? Math.max(0, previous * 0.5) : target;
}
