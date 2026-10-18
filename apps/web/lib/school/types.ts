import type { z } from 'zod';
import type {
  SchoolDocSchema,
  SchoolClassDocSchema,
  StudentDocSchema,
  LessonDoc,
  LessonKeysDocSchema,
  BoardDoc,
} from '@just-imagine/protocol';
export type School = z.infer<typeof SchoolDocSchema> & {
  id: string;
  students?: number;
  studentCount?: number;
  teachers?: number;
  teacherCount?: number;
  seatsUsed?: number;
  voiceSecondsToday?: number;
};
export type SchoolClass = z.infer<typeof SchoolClassDocSchema> & { id: string };
export type Student = z.infer<typeof StudentDocSchema> & { id: string };
/** The teacher roster adds the sign-in lock state (never the PIN or its hash). */
export type RosterStudent = Student & { signIn?: { failures: number; locked: boolean } };
export type ActivityRow = {
  studentId: string;
  firstName: string;
  classId: string;
  lessonId: string;
  lessonTitle: { en: string; bn: string };
  status: 'inProgress' | 'submitted';
  score: { correct: number; total: number } | null;
  completedAt: number | null;
  updatedAt: number;
};
export type Lesson = LessonDoc & { id: string };
export type LessonKeys = z.infer<typeof LessonKeysDocSchema>;
export type PinCard = { student: Student; pin: string };
export type SchoolMe = {
  uid: string;
  schoolId: string | null;
  superAdmin: boolean;
  school: School;
  /** Plans can be taken as a free promotion while payments are off. */
  promotions?: boolean;
};
export type StudyMe = {
  uid: string;
  schoolId: string;
  studentId: string;
  classId: string;
  student?: Student;
  school?: School;
};
export type BoardResponse = {
  board: BoardDoc | null;
  own?: { points: number; rank: number | null };
};
export type GradeResult = {
  itemId: string;
  correct: boolean;
  explanation?: { en: string; bn: string };
  pointsAwarded?: number;
  hint?: { en: string; bn: string };
};
export type GradeResponse = { results: GradeResult[]; pointsAwarded: number; pointsAll?: number };
