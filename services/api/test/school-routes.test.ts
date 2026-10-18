import { describe, it, expect } from 'vitest';
import { SchoolRoleRequiredError } from '@just-imagine/server-core';
import { createApi } from '../src/app';
import type { ApiStore } from '../src/store';

function harness() {
  const store = new Proxy({}, { get: () => async () => ({ uid: 'parent' }) }) as ApiStore;
  return createApi({
    store,
    origins: [],
    verifyToken: async () => ({ uid: 'parent' }),
    isSuspended: async () => false,
    admin: { verifyAdmin: async () => ({ uid: 'ops', email: null }) },
    school: {
      verifySchoolAdmin: async (token, schoolId) => {
        if (token === 'teacher') {
          if (schoolId !== undefined && schoolId !== 's1') throw new SchoolRoleRequiredError();
          return { uid: 't1', email: 't@example.test', schoolId: 's1', superAdmin: false };
        }
        if (token === 'admin')
          return { uid: 'ops', email: null, schoolId: schoolId ?? null, superAdmin: true };
        if (token === 'student') throw new SchoolRoleRequiredError();
        throw new Error('internal detail: bad token');
      },
      verifyStudent: async (token) => {
        if (token === 'student' || token === 'paused')
          return {
            uid: 'st_s1_p1',
            schoolId: token === 'paused' ? 's2' : 's1',
            studentId: 'p1',
            classId: 'c1',
          };
        if (token === 'teacher') throw new SchoolRoleRequiredError();
        throw new Error('internal detail: bad token');
      },
      isSchoolSuspended: async (schoolId) => schoolId === 's2',
    },
  });
}
const get = (app: ReturnType<typeof harness>, url: string, token?: string) =>
  app.inject({ url, headers: token ? { authorization: `Bearer ${token}` } : {} });

describe('teacher scope', () => {
  it('requires a token and the school role', async () => {
    const app = harness();
    expect((await get(app, '/v1/school/me')).statusCode).toBe(401);
    const bad = await get(app, '/v1/school/me', 'garbage');
    expect(bad.statusCode).toBe(401);
    expect(bad.body).not.toContain('internal detail');
    const student = await get(app, '/v1/school/me', 'student');
    expect(student.statusCode).toBe(403);
    expect(student.json().error.code).toBe('FORBIDDEN');
    await app.close();
  });

  it('answers for a teacher, refuses another school, and lets the super admin choose one', async () => {
    const app = harness();
    const me = await get(app, '/v1/school/me', 'teacher');
    expect(me.statusCode).toBe(200);
    expect(me.json()).toEqual({ uid: 't1', schoolId: 's1', superAdmin: false, promotions: false });
    expect((await get(app, '/v1/school/me?schoolId=s2', 'teacher')).statusCode).toBe(403);
    expect((await get(app, '/v1/school/me?schoolId=s9', 'admin')).json()).toEqual({
      uid: 'ops',
      schoolId: 's9',
      superAdmin: true,
      promotions: false,
    });
    expect((await get(app, '/v1/school/me?schoolId=a%2Fb', 'admin')).statusCode).toBe(400);
    await app.close();
  });
});

describe('student scope', () => {
  it('answers for a student and refuses teachers and paused schools', async () => {
    const app = harness();
    const me = await get(app, '/v1/study/me', 'student');
    expect(me.statusCode).toBe(200);
    expect(me.json()).toEqual({ uid: 'st_s1_p1', schoolId: 's1', studentId: 'p1', classId: 'c1' });
    expect((await get(app, '/v1/study/me', 'teacher')).statusCode).toBe(403);
    const paused = await get(app, '/v1/study/me', 'paused');
    expect(paused.statusCode).toBe(403);
    expect(paused.json().error.message).toContain('paused');
    expect((await get(app, '/v1/study/me')).statusCode).toBe(401);
    await app.close();
  });
});

describe('isolation', () => {
  it('leaves parent routes untouched', async () => {
    const app = harness();
    expect((await get(app, '/v1/me', 'parent')).statusCode).toBe(200);
    await app.close();
  });
});
