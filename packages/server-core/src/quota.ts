import {
  PLAN_LIMITS,
  UsageDailyDocSchema,
  paths,
  yyyymmdd,
  PlanTierSchema,
  type PlanTier,
  type UsageDailyDoc,
} from '@just-imagine/protocol';
import { db } from './firebase';
import { transaction } from './transaction';

export class QuotaExceeded extends Error {
  constructor(
    public readonly kind: 'voice' | 'worlds' | 'images',
    public readonly limit: number,
  ) {
    super(`${kind} quota of ${limit} exhausted`);
    this.name = 'QuotaExceeded';
  }
}

function emptyUsage(uid: string, date: string): UsageDailyDoc {
  return { uid, date, voiceSeconds: 0, worlds: 0, images: 0 };
}

function parseUsage(data: unknown, uid: string, date: string): UsageDailyDoc {
  const usage = UsageDailyDocSchema.parse(data);
  if (usage.uid !== uid || usage.date !== date) throw new Error('usage identity mismatch');
  return usage;
}
function increment(value: number, integer: boolean): number {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    (integer && !Number.isSafeInteger(value)) ||
    !Number.isSafeInteger(Math.round(value))
  )
    throw new RangeError('invalid increment');
  return Math.round(value);
}
async function bump(
  uid: string,
  now: Date,
  apply: (usage: UsageDailyDoc) => UsageDailyDoc,
): Promise<UsageDailyDoc> {
  const date = yyyymmdd(now);
  const ref = db().doc(paths.usageDaily(uid, date));
  return transaction(async (tx) => {
    const snap = await tx.get(ref);
    if ((await tx.get(db().doc(`deletionLocks/${uid}`))).exists)
      throw new Error('Account deletion is in progress');
    const current = snap.exists ? parseUsage(snap.data(), uid, date) : emptyUsage(uid, date);
    const next = parseUsage(apply(current), uid, date);
    tx.set(ref, next);
    return next;
  });
}

export async function reserveWorld(
  uid: string,
  plan: PlanTier,
  now = new Date(),
): Promise<{ worldsUsed: number; worldsLeft: number }> {
  const limit = PLAN_LIMITS[PlanTierSchema.parse(plan)].worldsPerDay;
  const next = await bump(uid, now, (u) => {
    if (u.worlds >= limit) throw new QuotaExceeded('worlds', limit);
    return { ...u, worlds: u.worlds + 1 };
  });
  return { worldsUsed: next.worlds, worldsLeft: limit - next.worlds };
}

export async function addVoiceSeconds(
  uid: string,
  plan: PlanTier,
  seconds: number,
  now = new Date(),
): Promise<{ voiceSecondsLeft: number }> {
  const amount = increment(seconds, false);
  const limit = PLAN_LIMITS[PlanTierSchema.parse(plan)].voiceSecondsPerDay;
  const next = await bump(uid, now, (u) => ({ ...u, voiceSeconds: u.voiceSeconds + amount }));
  return { voiceSecondsLeft: limit - next.voiceSeconds };
}

export async function voiceSecondsLeft(
  uid: string,
  plan: PlanTier,
  now = new Date(),
): Promise<number> {
  const date = yyyymmdd(now);
  const snap = await db().doc(paths.usageDaily(uid, date)).get();
  const used = snap.exists ? parseUsage(snap.data(), uid, date).voiceSeconds : 0;
  return PLAN_LIMITS[PlanTierSchema.parse(plan)].voiceSecondsPerDay - used;
}

export async function addImages(uid: string, count: number, now = new Date()): Promise<void> {
  const amount = increment(count, true);
  await bump(uid, now, (u) => ({ ...u, images: u.images + amount }));
}
