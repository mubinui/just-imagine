/** Small synthesized reaction cues; audio unlock follows an actual pointer gesture. */
export class SoundCues {
  private context: AudioContext | undefined;
  private ready: Promise<void> = Promise.resolve();
  private disposed = false;
  unlock() {
    if (this.disposed || !globalThis.AudioContext) return;
    this.context ??= new AudioContext();
    if (this.context.state === 'suspended') this.ready = this.context.resume().catch(() => {});
  }
  play(cue: string) {
    void this.ready
      .then(() => {
        const context = this.context;
        if (this.disposed || !context || context.state !== 'running') return;
        const tones: Record<string, [number, number, number]> = {
          boing: [280, 95, 0.3],
          ding: [660, 880, 0.25],
          splat: [130, 45, 0.18],
          splash: [480, 130, 0.35],
          whoosh: [240, 880, 0.22],
        };
        const [start, end, duration] = tones[cue] ?? tones.ding!;
        const oscillator = context.createOscillator(),
          gain = context.createGain(),
          time = context.currentTime;
        oscillator.type = cue === 'splat' ? 'triangle' : 'sine';
        oscillator.frequency.setValueAtTime(start, time);
        oscillator.frequency.exponentialRampToValueAtTime(end, time + duration);
        gain.gain.setValueAtTime(0.035, time);
        gain.gain.exponentialRampToValueAtTime(0.0001, time + duration);
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.onended = () => {
          oscillator.disconnect();
          gain.disconnect();
        };
        oscillator.start(time);
        oscillator.stop(time + duration);
      })
      .catch(() => {});
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true;
    void this.context?.close().catch(() => {});
    this.context = undefined;
  }
}
