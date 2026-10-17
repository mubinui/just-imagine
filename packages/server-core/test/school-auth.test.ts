import { describe, it, expect, beforeAll } from 'vitest';
import { idTokenFor } from './emulator';
import { db } from '../src/firebase';
import {
  AuthError,
  isSchoolSuspended,
  requireSchoolAdmin,
  requireStudent,
  SchoolRoleRequiredError,
} from '../src/auth';

const student = { role: 'student', schoolId: 'sa1', studentId: 'p1', classId: 'c1' };
const teacher = { role: 'schoolAdmin', schoolId: 'sa1' };

beforeAll(async () => {
  await db().doc('schools/sa1/members/t_sa1').set({ role: 'schoolAdmin' });
  await db().doc('schools/sa1/classes/c1').set({ grade: 9 });
  await db().doc('schools/sa1/students/p1').set({ classId: 'c1', authVersion: 0 });
});
describe('requireSchoolAdmin', () => {
  it('accepts a teacher for their own school and refuses other schools', async () => {
    const token = await idTokenFor('t_sa1', teacher);
    await expect(requireSchoolAdmin(token)).resolves.toMatchObject({
      uid: 't_sa1',
      schoolId: 'sa1',
      superAdmin: false,
    });
    await expect(requireSchoolAdmin(token, 'sa1')).resolves.toMatchObject({ schoolId: 'sa1' });
    await expect(requireSchoolAdmin(token, 'sa2')).rejects.toBeInstanceOf(SchoolRoleRequiredError);
  });

  it('lets the super admin act inside any school', async () => {
    const token = await idTokenFor('ops_sa', { admin: true });
    await expect(requireSchoolAdmin(token, 'sa9')).resolves.toMatchObject({
      schoolId: 'sa9',
      superAdmin: true,
    });
  });

  it('refuses students, parents and garbage', async () => {
    await expect(requireSchoolAdmin(await idTokenFor('st_sa1_p1', student))).rejects.toBeInstanceOf(
      SchoolRoleRequiredError,
    );
    await expect(requireSchoolAdmin(await idTokenFor('parent_sa'))).rejects.toBeInstanceOf(
      SchoolRoleRequiredError,
    );
    await expect(requireSchoolAdmin('nope')).rejects.toBeInstanceOf(AuthError);
  });
});

describe('requireStudent', () => {
  it('accepts a student whose uid matches their claims', async () => {
    await expect(requireStudent(await idTokenFor('st_sa1_p1', student))).resolves.toEqual({
      uid: 'st_sa1_p1',
      schoolId: 'sa1',
      studentId: 'p1',
      classId: 'c1',
    });
  });

  it('refuses student claims on a uid that is not the student uid', async () => {
    await expect(requireStudent(await idTokenFor('someone_else', student))).rejects.toBeInstanceOf(
      SchoolRoleRequiredError,
    );
  });

  it('refuses teachers', async () => {
    await expect(requireStudent(await idTokenFor('t_sa1b', teacher))).rejects.toBeInstanceOf(
      SchoolRoleRequiredError,
    );
  });
});

describe('isSchoolSuspended', () => {
  it('fails closed for a missing school and reads status otherwise', async () => {
    const base = {
      name: 'Test School',
      nameBn: 'টেস্ট স্কুল',
      code: 'AB2C3D',
      seats: 40,
      voiceSecondsPerDay: 3600,
      createdAt: 1,
    };
    await db()
      .doc('schools/sa_active')
      .set({ ...base, status: 'active' });
    await db()
      .doc('schools/sa_paused')
      .set({ ...base, status: 'suspended' });
    expect(await isSchoolSuspended('sa_active')).toBe(false);
    expect(await isSchoolSuspended('sa_paused')).toBe(true);
    expect(await isSchoolSuspended('sa_missing')).toBe(true);
  });
});
