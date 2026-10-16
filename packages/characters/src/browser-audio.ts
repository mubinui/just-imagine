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
        constructor(){super();this.buffer=new PcmPlayback(sampleRate);this.elapsed=0;this.port.onmessage=e=>{if(e.data==='clear')this.buffer.clear();else if(!this.buffer.push(new Int16Array(e.data))){this.buffer.clear();this.port.postMessage('overflow');}};}
        process(_inputs,outputs){const out=outputs[0]?.[0];if(out){this.buffer.readInto(out);this.elapsed+=out.length;if(this.elapsed>=sampleRate/30){this.elapsed=0;let sum=0;for(const x of out)sum+=x*x;this.port.postMessage(Math.sqrt(sum/out.length));}}return true;}
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
    this.playback.port.onmessage = (event: MessageEvent<number | 'overflow'>) => {
      if (event.data === 'overflow') this.onPlaybackError();
      else this.onMouth(mouthOpen(event.data));
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
    this.playback?.port.postMessage('clear');
    this.onMouth(0);
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
    this.playback?.disconnect();
    await this.context?.close();
  }
}
