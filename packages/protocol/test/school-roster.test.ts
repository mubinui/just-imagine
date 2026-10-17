import { describe, it, expect } from 'vitest';
import {
  LessonFieldsSchema,
  StudentDocSchema,
  StudentStatusSchema,
  STUDENT_USERNAME_PATTERN,
  StudentUsernameSchema,
} from '../src/school';

const student = {
  firstName: 'Rahim',
  username: 'rahim',
  classId: 'c1',
  avatar: 'fox',
  language: 'bn',
  createdAt: 1,
};

describe('student roster status', () => {
  it('treats existing student documents as active and accepts a suspension', () => {
    expect(StudentDocSchema.parse(student).status).toBe('active');
    expect(StudentDocSchema.parse({ ...student, status: 'suspended' }).status).toBe('suspended');
    expect(StudentStatusSchema.safeParse('removed').success).toBe(false);
  });
});

describe('username rules shared with the browser', () => {
  it('matches the server schema for every sample after lower-casing', () => {
    const browser = new RegExp(`^(?:${STUDENT_USERNAME_PATTERN})$`, 'v');
    for (const sample of ['rahim', 'rahim.9a', 'a_b-c', 'ab', '.rahim', 'রহিম', 'a'.repeat(33)])
      expect(browser.test(sample)).toBe(StudentUsernameSchema.safeParse(sample).success);
  });
});

describe('lesson copy provenance', () => {
  it('keeps the shared lesson a school copy came from', () => {
    const shape = LessonFieldsSchema.shape;
    expect(shape.copiedFrom.safeParse(undefined).success).toBe(true);
    expect(shape.copiedFrom.safeParse('w_shared').success).toBe(true);
  });
});
