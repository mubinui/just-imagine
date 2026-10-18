import { randomUUID } from 'node:crypto';
import Stripe from 'stripe';
import { SubscriptionDocSchema, UserDocSchema, paths } from '@just-imagine/protocol';
import { db, readDoc, transaction } from '@just-imagine/server-core';
import { ApiFault } from './errors';
import type { Billing } from './app';
export class StripeBilling implements Billing {
  readonly mode = 'stripe' as const;
  private stripe: Stripe;
  constructor(
    private config: { secretKey: string; webhookSecret: string; priceId: string; webUrl: string },
    client?: Stripe,
  ) {
    if (!config.secretKey.startsWith('sk_test_'))
      throw new Error('Only Stripe test mode is supported');
    this.stripe = client ?? new Stripe(config.secretKey, { timeout: 20000, maxNetworkRetries: 1 });
  }
  private async serialized<T>(uid: string, run: (lease: string) => Promise<T>): Promise<T> {
    const ref = db().doc(`billingLocks/${uid}`),
      lease = randomUUID();
    await transaction(async (tx) => {
      const snap = await tx.get(ref);
      if ((snap.data()?.['expiresAt'] ?? 0) > Date.now())
        throw new ApiFault(503, 'INTERNAL', 'A payment update is in progress. Please retry.');
      tx.set(ref, { lease, expiresAt: Date.now() + 120000 });
    });
    try {
      return await run(lease);
    } finally {
      await transaction(async (tx) => {
        if ((await tx.get(ref)).data()?.['lease'] === lease) tx.delete(ref);
      });
    }
  }
  private async customer(uid: string) {
    if ((await db().doc(`deletionLocks/${uid}`).get()).exists)
      throw new ApiFault(403, 'FORBIDDEN', 'Account deletion is in progress.');
    const user = await readDoc(paths.user(uid), UserDocSchema);
    if (!user?.consentAt) throw new ApiFault(403, 'FORBIDDEN', 'Complete parent sign-up first.');
    if (user.stripeCustomerId) return user.stripeCustomerId;
    const customer = await this.stripe.customers.create(
      { email: user.email, metadata: { uid } },
      { idempotencyKey: `parent-${uid}` },
    );
    await transaction(async (tx) => {
      const ref = db().doc(paths.user(uid));
      const [snap, deleting] = await Promise.all([
        tx.get(ref),
        tx.get(db().doc(`deletionLocks/${uid}`)),
      ]);
      if (deleting.exists || !snap.exists)
        throw new ApiFault(403, 'FORBIDDEN', 'Account deletion is in progress.');
      tx.set(ref, { ...UserDocSchema.parse(snap.data()), stripeCustomerId: customer.id });
    });
    return customer.id;
  }
  async checkout(uid: string) {
    return this.serialized(uid, async () => {
      const customer = await this.customer(uid);
      const subscriptions = await this.stripe.subscriptions.list({
        customer,
        status: 'all',
        limit: 100,
      });
      if (
        subscriptions.data.some((s) =>
          ['active', 'trialing', 'past_due', 'unpaid', 'incomplete', 'paused'].includes(s.status),
        )
      )
        throw new ApiFault(409, 'PLAN_LIMIT', 'Manage your existing subscription in billing.');
      const ref = db().doc(`billingState/${uid}`);
      const state = (await ref.get()).data();
      if (typeof state?.['checkoutId'] === 'string') {
        const existing = await this.stripe.checkout.sessions.retrieve(state['checkoutId']);
        if (existing.status === 'open' && existing.url) return { url: existing.url };
        if (existing.status === 'complete')
          throw new ApiFault(
            409,
            'PLAN_LIMIT',
            'Your payment is being processed. Please check back shortly.',
          );
      }
      const key =
        typeof state?.['checkoutKey'] === 'string' && !state?.['checkoutId']
          ? state['checkoutKey']
          : randomUUID();
      await ref.set({ checkoutKey: key });
      const session = await this.stripe.checkout.sessions.create(
        {
          mode: 'subscription',
          customer,
          client_reference_id: uid,
          line_items: [{ price: this.config.priceId, quantity: 1 }],
          subscription_data: { trial_period_days: 7, metadata: { uid } },
          success_url: `${this.config.webUrl}/parent/billing?checkout=success`,
          cancel_url: `${this.config.webUrl}/parent/billing`,
        },
        { idempotencyKey: `checkout-${uid}-${key}` },
      );
      if (!session.url) throw new Error('Checkout URL missing');
      await ref.set({ checkoutKey: key, checkoutId: session.id });
      return { url: session.url };
    });
  }
  async portal(uid: string) {
    return this.serialized(uid, async () => ({
      url: (
        await this.stripe.billingPortal.sessions.create({
          customer: await this.customer(uid),
          return_url: `${this.config.webUrl}/parent/billing`,
        })
      ).url,
    }));
  }
  async cancel(uid: string) {
    await this.serialized(uid, async () => {
      const user = await readDoc(paths.user(uid), UserDocSchema);
      if (!user?.stripeCustomerId) return;
      for await (const sub of this.stripe.subscriptions.list({
        customer: user.stripeCustomerId,
        status: 'all',
        limit: 100,
      }))
        if (!['canceled', 'incomplete_expired'].includes(sub.status))
          await this.stripe.subscriptions.cancel(sub.id);
      const state = (await db().doc(`billingState/${uid}`).get()).data();
      if (typeof state?.['checkoutId'] === 'string') {
        const session = await this.stripe.checkout.sessions.retrieve(state['checkoutId']);
        if (session.status === 'open') await this.stripe.checkout.sessions.expire(session.id);
      }
    });
  }
  async webhook(raw: Buffer, signature: string) {
    let event: Stripe.Event;
    try {
      event = this.stripe.webhooks.constructEvent(raw, signature, this.config.webhookSecret);
    } catch {
      throw new ApiFault(400, 'INVALID_ARGUMENT', 'Invalid payment signature.');
    }
    if (event.livemode)
      throw new ApiFault(400, 'INVALID_ARGUMENT', 'Live payments are not enabled.');
    let subscriptionId: string | undefined;
    if (event.type === 'checkout.session.completed') {
      const sub = event.data.object.subscription;
      subscriptionId = typeof sub === 'string' ? sub : sub?.id;
    } else if (
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.deleted'
    )
      subscriptionId = event.data.object.id;
    else return;
    if (!subscriptionId) return;
    const initial = await this.stripe.subscriptions.retrieve(subscriptionId);
    const uid = initial.metadata['uid'];
    if (!uid) throw new ApiFault(400, 'INVALID_ARGUMENT', 'Missing account reference.');
    await this.serialized(uid, async (lease) => {
      const eventRef = db().doc(`billingEvents/${event.id}`);
      if ((await eventRef.get()).exists) return;
      // Fetch authoritative state only after taking the reconciliation lease.
      const sub = await this.stripe.subscriptions.retrieve(subscriptionId!);
      const customer = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
      const current = await this.stripe.subscriptions.list({ customer, status: 'all', limit: 100 });
      const effective =
        current.data.find(
          (s) => s.metadata['uid'] === uid && ['active', 'trialing'].includes(s.status),
        ) ?? sub;
      const status = ['active', 'past_due', 'canceled', 'trialing', 'incomplete'].includes(
        effective.status,
      )
        ? effective.status
        : 'canceled';
      const tier = status === 'active' || status === 'trialing' ? 'family' : 'free';
      await transaction(async (tx) => {
        const userRef = db().doc(paths.user(uid));
        const [seen, userSnap, lock, deleting] = await Promise.all([
          tx.get(eventRef),
          tx.get(userRef),
          tx.get(db().doc(`billingLocks/${uid}`)),
          tx.get(db().doc(`deletionLocks/${uid}`)),
        ]);
        if (lock.data()?.['lease'] !== lease) throw new Error('Payment lease expired');
        if (seen.exists) return;
        if (!userSnap.exists || deleting.exists) {
          tx.create(eventRef, { createdAt: Date.now(), ignored: true });
          return;
        }
        const user = UserDocSchema.parse(userSnap.data());
        if (user.stripeCustomerId !== customer)
          throw new ApiFault(400, 'INVALID_ARGUMENT', 'Payment account mismatch.');
        tx.set(
          db().doc(paths.subscription(uid)),
          SubscriptionDocSchema.parse({
            stripeSubscriptionId: effective.id,
            status,
            tier,
            currentPeriodEnd:
              Math.max(0, ...effective.items.data.map((item) => item.current_period_end)) * 1000,
          }),
        );
        tx.set(userRef, { ...user, plan: tier });
        tx.create(eventRef, { createdAt: Date.now() });
      });
    });
  }
}
