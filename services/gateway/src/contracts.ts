export type ByeReason = Extract<ServerMessage, { type: 'bye' }>['reason'];
import type {
  CharacterId,
  ChildDoc,
  PlanTier,
  ServerMessage,
  BuilderJob,
  SessionDoc,
  WorldDoc,
} from '@just-imagine/protocol';
export interface Identity {
  uid: string;
  childId: string;
  child: ChildDoc;
  plan: PlanTier;
  remaining: number;
}
export interface SessionRecord {
  id: string;
  identity: Identity;
  characterId: CharacterId;
  worldId?: string;
  startedAt: number;
  stats?: Pick<SessionDoc, 'turns' | 'beats' | 'discoveries' | 'predictions'>;
  completedLoops?: number;
}
export interface SessionStore {
  authorize(token: string, childId: string): Promise<Identity>;
  claim(record: SessionRecord): Promise<void>;
  meter(record: SessionRecord, totalSeconds: number): Promise<number>;
  finish(record: SessionRecord, summary: string, reason: ByeReason): Promise<void>;
  killSwitch(): Promise<boolean>;
  world(record: SessionRecord, id: string): Promise<WorldDoc>;
  enqueue(job: BuilderJob): Promise<void>;
  discover(
    record: SessionRecord,
    concept: string,
    explanation: string,
  ): Promise<Extract<ServerMessage, { type: 'discovery' }>>;
  watchJob?(id: string, callback: (status: string) => void): () => void;
  watchWorld(id: string, callback: (world: WorldDoc) => void): () => void;
}
export interface LiveCallbacks {
  audio(data: Uint8Array): void;
  transcript(role: 'child' | 'character', text: string, final: boolean): void;
  interrupted(): void;
  tool(id: string, name: string, args: unknown): void;
  resume(handle: string): void;
  closed(): void;
}
export interface LiveConnection {
  audio(data: Uint8Array): void;
  text(text: string): void;
  toolResult(id: string, name: string, result: unknown): void;
  close(): void;
}
export interface LiveProvider {
  open(
    record: SessionRecord,
    summary: string,
    handle: string | undefined,
    callbacks: LiveCallbacks,
  ): Promise<LiveConnection>;
  summarize(transcript: string[]): Promise<string>;
  moderate(text: string): Promise<'safe' | 'redirect' | 'block'>;
}
