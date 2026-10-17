import { describe, it, expect } from 'vitest';
import { AdminAuditDocSchema } from '../src/admin';

const entry = (action: string, kind: string) => ({
  actorUid: 'ops',
  actorEmail: 'ops@example.test',
  action,
  target: { kind, id: 's1' },
  before: null,
  after: { status: 'active' },
  reason: 'Pilot school',
  at: 1,
});

describe('admin audit for schools', () => {
  it('accepts school, catalog and lesson actions and targets', () => {
    for (const [action, kind] of [
      ['school.create', 'school'],
      ['school.update', 'school'],
      ['school.suspend', 'school'],
      ['school.reinstate', 'school'],
      ['school.invite', 'school'],
      ['school.inviteRevoke', 'school'],
      ['catalog.publish', 'catalog'],
      ['catalog.retire', 'catalog'],
      ['lesson.publish', 'lesson'],
      ['lesson.archive', 'lesson'],
    ])
      expect(AdminAuditDocSchema.safeParse(entry(action!, kind!)).success).toBe(true);
  });

  it('still rejects unknown actions and targets', () => {
    expect(AdminAuditDocSchema.safeParse(entry('school.explode', 'school')).success).toBe(false);
    expect(AdminAuditDocSchema.safeParse(entry('school.create', 'teacher')).success).toBe(false);
  });
});
