import {
  ClientMessageSchema,
  parseServerMessage,
  type ClientMessage,
  type ServerMessage,
} from '@just-imagine/protocol';
import { BrowserAudio } from './browser-audio';
type Hello = Extract<ClientMessage, { type: 'hello' }>;
export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'closed' | 'error';
export interface VoiceOptions {
  url: string;
  capture?: boolean;
  audio?: BrowserAudio;
  socket?: (url: string) => WebSocket;
  getToken?: () => Promise<string>;
}
export class VoiceClient {
  readonly audio: BrowserAudio;
  private socket?: WebSocket;
  private hello?: Hello;
  private retry = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private ended = false;
  private generation = 0;
  private connecting = false;
  private listeners = new Set<(message: ServerMessage) => void>();
  onStatus: (status: VoiceStatus) => void = () => {};
  constructor(private options: VoiceOptions) {
    this.audio = options.audio ?? new BrowserAudio();
    this.audio.onFrame = (frame) => {
      if (this.socket?.readyState === 1 && this.socket.bufferedAmount < 640 * 10)
        this.socket.send(frame);
    };
  }
  unlockAudio() {
    return this.audio.unlock();
  }
  subscribe(callback: (message: ServerMessage) => void) {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }
  async connect(hello: Hello) {
    if (!this.audio.unlocked) throw new Error('Audio must be unlocked by the profile tap');
    if (this.socket || this.connecting) throw new Error('Voice client already connected');
    this.hello = ClientMessageSchema.parse(hello) as Hello;
    this.ended = false;
    this.retry = 0;
    this.connecting = true;
    const generation = ++this.generation;
    try {
      if (this.options.capture !== false) await this.audio.startCapture();
      if (this.ended || generation !== this.generation) return;
      await this.open();
    } finally {
      if (generation === this.generation || !this.socket) this.connecting = false;
    }
  }
  private async open() {
    if (this.ended || !this.hello) return;
    const generation = ++this.generation;
    this.onStatus(this.retry ? 'reconnecting' : 'connecting');
    try {
      if (this.options.getToken) this.hello.idToken = await this.options.getToken();
      if (this.ended || generation !== this.generation) return;
      const socket = (this.options.socket ?? ((url) => new WebSocket(url)))(this.options.url);
      this.socket = socket;
      this.connecting = false;
      socket.binaryType = 'arraybuffer';
      socket.onopen = () => {
        if (generation === this.generation) socket.send(JSON.stringify(this.hello));
      };
      socket.onmessage = (event) => {
        if (this.ended || generation !== this.generation) return;
        if (event.data instanceof ArrayBuffer) {
          this.audio.play(event.data);
          return;
        }
        try {
          const message = parseServerMessage(String(event.data));
          if (message.type === 'ready') {
            this.retry = 0;
            this.hello!.sessionId = message.sessionId;
            if (message.worldId) this.hello!.worldId = message.worldId;
            this.onStatus('connected');
          }
          if (message.type === 'worldJob') this.hello!.worldId = message.worldId;
          if (message.type === 'interrupted') this.audio.flush();
          if (message.type === 'bye') {
            this.ended = true;
            this.audio.stopCapture();
            this.audio.flush();
            socket.close();
            this.onStatus('closed');
          }
          for (const listener of this.listeners) listener(message);
        } catch {
          this.onStatus('error');
        }
      };
      socket.onerror = () => {
        if (!this.ended) this.onStatus('reconnecting');
      };
      socket.onclose = () => {
        if (generation === this.generation) {
          this.socket = undefined;
          this.scheduleReconnect();
        }
      };
    } catch {
      this.scheduleReconnect();
    }
  }
  private scheduleReconnect() {
    if (this.ended) return;
    this.audio.flush();
    if (this.retry >= 5) {
      this.ended = true;
      this.audio.stopCapture();
      this.onStatus('error');
      return;
    }
    this.onStatus('reconnecting');
    this.timer = setTimeout(() => void this.open(), 500 * 2 ** this.retry++);
  }
  send(message: Exclude<ClientMessage, { type: 'hello' }>) {
    const parsed = ClientMessageSchema.parse(message);
    if (this.socket?.readyState === 1) this.socket.send(JSON.stringify(parsed));
  }
  end() {
    this.send({ type: 'end' });
    this.ended = true;
    clearTimeout(this.timer);
    this.generation++;
    this.connecting = false;
    this.socket?.close();
    this.socket = undefined;
    this.audio.stopCapture();
    this.audio.flush();
    this.onStatus('closed');
  }
  async dispose() {
    this.end();
    this.listeners.clear();
    await this.audio.dispose();
  }
}
