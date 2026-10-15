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
/** Bounded ring buffer; overflow drops oldest audio rather than building latency. */
export class PcmPlayback {
  private data: Float32Array;
  private start = 0;
  private length = 0;
  private phase = 0;
  constructor(
    private outputRate: number,
    capacity = 24000 * 3,
  ) {
    if (
      !Number.isFinite(outputRate) ||
      outputRate < 16000 ||
      !Number.isInteger(capacity) ||
      capacity < 2
    )
      throw new RangeError('Invalid playback configuration');
    this.data = new Float32Array(capacity);
  }
  get queuedSamples() {
    return this.length;
  }
  push(samples: Int16Array) {
    for (const sample of samples) {
      if (this.length === this.data.length) {
        this.start = (this.start + 1) % this.data.length;
        this.length--;
      }
      this.data[(this.start + this.length) % this.data.length] = sample / 32768;
      this.length++;
    }
  }
  clear() {
    this.start = 0;
    this.length = 0;
    this.phase = 0;
    this.data.fill(0);
  }
  read(size: number): Float32Array {
    const output = new Float32Array(size);
    for (let i = 0; i < size; i++) {
      if (!this.length) {
        this.phase = 0;
        break;
      }
      const a = this.data[this.start] ?? 0;
      const b = this.length > 1 ? (this.data[(this.start + 1) % this.data.length] ?? a) : a;
      output[i] = a + (b - a) * this.phase;
      this.phase += 24000 / this.outputRate;
      while (this.phase >= 1 && this.length > 0) {
        this.start = (this.start + 1) % this.data.length;
        this.length--;
        this.phase--;
      }
    }
    return output;
  }
}
export function mouthOpen(rms: number, previous = 0): number {
  if (!Number.isFinite(rms)) return 0;
  const target = Math.min(1, Math.max(0, (rms - 0.01) * 8));
  return target === 0 ? Math.max(0, previous * 0.5) : target;
}
