export type ByeReason = Extract<ServerMessage, { type: 'bye' }>['reason'];
import type {
  CharacterId,
  ChildDoc,
  PlanTier,
  ServerMessage,
  BuilderJob,
  SessionDoc,
  WorldDoc,
  StoryDoc,
} from '@just-imagine/protocol';
import type { SceneCharacter } from '@just-imagine/scene-schema';
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
  learningMode?: 'guided' | 'incidental';
  story?: { book?: StoryDoc; reading?: { readId: string; scene: number; beat: number } };
  startedAt: number;
  stats?: Pick<SessionDoc, 'turns' | 'beats' | 'discoveries' | 'predictions'>;
  completedLoops?: number;
  // Set while a Learning World pack character holds the voice session; the companion stays
  // `characterId` so hanging up returns to the child's friend.
  persona?: { packId: string; characterId: string };
  worldCharacter?: { worldId: string; entityId: string; character: SceneCharacter };
}
export interface PointsAward {
  packId: string;
  challengeId: string;
  points: number;
  petReward?: string;
}
export interface SessionStore {
  authorize(token: string, childId: string): Promise<Identity>;
  claim(record: SessionRecord): Promise<void>;
  meter(record: SessionRecord, totalSeconds: number): Promise<number>;
  finish(record: SessionRecord, summary: string, reason: ByeReason): Promise<void>;
  killSwitch(): Promise<boolean>;
  world(record: SessionRecord, id: string): Promise<WorldDoc>;
  story?(record: SessionRecord, id: string): Promise<StoryDoc>;
  enqueue(job: BuilderJob): Promise<void>;
  discover(
    record: SessionRecord,
    concept: string,
    explanation: string,
  ): Promise<Extract<ServerMessage, { type: 'discovery' }>>;
  watchJob?(id: string, callback: (status: string) => void): () => void;
  watchWorld(id: string, callback: (world: WorldDoc) => void): () => void;
  /** Adds validated challenge points to the child profile and returns the new total and pets. */
  awardPoints(
    record: SessionRecord,
    award: PointsAward,
  ): Promise<{ total: number; unlocked: string[] }>;
}
export interface LiveCallbacks {
  audio(data: Uint8Array): void;
  transcript(role: 'child' | 'character', text: string, final: boolean): void;
  interrupted(): void;
  turnComplete?(): void;
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
  drawLearningLook?(record: SessionRecord, description: string): Promise<string>;
  open(
    record: SessionRecord,
    summary: string,
    handle: string | undefined,
    callbacks: LiveCallbacks,
  ): Promise<LiveConnection>;
  summarize(transcript: string[]): Promise<string>;
  moderate(text: string): Promise<'safe' | 'redirect' | 'block'>;
}
