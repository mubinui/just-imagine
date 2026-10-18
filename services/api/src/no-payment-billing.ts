import {
  SubscriptionDocSchema,
  UserDocSchema,
  paths,
  type FamilyPlanId,
} from '@just-imagine/protocol';
import { db, transaction } from '@just-imagine/server-core';
import { ApiFault } from './errors';
import type { Billing } from './app';

/**
 * Subscriptions without payment, for a deployment that takes no payments yet
 * (`SUBSCRIPTIONS_WITHOUT_PAYMENT=1` with Stripe not configured). Starting the Family plan
 * activates it at once; cancelling returns the family to the free plan.
 */
export class NoPaymentBilling implements Billing {
  readonly mode = 'no-payment' as const;
  constructor(private config: { webUrl: string }) {}

  async checkout(uid: string, planId: FamilyPlanId = 'family-month') {
    await transaction(async (tx) => {
      const userRef = db().doc(paths.user(uid)),
        subRef = db().doc(paths.subscription(uid));
      const [userSnap, deleting, subSnap] = await Promise.all([
        tx.get(userRef),
        tx.get(db().doc(`deletionLocks/${uid}`)),
        tx.get(subRef),
      ]);
      if (deleting.exists) throw new ApiFault(403, 'FORBIDDEN', 'Account deletion is in progress.');
      const user = userSnap.exists ? UserDocSchema.parse(userSnap.data()) : null;
      if (!user?.consentAt) throw new ApiFault(403, 'FORBIDDEN', 'Complete parent sign-up first.');
      const sub = subSnap.exists ? SubscriptionDocSchema.parse(subSnap.data()) : null;
      const active = user.plan === 'family' && sub && ['active', 'trialing'].includes(sub.status);
      // Switching between the monthly and yearly promotion is fine; choosing the same one twice is not.
      if (active && (sub.planId ?? 'family-month') === planId)
        throw new ApiFault(409, 'PLAN_LIMIT', 'Your family already has this plan.');
      tx.set(
        subRef,
        SubscriptionDocSchema.parse({
          stripeSubscriptionId: '',
          source: 'no-payment',
          planId,
          status: 'active',
          tier: 'family',
          currentPeriodEnd: 0,
        }),
      );
      tx.set(userRef, { ...user, plan: 'family' });
    });
    return { url: `${this.config.webUrl}/parent/billing?checkout=success` };
  }

  async portal(_uid: string) {
    return { url: `${this.config.webUrl}/parent/billing` };
  }

  async webhook(_raw: Buffer, _signature: string): Promise<void> {
    throw new ApiFault(404, 'NOT_FOUND', 'This deployment takes no payments.');
  }

  /** Ends a plan started without payment. Also called by account deletion, so a missing account is fine. */
  async cancel(uid: string) {
    await transaction(async (tx) => {
      const userRef = db().doc(paths.user(uid)),
        subRef = db().doc(paths.subscription(uid));
      const [userSnap, subSnap] = await Promise.all([tx.get(userRef), tx.get(subRef)]);
      const sub = subSnap.exists ? SubscriptionDocSchema.parse(subSnap.data()) : null;
      if (sub?.source !== 'no-payment') return;
      tx.set(subRef, { ...sub, status: 'canceled', tier: 'free' });
      if (userSnap.exists)
        tx.set(userRef, { ...UserDocSchema.parse(userSnap.data()), plan: 'free' });
    });
  }
}
