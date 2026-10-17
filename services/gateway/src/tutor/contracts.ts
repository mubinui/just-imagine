import type { LessonDoc, ServerMessage, StudentDoc } from '@just-imagine/protocol';
import type { LiveCallbacks, LiveConnection } from '../contracts';

export interface TutorRecord {
  id: string;
  token: string;
  uid: string;
  schoolId: string;
  studentId: string;
  classId: string;
  language: 'en' | 'bn';
  lessonId: string;
  lesson: LessonDoc;
  stepIndex: number;
  characterId: 'pori' | 'onkomama';
  startedAt: number;
  remaining: number;
}
export interface TutorStore {
  authorize(token: string, lessonId: string, stepIndex: number): Promise<TutorRecord>;
  /** Atomic, monotonic metering; also rechecks school, roster, lesson and kill switch. */
  meter(record: TutorRecord, totalSeconds: number): Promise<number>;
  /** Releases only the matching distributed student lease, accounting for the final interval. */
  release?(record: TutorRecord, totalSeconds: number): Promise<void>;
  hint(record: TutorRecord, itemId: string, index: number): Promise<string>;
  result(record: TutorRecord): Promise<unknown>;
}
export interface TutorConnection extends LiveConnection {
  context(text: string): void;
}
export interface TutorProvider {
  open(record: TutorRecord, callbacks: LiveCallbacks): Promise<TutorConnection>;
  moderate(text: string): Promise<'safe' | 'redirect' | 'block'>;
}
export interface TutorOptions {
  store: TutorStore;
  provider: TutorProvider;
  meterIntervalMs?: number;
}
export type TutorSend = (message: ServerMessage) => void;
export type TutorStudent = Pick<StudentDoc, 'classId' | 'language'>;
