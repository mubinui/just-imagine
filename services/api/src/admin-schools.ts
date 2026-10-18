import type { FastifyInstance } from 'fastify';
import { randomBytes } from 'node:crypto';
import { z } from 'zod';
import {
  SchoolDocSchema,
  SchoolInviteDocSchema,
  SchoolUsageDailyDocSchema,
  schoolPaths,
  DocumentIdSchema,
} from '@just-imagine/protocol';
import {
  requireAdmin,
  AdminRequiredError,
  type SchoolAdminActor,
  transaction,
} from '@just-imagine/server-core';
import { db, newId, read, fail, hash, reasonSchema, dateKey } from './school/common';
const createSchema = SchoolDocSchema.pick({
  name: true,
  nameBn: true,
  seats: true,
  voiceSecondsPerDay: true,
}).extend({ reason: reasonSchema });
const patchSchema = createSchema
  .partial()
  .extend({ reason: reasonSchema, status: z.enum(['active', 'suspended']).optional() });
export async function adminActor(req: {
  headers: { authorization?: string };
}): Promise<SchoolAdminActor> {
  const token = req.headers.authorization;
  if (!token?.startsWith('Bearer ')) return fail(403, 'An operator account is required.');
  const actor = await requireAdmin(token.slice(7)).catch((e: unknown) => {
    if (e instanceof AdminRequiredError) return fail(403, 'An operator account is required.');
    return fail(401, 'Sign in again to continue.');
  });
  return { ...actor, schoolId: null, superAdmin: true };
}
const id = (value: unknown) =>
  DocumentIdSchema.parse(z.object({ id: DocumentIdSchema }).parse(value).id);
export function registerAdminSchoolRoutes(app: FastifyInstance) {
  app.register(async (routes) => {
    routes.addHook('preHandler', async (req) => {
      await adminActor(req);
    });
    routes.get('/v1/admin/schools', async () => {
      const snap = await db().collection('schools').orderBy('createdAt', 'desc').limit(200).get();
      return {
        schools: await Promise.all(
          snap.docs.map(async (d) => {
            const [students, members, usage] = await Promise.all([
              d.ref.collection('students').count().get(),
              d.ref.collection('members').count().get(),
              db().doc(schoolPaths.usageDaily(d.id, dateKey())).get(),
            ]);
            return {
              id: d.id,
              ...SchoolDocSchema.parse(d.data()),
              studentCount: students.data().count,
              teacherCount: members.data().count,
              voiceSecondsToday: usage.exists
                ? SchoolUsageDailyDocSchema.parse(usage.data()).voiceSeconds
                : 0,
            };
          }),
        ),
      };
    });
    routes.post('/v1/admin/schools', async (req, reply) => {
      const body = createSchema.parse(req.body),
        actor = await adminActor(req),
        schoolId = newId('s');
      const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
      let code = '';
      for (let attempt = 0; attempt < 10; attempt++) {
        code = [...randomBytes(6)].map((n) => alphabet[n % alphabet.length]).join('');
        try {
          const school = SchoolDocSchema.parse({
            ...body,
            code,
            status: 'active',
            createdAt: Date.now(),
          });
          await transaction(async (tx) => {
            const codeRef = db().doc(schoolPaths.schoolCode(code));
            if ((await tx.get(codeRef)).exists) throw new Error('CODE_TAKEN');
            tx.create(codeRef, { schoolId });
            tx.create(db().doc(schoolPaths.school(schoolId)), school);
            tx.create(db().doc(`adminAudit/${newId('j')}`), {
              actorUid: actor.uid,
              actorEmail: actor.email,
              action: 'school.create',
              target: { kind: 'school', id: schoolId },
              before: null,
              after: school,
              reason: body.reason,
              at: Date.now(),
            });
          });
          return reply.code(201).send({ school: { id: schoolId, ...school } });
        } catch (e) {
          if (!(e instanceof Error) || e.message !== 'CODE_TAKEN') throw e;
        }
      }
      return fail(409, 'Could not reserve a school code. Try again.');
    });
    routes.get('/v1/admin/schools/:id', async (req) => {
      const schoolId = id(req.params);
      const [school, invites, members, count] = await Promise.all([
        read(schoolPaths.school(schoolId), SchoolDocSchema),
        db().collection(schoolPaths.invites(schoolId)).get(),
        db().collection(schoolPaths.members(schoolId)).get(),
        db().collection(schoolPaths.students(schoolId)).count().get(),
      ]);
      return {
        school: { id: schoolId, ...school, studentCount: count.data().count },
        invites: invites.docs.map((d) => ({
          id: d.id,
          email: d.get('email'),
          expiresAt: d.get('expiresAt'),
        })),
        members: members.docs.map((d) => ({ id: d.id, ...d.data() })),
      };
    });
    routes.patch('/v1/admin/schools/:id', async (req) => {
      const schoolId = id(req.params),
        body = patchSchema.parse(req.body),
        actor = await adminActor(req);
      return transaction(async (tx) => {
        const ref = db().doc(schoolPaths.school(schoolId)),
          snap = await tx.get(ref);
        if (!snap.exists) return fail(404, 'School not found.');
        const before = SchoolDocSchema.parse(snap.data()),
          after = SchoolDocSchema.parse({ ...before, ...body });
        const count = await tx.get(ref.collection('students'));
        if (after.seats < count.size)
          return fail(409, 'Seats cannot be lower than the current student count.');
        tx.set(ref, after);
        tx.create(db().doc(`adminAudit/${newId('j')}`), {
          actorUid: actor.uid,
          actorEmail: actor.email,
          // Forms resend the current status with every edit; only a real change is a pause or a reinstatement.
          action:
            before.status === after.status
              ? 'school.update'
              : after.status === 'suspended'
                ? 'school.suspend'
                : 'school.reinstate',
          target: { kind: 'school', id: schoolId },
          before,
          after,
          reason: body.reason,
          at: Date.now(),
        });
        return { school: { id: schoolId, ...after } };
      });
    });
    routes.post('/v1/admin/schools/:id/invites', async (req) => {
      const schoolId = id(req.params),
        body = z.object({ email: z.email(), reason: reasonSchema }).parse(req.body),
        actor = await adminActor(req);
      await read(schoolPaths.school(schoolId), SchoolDocSchema);
      const inviteId = newId('j'),
        token = `${schoolId}.${inviteId}.${randomBytes(32).toString('base64url')}`,
        expiresAt = Date.now() + 7 * 86400000;
      const invite = SchoolInviteDocSchema.parse({
        email: body.email.toLowerCase(),
        tokenHash: hash(token),
        expiresAt,
        createdBy: actor.uid,
        createdAt: Date.now(),
      });
      const batch = db().batch();
      batch.create(db().doc(schoolPaths.invite(schoolId, inviteId)), invite);
      batch.create(db().doc(`adminAudit/${newId('j')}`), {
        actorUid: actor.uid,
        actorEmail: actor.email,
        action: 'school.invite',
        target: { kind: 'school', id: schoolId },
        before: null,
        after: { email: invite.email, expiresAt },
        reason: body.reason,
        at: Date.now(),
      });
      await batch.commit();
      return {
        inviteId,
        inviteUrl: `${process.env['WEB_URL'] ?? 'http://localhost:3300'}/school/join?invite=${encodeURIComponent(token)}`,
        expiresAt,
      };
    });
    routes.delete('/v1/admin/schools/:id/invites/:inviteId', async (req) => {
      const { id: schoolId, inviteId } = z
          .object({ id: DocumentIdSchema, inviteId: DocumentIdSchema })
          .parse(req.params),
        { reason } = z.object({ reason: reasonSchema }).parse(req.body),
        actor = await adminActor(req);
      await transaction(async (tx) => {
        const ref = db().doc(schoolPaths.invite(schoolId, inviteId)),
          snap = await tx.get(ref);
        if (!snap.exists) return fail(404, 'That invite was already used or revoked.');
        const invite = SchoolInviteDocSchema.parse(snap.data());
        tx.delete(ref);
        tx.create(db().doc(`adminAudit/${newId('j')}`), {
          actorUid: actor.uid,
          actorEmail: actor.email,
          action: 'school.inviteRevoke',
          target: { kind: 'school', id: schoolId },
          before: { email: invite.email, expiresAt: invite.expiresAt },
          after: null,
          reason,
          at: Date.now(),
        });
      });
      return { ok: true };
    });
  });
}
