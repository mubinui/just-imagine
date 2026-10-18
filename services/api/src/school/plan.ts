import { z } from 'zod';
import {
  PLAN_CATALOGUE,
  SchoolDocSchema,
  SchoolPlanIdSchema,
  schoolPaths,
} from '@just-imagine/protocol';
import { db, transaction, type SchoolAdminActor } from '@just-imagine/server-core';
import { audit, fail } from './common';

const BodySchema = z.strictObject({ planId: SchoolPlanIdSchema });

/**
 * A teacher takes a school plan as a free promotion while the deployment takes no payments:
 * the school gets the plan's seats and daily voice allowance. A plan with fewer seats than
 * the school already uses is refused, so no student loses access.
 */
export async function chooseSchoolPlan(actor: SchoolAdminActor, raw: unknown, promotions: boolean) {
  const { planId } = BodySchema.parse(raw);
  if (!promotions)
    return fail(409, 'School plans are arranged with Just Imagine. Ask us to change yours.');
  if (!actor.schoolId) return fail(403, 'Open a school first.');
  const offer = PLAN_CATALOGUE.find((plan) => plan.id === planId)!;
  const ref = db().doc(schoolPaths.school(actor.schoolId));
  const students = (
    await db().collection(schoolPaths.students(actor.schoolId)).count().get()
  ).data().count;
  const { before, after } = await transaction(async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists) return fail(404, 'This school is no longer available.');
    const school = SchoolDocSchema.parse(snap.data());
    if (students > offer.seats!)
      return fail(
        409,
        `This plan has ${offer.seats} seats and the school already has ${students} students.`,
      );
    const next = SchoolDocSchema.parse({
      ...school,
      planId,
      seats: offer.seats,
      voiceSecondsPerDay: offer.voiceSecondsPerDay,
    });
    tx.set(ref, next);
    return { before: school, after: next };
  });
  await audit(
    { uid: actor.uid, email: actor.email ?? null },
    'school.plan',
    { kind: 'school', id: actor.schoolId },
    {
      planId: before.planId ?? null,
      seats: before.seats,
      voiceSecondsPerDay: before.voiceSecondsPerDay,
    },
    { planId: after.planId, seats: after.seats, voiceSecondsPerDay: after.voiceSecondsPerDay },
    'Free promotional plan chosen by the school',
  );
  return { school: { id: actor.schoolId, ...after } };
}
