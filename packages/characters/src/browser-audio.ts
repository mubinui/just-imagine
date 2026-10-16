import { PcmCapture, PcmPlayback, mouthOpen } from './audio';

export class BrowserAudio {
  private context?: AudioContext;
  private capture?: AudioWorkletNode;
  private playback?: AudioWorkletNode;
  private stream?: MediaStream;
  private source?: MediaStreamAudioSourceNode;
  private init?: Promise<void>;
  private disposed = false;
  private captureGeneration = 0;
  private capturePending?: Promise<void>;
  onFrame: (frame: ArrayBuffer) => void = () => {};
  onMouth: (value: number) => void = () => {};
  private mouthListeners = new Set<(value: number) => void>();
  private mouthValue = 0;
  private drainId = 0;
  private drains = new Map<
    number,
    { resolve: (finished: boolean) => void; timer: ReturnType<typeof setTimeout> }
  >();
  /** Resolves only after the worklet consumes every queued sample. Flush cancels it. */
  whenPlaybackIdle(): Promise<boolean> {
    if (!this.playback || !this.unlocked) return Promise.resolve(false);
    const id = ++this.drainId;
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.drains.delete(id);
        resolve(false);
      }, 60000);
      this.drains.set(id, { resolve, timer });
      this.playback!.port.postMessage({ barrier: id });
    });
  }
  private finishDrain(id: number, finished: boolean) {
    const pending = this.drains.get(id);
    if (!pending) return;
    clearTimeout(pending.timer);
    this.drains.delete(id);
    pending.resolve(finished);
  }
  /** Multiple visible portraits can follow playback without replacing each other. */
  subscribeMouth(listener: (value: number) => void) {
    this.mouthListeners.add(listener);
    listener(this.mouthValue);
    return () => {
      this.mouthListeners.delete(listener);
    };
  }
  private emitMouth(value: number) {
    this.mouthValue = value;
    this.onMouth(value);
    for (const listener of this.mouthListeners) listener(value);
  }
  onPlaybackError: () => void = () => {};
  get unlocked() {
    return this.context?.state === 'running';
  }
  /** Call synchronously in the profile tap handler, before navigation or network I/O. */
  unlock(): Promise<void> {
    if (this.disposed) return Promise.reject(new Error('Audio has been disposed'));
    this.context ??= new AudioContext();
    const resume = this.context.resume();
    this.init ??= this.install();
    return Promise.all([resume, this.init]).then(() => {});
  }
  private async install() {
    const context = this.context!;
    const code = `const PcmCapture = ${PcmCapture.toString()};\nconst PcmPlayback = ${PcmPlayback.toString()};\n
      class ImagineCapture extends AudioWorkletProcessor {
        constructor(){super();this.capture=new PcmCapture(sampleRate);}
        process(inputs){const channel=inputs[0]?.[0];if(channel)for(const frame of this.capture.push(channel))this.port.postMessage(frame.buffer,[frame.buffer]);return true;}
      }
      class ImaginePlayback extends AudioWorkletProcessor {
        constructor(){super();this.buffer=new PcmPlayback(sampleRate);this.elapsed=0;this.barriers=[];this.port.onmessage=e=>{if(e.data==='clear'){this.buffer.clear();this.barriers=[];}else if(e.data?.barrier)this.barriers.push(e.data.barrier);else if(!this.buffer.push(new Int16Array(e.data))){this.buffer.clear();this.port.postMessage('overflow');}};}
        process(_inputs,outputs){const out=outputs[0]?.[0];if(out){this.buffer.readInto(out);if(this.buffer.queuedSamples===0&&this.barriers.length){for(const id of this.barriers)this.port.postMessage({idle:id});this.barriers=[];}this.elapsed+=out.length;if(this.elapsed>=sampleRate/30){this.elapsed=0;let sum=0;for(const x of out)sum+=x*x;this.port.postMessage(Math.sqrt(sum/out.length));}}return true;}
      }
      registerProcessor('imagine-capture',ImagineCapture);registerProcessor('imagine-playback',ImaginePlayback);`;
    const url = URL.createObjectURL(new Blob([code], { type: 'application/javascript' }));
    try {
      await context.audioWorklet.addModule(url);
    } finally {
      URL.revokeObjectURL(url);
    }
    if (this.disposed) return;
    this.playback = new AudioWorkletNode(context, 'imagine-playback', { outputChannelCount: [1] });
    this.playback.port.onmessage = (
      event: MessageEvent<number | 'overflow' | { idle: number }>,
    ) => {
      if (event.data === 'overflow') this.onPlaybackError();
      else if (typeof event.data === 'object') this.finishDrain(event.data.idle, true);
      else this.emitMouth(mouthOpen(event.data));
    };
    this.playback.connect(context.destination);
  }
  async startCapture() {
    if (!this.unlocked) throw new Error('Choose a profile to enable audio first');
    if (this.capturePending) return this.capturePending;
    const generation = this.captureGeneration;
    const pending = (async () => {
      await this.init;
      if (this.stream || this.disposed || generation !== this.captureGeneration) return;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true },
        video: false,
      });
      if (this.disposed || generation !== this.captureGeneration) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      this.stream = stream;
      try {
        this.capture = new AudioWorkletNode(this.context!, 'imagine-capture', {
          outputChannelCount: [1],
        });
        this.capture.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
          if (generation === this.captureGeneration) this.onFrame(event.data);
        };
        this.source = this.context!.createMediaStreamSource(stream);
        this.source.connect(this.capture);
        this.capture.connect(this.context!.destination);
      } catch (error) {
        this.stopCapture();
        throw error;
      }
    })();
    this.capturePending = pending;
    try {
      await pending;
    } finally {
      if (this.capturePending === pending) this.capturePending = undefined;
    }
  }
  play(frame: ArrayBuffer) {
    if (frame.byteLength % 2 === 0) this.playback?.port.postMessage(frame, [frame]);
  }
  flush() {
    for (const id of this.drains.keys()) this.finishDrain(id, false);
    this.playback?.port.postMessage('clear');
    this.emitMouth(0);
  }
  stopCapture() {
    this.captureGeneration++;
    this.capturePending = undefined;
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = undefined;
    this.source?.disconnect();
    this.source = undefined;
    this.capture?.disconnect();
    this.capture = undefined;
  }
  async dispose() {
    this.disposed = true;
    this.stopCapture();
    this.flush();
    this.mouthListeners.clear();
    this.playback?.disconnect();
    await this.context?.close();
  }
}
