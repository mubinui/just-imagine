export function pcm16Tone(opts: {
  sampleRate: number;
  seconds: number;
  frequency: number;
  amplitude?: number;
}): Int16Array {
  const amplitude = opts.amplitude ?? 0.5;
  if (!Number.isSafeInteger(opts.sampleRate) || opts.sampleRate <= 0)
    throw new RangeError('sampleRate must be a positive integer');
  if (!Number.isFinite(opts.seconds) || opts.seconds < 0)
    throw new RangeError('seconds must be nonnegative and finite');
  if (
    !Number.isFinite(opts.frequency) ||
    opts.frequency < 0 ||
    opts.frequency > opts.sampleRate / 2
  )
    throw new RangeError('frequency must be between zero and the Nyquist frequency');
  if (!Number.isFinite(amplitude) || amplitude < 0 || amplitude > 1)
    throw new RangeError('amplitude must be between zero and one');
  const n = Math.round(opts.sampleRate * opts.seconds);
  if (!Number.isSafeInteger(n)) throw new RangeError('sample count must be a safe integer');
  const out = new Int16Array(n);
  for (let i = 0; i < n; i++) {
    out[i] = Math.round(
      Math.sin((2 * Math.PI * opts.frequency * i) / opts.sampleRate) * amplitude * 32767,
    );
  }
  return out;
}

export function int16ToBytes(samples: Int16Array): Uint8Array {
  const bytes = new Uint8Array(samples.length * 2);
  const view = new DataView(bytes.buffer);
  for (let i = 0; i < samples.length; i++) view.setInt16(i * 2, samples[i]!, true);
  return bytes;
}

export function splitPcm16Frames(bytes: Uint8Array, samplesPerFrame: number): Uint8Array[] {
  if (
    !Number.isSafeInteger(samplesPerFrame) ||
    samplesPerFrame <= 0 ||
    !Number.isSafeInteger(samplesPerFrame * 2)
  )
    throw new RangeError('samplesPerFrame must be a positive integer');
  if (bytes.byteLength % 2 !== 0) throw new Error('PCM16 byte length must be a multiple of 2');
  const frameBytes = samplesPerFrame * 2;
  const frames: Uint8Array[] = [];
  for (let offset = 0; offset < bytes.byteLength; offset += frameBytes) {
    const frame = new Uint8Array(frameBytes);
    frame.set(bytes.subarray(offset, Math.min(offset + frameBytes, bytes.byteLength)));
    frames.push(frame);
  }
  return frames;
}
