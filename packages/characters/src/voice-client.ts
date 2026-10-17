import {
  ClientMessageSchema,
  parseServerMessage,
  type ClientMessage,
  type ServerMessage,
} from '@just-imagine/protocol';
import { BrowserAudio } from './browser-audio';
type Hello = Extract<ClientMessage, { type: 'hello' }>;
type Control = Exclude<ClientMessage, { type: 'hello' }>;
type WorldIntent = Extract<Control, { type: 'openWorld' | 'newGame' }>;
type PersonaIntent = Extract<Control, { type: 'summonPersona' }>;
type Selection =
  | { type: 'character'; characterId: Hello['characterId'] }
  | { type: 'world'; message: WorldIntent }
  | { type: 'persona'; message: PersonaIntent; acknowledged: boolean };
export type VoiceStatus = 'idle' | 'connecting' | 'connected' | 'reconnecting' | 'closed' | 'error';
export interface VoiceOptions {
  url: string;
  capture?: boolean;
  audio?: BrowserAudio;
  socket?: (url: string) => WebSocket;
  getToken?: () => Promise<string>;
}
/** 400 ms of silence at 24 kHz between two speakers. */
const HANDOFF_BEAT_SAMPLES = 9600;

export class VoiceClient {
  readonly audio: BrowserAudio;
  private socket?: WebSocket;
  private hello?: Hello;
  private retry = 0;
  private timer?: ReturnType<typeof setTimeout>;
  private ended = false;
  private generation = 0;
  private connecting = false;
  private personaId?: string;
  private currentPersona?: PersonaIntent;
  private wantedPersona?: PersonaIntent;
  private wantedCharacter?: Hello['characterId'];
  private wantedWorld?: { message: WorldIntent; sent: boolean };
  private selecting?: Selection;
  private waiting: Control[] = [];
  private listeners = new Set<(message: ServerMessage) => void>();
  private statusListeners = new Set<(status: VoiceStatus) => void>();
  status: VoiceStatus = 'idle';
  /** The speaker still audible while a handoff lets their last words play out. */
  private heard?: { id: string | undefined };
  /** Who owns the current playback; a guest persona keeps the companion quiet. */
  get speakerId() {
    if (!this.session) return undefined;
    if (this.heard) return this.heard.id ?? this.hello?.characterId;
    return this.personaId ?? this.hello?.characterId;
  }
  /**
   * A new voice takes over: the previous speaker finishes the words already queued, a short
   * silent beat follows, and only then does the new speaker own the portrait and the mouth.
   */
  private handOff(previous: string | undefined) {
    const playedThrough = this.audio.whenPlayedThrough?.();
    if (!playedThrough) return;
    const token = this.heard ?? { id: previous };
    this.heard = token;
    void playedThrough.then(() => {
      if (this.heard === token) this.heard = undefined;
    });
    this.audio.play(new Int16Array(HANDOFF_BEAT_SAMPLES).buffer);
  }
  get session() {
    if (this.ended || !this.hello) return undefined;
    const { childId, characterId, worldId, sessionId } = this.hello;
    return { childId, characterId, worldId, sessionId };
  }
  /** Selection controls are acknowledged before a queued creative turn reaches the model. */
  get selectionPending() {
    return Boolean(
      this.selecting || this.wantedCharacter || this.wantedWorld || this.wantedPersona,
    );
  }
  private sameWorld(a: WorldIntent, b: WorldIntent) {
    return a.type === b.type && (a.type === 'newGame' || a.worldId === (b as typeof a).worldId);
  }
  private resetControls() {
    this.wantedCharacter = undefined;
    this.wantedWorld = undefined;
    this.wantedPersona = undefined;
    this.selecting = undefined;
    this.waiting = [];
  }
  private samePersona(a: PersonaIntent, b: PersonaIntent) {
    return a.packId === b.packId && a.characterId === b.characterId;
  }
  private flushControls() {
    if (
      this.ended ||
      this.status !== 'connected' ||
      this.socket?.readyState !== 1 ||
      this.selecting
    )
      return;
    if (this.wantedWorld) {
      const message = this.wantedWorld.message;
      this.selecting = { type: 'world', message };
      this.wantedWorld.sent = true;
      this.socket.send(JSON.stringify(message));
      this.setStatus('reconnecting');
      return;
    }
    if (this.wantedCharacter) {
      const characterId = this.wantedCharacter;
      if (characterId === this.hello?.characterId && !this.personaId) {
        this.wantedCharacter = undefined;
      } else {
        this.selecting = { type: 'character', characterId };
        this.socket.send(JSON.stringify({ type: 'switchCharacter', characterId }));
        this.setStatus('reconnecting');
        return;
      }
    }
    if (this.wantedPersona) {
      const message = this.wantedPersona;
      if (this.currentPersona && this.samePersona(this.currentPersona, message))
        this.wantedPersona = undefined;
      else {
        this.selecting = { type: 'persona', message, acknowledged: false };
        this.socket.send(JSON.stringify(message));
        this.setStatus('reconnecting');
        return;
      }
    }
    for (const message of this.waiting.splice(0)) this.socket.send(JSON.stringify(message));
  }
  subscribeStatus(listener: (status: VoiceStatus) => void) {
    this.statusListeners.add(listener);
    return () => {
      this.statusListeners.delete(listener);
    };
  }
  private setStatus(status: VoiceStatus) {
    this.status = status;
    this.onStatus(status);
    for (const listener of this.statusListeners) listener(status);
  }
  onStatus: (status: VoiceStatus) => void = () => {};
  constructor(private options: VoiceOptions) {
    this.audio = options.audio ?? new BrowserAudio();
    this.audio.onPlaybackError = () => {
      this.end();
      this.setStatus('error');
    };
    this.audio.onFrame = (frame) => {
      if (
        this.status === 'connected' &&
        !this.selectionPending &&
        this.socket?.readyState === 1 &&
        this.socket.bufferedAmount < 640 * 10
      )
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
    this.resetControls();
    this.hello = ClientMessageSchema.parse(hello) as Hello;
    this.personaId = undefined;
    this.currentPersona = undefined;
    this.ended = false;
    this.retry = 0;
    this.connecting = true;
    const generation = ++this.generation;
    try {
      if (this.options.capture !== false) await this.audio.startCapture();
      if (this.ended || generation !== this.generation) return;
      await this.open();
    } catch (error) {
      if (generation === this.generation) {
        this.ended = true;
        this.hello = undefined;
        this.audio.stopCapture();
        this.setStatus('error');
      }
      throw error;
    } finally {
      if (generation === this.generation || !this.socket) this.connecting = false;
    }
  }
  private async open() {
    if (this.ended || !this.hello) return;
    const generation = ++this.generation;
    this.setStatus(this.retry ? 'reconnecting' : 'connecting');
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
          if (this.status === 'connected' && !this.selectionPending) this.audio.play(event.data);
          return;
        }
        try {
          const message = parseServerMessage(String(event.data));
          const before = this.personaId ?? this.hello?.characterId;
          if (message.type === 'storyVoice' || message.type === 'storyCue') {
            this.currentPersona = undefined;
            this.personaId = message.type === 'storyCue' || message.active ? 'katha' : undefined;
          }
          if (message.type === 'persona') {
            this.personaId = message.characterId;
            this.currentPersona = {
              type: 'summonPersona',
              packId: message.packId,
              characterId: message.characterId,
            };
            if (
              this.selecting?.type === 'persona' &&
              this.samePersona(this.selecting.message, this.currentPersona)
            )
              this.selecting.acknowledged = true;
          }
          if (message.type === 'worldCharacter') {
            this.currentPersona = undefined;
            this.personaId = message.entityId ?? undefined;
          }
          if (message.type === 'summon') {
            this.currentPersona = undefined;
            this.personaId = undefined;
          }
          if (
            (message.type === 'persona' ||
              message.type === 'worldCharacter' ||
              message.type === 'storyVoice' ||
              message.type === 'storyCue') &&
            (this.personaId ?? this.hello?.characterId) !== before
          )
            this.handOff(before);
          if (message.type === 'error' && this.selecting) {
            const rejected = this.selecting;
            if (rejected.type === 'character' && this.wantedCharacter === rejected.characterId)
              this.wantedCharacter = undefined;
            if (
              rejected.type === 'world' &&
              this.wantedWorld &&
              this.sameWorld(this.wantedWorld.message, rejected.message)
            )
              this.wantedWorld = undefined;
            if (
              rejected.type === 'persona' &&
              this.wantedPersona &&
              this.samePersona(this.wantedPersona, rejected.message)
            )
              this.wantedPersona = undefined;
            this.selecting = undefined;
            // A wish waiting for a rejected world must never be delivered into the previous one.
            this.waiting = [];
            this.setStatus('connected');
          }
          if (
            message.type === 'error' &&
            [
              'UNAUTHENTICATED',
              'FORBIDDEN',
              'QUOTA_EXHAUSTED',
              'SESSION_ACTIVE_ELSEWHERE',
              'KILL_SWITCH',
            ].includes(message.code)
          ) {
            this.ended = true;
            this.resetControls();
            clearTimeout(this.timer);
            this.audio.stopCapture();
            this.audio.flush();
            socket.close();
            this.setStatus('error');
          }
          if (message.type === 'ready') {
            this.retry = 0;
            this.hello!.sessionId = message.sessionId;
            this.hello!.characterId = message.characterId;
            if (message.worldId) this.hello!.worldId = message.worldId;
            else delete this.hello!.worldId;
            if (this.selecting?.type === 'persona' && this.selecting.acknowledged) {
              if (
                this.wantedPersona &&
                this.samePersona(this.wantedPersona, this.selecting.message)
              )
                this.wantedPersona = undefined;
              this.selecting = undefined;
            }
            if (
              this.selecting?.type === 'character' &&
              this.selecting.characterId === message.characterId
            ) {
              if (this.wantedCharacter === message.characterId) this.wantedCharacter = undefined;
              this.personaId = undefined;
              this.currentPersona = undefined;
              this.selecting = undefined;
            }
            if (
              this.wantedCharacter === message.characterId &&
              !this.personaId &&
              this.selecting?.type !== 'character'
            )
              this.wantedCharacter = undefined;
            const world = this.wantedWorld;
            if (
              world &&
              ((world.message.type === 'openWorld' && world.message.worldId === message.worldId) ||
                (world.message.type === 'newGame' && world.sent && !message.worldId))
            )
              this.wantedWorld = undefined;
            if (
              this.selecting?.type === 'world' &&
              ((this.selecting.message.type === 'openWorld' &&
                this.selecting.message.worldId === message.worldId) ||
                (this.selecting.message.type === 'newGame' && !message.worldId))
            )
              this.selecting = undefined;
            this.setStatus('connected');
            this.flushControls();
          }
          if (message.type === 'characterState' || message.type === 'summon')
            this.hello!.characterId = message.characterId;
          if (message.type === 'characterState' && message.emotion === 'thinking') {
            this.audio.flush();
            this.setStatus('reconnecting');
          }
          if (message.type === 'newGame') {
            delete this.hello!.worldId;
            if (this.selecting?.type === 'world' && this.selecting.message.type === 'newGame') {
              if (
                this.wantedWorld &&
                this.sameWorld(this.wantedWorld.message, this.selecting.message)
              )
                this.wantedWorld = undefined;
              this.selecting = undefined;
              this.setStatus('connected');
              this.flushControls();
            }
          }
          if (message.type === 'worldJob') this.hello!.worldId = message.worldId;
          if (message.type === 'interrupted') this.audio.flush();
          if (message.type === 'bye') {
            this.resetControls();
            this.ended = true;
            this.audio.stopCapture();
            this.audio.flush();
            socket.close();
            this.setStatus('closed');
          }
          if (message.type === 'error' && !this.ended) this.flushControls();
          for (const listener of this.listeners) listener(message);
        } catch {
          this.setStatus('error');
        }
      };
      socket.onerror = () => {
        if (!this.ended && generation === this.generation) this.setStatus('reconnecting');
      };
      socket.onclose = () => {
        if (generation === this.generation) {
          this.socket = undefined;
          this.selecting = undefined;
          this.scheduleReconnect();
        }
      };
    } catch {
      if (!this.ended && generation === this.generation) this.scheduleReconnect();
    }
  }
  private scheduleReconnect() {
    if (this.ended) return;
    this.audio.flush();
    if (this.retry >= 5) {
      this.ended = true;
      this.audio.stopCapture();
      this.setStatus('error');
      return;
    }
    this.setStatus('reconnecting');
    this.timer = setTimeout(() => void this.open(), 500 * 2 ** this.retry++);
  }
  send(message: Control) {
    const parsed = ClientMessageSchema.parse(message);
    if (parsed.type === 'summonPersona' && !this.ended && this.hello) {
      this.wantedPersona = parsed;
      this.audio.flush();
      this.flushControls();
      return;
    }
    if (parsed.type === 'hangUp') this.wantedPersona = undefined;
    if (parsed.type === 'switchCharacter' && !this.ended && this.hello) {
      this.wantedPersona = undefined;
      this.wantedCharacter = parsed.characterId;
      this.audio.flush();
      this.flushControls();
      return;
    }
    if ((parsed.type === 'openWorld' || parsed.type === 'newGame') && !this.ended && this.hello) {
      this.wantedPersona = undefined;
      if (!this.wantedWorld || !this.sameWorld(this.wantedWorld.message, parsed))
        this.wantedWorld = { message: parsed, sent: false };
      this.audio.flush();
      this.flushControls();
      return;
    }
    if (
      ['text', 'undoWorld', 'talkToCharacter', 'learningPlay'].includes(parsed.type) &&
      !this.ended &&
      this.hello &&
      (this.status !== 'connected' || this.selectionPending || this.socket?.readyState !== 1)
    ) {
      if (this.waiting.length >= 16) throw new Error('Voice is still connecting. Please wait.');
      this.waiting.push(parsed as Control);
      return;
    }
    if (this.socket?.readyState === 1) this.socket.send(JSON.stringify(parsed));
  }
  end() {
    this.send({ type: 'end' });
    this.ended = true;
    this.resetControls();
    clearTimeout(this.timer);
    this.generation++;
    this.connecting = false;
    this.socket?.close();
    this.socket = undefined;
    this.audio.stopCapture();
    this.audio.flush();
    this.setStatus('closed');
  }
  async dispose() {
    this.end();
    this.listeners.clear();
    this.statusListeners.clear();
    await this.audio.dispose();
  }
}
