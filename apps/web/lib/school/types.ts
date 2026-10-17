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
export type Lesson = LessonDoc & { id: string };
export type LessonKeys = z.infer<typeof LessonKeysDocSchema>;
export type PinCard = { student: Student; pin: string };
export type SchoolMe = {
  uid: string;
  schoolId: string | null;
  superAdmin: boolean;
  school: School;
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
