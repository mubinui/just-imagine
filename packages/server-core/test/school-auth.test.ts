import { describe, it, expect } from 'vitest';
import './emulator';
import { adminAuth, db } from '../src/firebase';
import {
  AuthError,
  isSchoolSuspended,
  requireSchoolAdmin,
  requireStudent,
  SchoolRoleRequiredError,
} from '../src/auth';

async function tokenFor(uid: string, claims: Record<string, unknown> = {}): Promise<string> {
  const custom = await adminAuth().createCustomToken(uid, claims);
  const res = await fetch(
    `http://${process.env['FIREBASE_AUTH_EMULATOR_HOST']}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: custom, returnSecureToken: true }),
    },
  );
  const body = (await res.json()) as { idToken?: string };
  if (!body.idToken) throw new Error('no idToken from auth emulator');
  return body.idToken;
}

const student = { role: 'student', schoolId: 'sa1', studentId: 'p1', classId: 'c1' };
const teacher = { role: 'schoolAdmin', schoolId: 'sa1' };

describe('requireSchoolAdmin', () => {
  it('accepts a teacher for their own school and refuses other schools', async () => {
    const token = await tokenFor('t_sa1', teacher);
    await expect(requireSchoolAdmin(token)).resolves.toMatchObject({
      uid: 't_sa1',
      schoolId: 'sa1',
      superAdmin: false,
    });
    await expect(requireSchoolAdmin(token, 'sa1')).resolves.toMatchObject({ schoolId: 'sa1' });
    await expect(requireSchoolAdmin(token, 'sa2')).rejects.toBeInstanceOf(SchoolRoleRequiredError);
  });

  it('lets the super admin act inside any school', async () => {
    const token = await tokenFor('ops_sa', { admin: true });
    await expect(requireSchoolAdmin(token, 'sa9')).resolves.toMatchObject({
      schoolId: 'sa9',
      superAdmin: true,
    });
  });

  it('refuses students, parents and garbage', async () => {
    await expect(requireSchoolAdmin(await tokenFor('st_sa1_p1', student))).rejects.toBeInstanceOf(
      SchoolRoleRequiredError,
    );
    await expect(requireSchoolAdmin(await tokenFor('parent_sa'))).rejects.toBeInstanceOf(
      SchoolRoleRequiredError,
    );
    await expect(requireSchoolAdmin('nope')).rejects.toBeInstanceOf(AuthError);
  });
});

describe('requireStudent', () => {
  it('accepts a student whose uid matches their claims', async () => {
    await expect(requireStudent(await tokenFor('st_sa1_p1', student))).resolves.toEqual({
      uid: 'st_sa1_p1',
      schoolId: 'sa1',
      studentId: 'p1',
      classId: 'c1',
    });
  });

  it('refuses student claims on a uid that is not the student uid', async () => {
    await expect(requireStudent(await tokenFor('someone_else', student))).rejects.toBeInstanceOf(
      SchoolRoleRequiredError,
    );
  });

  it('refuses teachers', async () => {
    await expect(requireStudent(await tokenFor('t_sa1b', teacher))).rejects.toBeInstanceOf(
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
