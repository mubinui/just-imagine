/**
 * A small fake of the Web Audio objects the mixer touches. Gain ramps and
 * source start/stop calls are recorded so tests can assert on timing.
 */
export interface ParamEvent {
  type: 'set' | 'linear' | 'exp' | 'target' | 'cancel';
  value?: number;
  time: number;
}

export class FakeAudioParam {
  events: ParamEvent[] = [];
  constructor(public value = 1) {}
  setValueAtTime(value: number, time: number) {
    this.events.push({ type: 'set', value, time });
    this.value = value;
    return this;
  }
  linearRampToValueAtTime(value: number, time: number) {
    this.events.push({ type: 'linear', value, time });
    this.value = value;
    return this;
  }
  exponentialRampToValueAtTime(value: number, time: number) {
    this.events.push({ type: 'exp', value, time });
    this.value = value;
    return this;
  }
  setTargetAtTime(value: number, time: number) {
    this.events.push({ type: 'target', value, time });
    this.value = value;
    return this;
  }
  cancelScheduledValues(time: number) {
    this.events.push({ type: 'cancel', time });
    return this;
  }
  /** The last ramp (linear or exponential) scheduled on this param. */
  lastRamp() {
    return [...this.events].reverse().find((e) => e.type === 'linear' || e.type === 'exp');
  }
}

export class FakeNode {
  readonly outputs = new Set<FakeNode>();
  connect(node: FakeNode) {
    this.outputs.add(node);
    return node;
  }
  disconnect(node?: FakeNode) {
    if (node) this.outputs.delete(node);
    else this.outputs.clear();
  }
}

export class FakeGainNode extends FakeNode {
  gain = new FakeAudioParam(1);
}

export class FakeStereoPannerNode extends FakeNode {
  pan = new FakeAudioParam(0);
}

export class FakeAudioBuffer {
  constructor(
    public duration: number,
    public sampleRate = 44100,
    public numberOfChannels = 1,
  ) {}
  get length() {
    return Math.round(this.duration * this.sampleRate);
  }
}

export class FakeBufferSourceNode extends FakeNode {
  buffer: FakeAudioBuffer | null = null;
  loop = false;
  loopStart = 0;
  loopEnd = 0;
  playbackRate = new FakeAudioParam(1);
  startedAt: number | undefined;
  stoppedAt: number | undefined;
  onended: (() => void) | null = null;
  ended = false;
  start(when = 0) {
    if (this.startedAt !== undefined) throw new Error('InvalidStateError: start called twice');
    this.startedAt = when;
  }
  stop(when = 0) {
    this.stoppedAt = when;
  }
  /** Simulates the browser firing `ended`. */
  end() {
    this.ended = true;
    this.onended?.();
  }
  get playing() {
    return this.startedAt !== undefined && this.stoppedAt === undefined && !this.ended;
  }
}

export class FakeAudioContext {
  currentTime = 0;
  state: 'suspended' | 'running' | 'closed' = 'suspended';
  sampleRate = 44100;
  destination = new FakeNode();
  gains: FakeGainNode[] = [];
  sources: FakeBufferSourceNode[] = [];
  panners: FakeStereoPannerNode[] = [];
  decoded: ArrayBuffer[] = [];
  resumeCalls = 0;
  createGain() {
    const node = new FakeGainNode();
    this.gains.push(node);
    return node;
  }
  createBufferSource() {
    const node = new FakeBufferSourceNode();
    this.sources.push(node);
    return node;
  }
  createStereoPanner() {
    const node = new FakeStereoPannerNode();
    this.panners.push(node);
    return node;
  }
  /** Empty data fails to decode; otherwise one byte is one sample at 44.1 kHz. */
  async decodeAudioData(data: ArrayBuffer) {
    this.decoded.push(data);
    if (data.byteLength === 0) throw new Error('EncodingError: unable to decode audio data');
    return new FakeAudioBuffer(data.byteLength / this.sampleRate);
  }
  async resume() {
    if (this.state === 'closed') throw new Error('InvalidStateError: context closed');
    this.state = 'running';
    this.resumeCalls++;
  }
  async suspend() {
    this.state = 'suspended';
  }
  async close() {
    this.state = 'closed';
  }
  advance(seconds: number) {
    this.currentTime += seconds;
  }
  get playingSources() {
    return this.sources.filter((s) => s.playing);
  }
}

/** Every node on any path from `from` that reaches `to`, excluding both ends. */
export function nodesBetween(from: FakeNode, to: FakeNode): FakeNode[] {
  const found = new Set<FakeNode>();
  const visit = (node: FakeNode, path: FakeNode[], seen: Set<FakeNode>): void => {
    if (node === to) {
      for (const n of path) found.add(n);
      return;
    }
    if (seen.has(node)) return;
    seen.add(node);
    for (const next of node.outputs) visit(next, node === from ? path : [...path, node], seen);
  };
  visit(from, [], new Set());
  return [...found];
}

export function gainsBetween(from: FakeNode, to: FakeNode): FakeGainNode[] {
  return nodesBetween(from, to).filter((n): n is FakeGainNode => n instanceof FakeGainNode);
}

export function reaches(from: FakeNode, to: FakeNode) {
  return from === to || nodesBetween(from, to).length > 0 || from.outputs.has(to);
}

/** Lets pending decode promises settle. */
export const flush = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

/** A loader that returns `seconds` of fake samples per url, or fails when `seconds` is undefined. */
export function fakeLoader(seconds: (url: string) => number | undefined = () => 0.5) {
  const calls: string[] = [];
  const load = async (url: string) => {
    calls.push(url);
    const length = seconds(url);
    if (length === undefined) throw new Error(`404 ${url}`);
    return new ArrayBuffer(Math.round(length * 44100));
  };
  return { load, calls };
}
