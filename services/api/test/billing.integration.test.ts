import { it, expect, vi } from 'vitest';
import Stripe from 'stripe';
import { db, writeDoc } from '@just-imagine/server-core';
import { UserDocSchema, paths } from '@just-imagine/protocol';
import { StripeBilling } from '../src/billing';
process.env['GOOGLE_CLOUD_PROJECT'] = 'demo-just-imagine';
it('verifies signatures and processes duplicate payment events once', async () => {
  const client = new Stripe('sk_test_local');
  const retrieve = vi.spyOn(client.subscriptions, 'retrieve').mockResolvedValue({
    id: 'sub_test',
    metadata: { uid: 'billing_parent' },
    customer: 'cus_test',
    status: 'trialing',
    items: { data: [{ current_period_end: 1900000000 }] },
  } as unknown as Stripe.Response<Stripe.Subscription>);
  vi.spyOn(client.subscriptions, 'list').mockReturnValue(
    Promise.resolve({
      data: [
        {
          id: 'sub_test',
          metadata: { uid: 'billing_parent' },
          customer: 'cus_test',
          status: 'trialing',
          items: { data: [{ current_period_end: 1900000000 }] },
        },
      ],
    }) as unknown as ReturnType<typeof client.subscriptions.list>,
  );
  const billing = new StripeBilling(
    {
      secretKey: 'sk_test_local',
      webhookSecret: 'whsec_local',
      priceId: 'price_test',
      webUrl: 'https://app.example',
    },
    client,
  );
  await writeDoc(paths.user('billing_parent'), UserDocSchema, {
    email: 'parent@example.test',
    displayName: 'Parent',
    consentAt: 1,
    plan: 'free',
    stripeCustomerId: 'cus_test',
    createdAt: 1,
  });
  const raw = Buffer.from(
    JSON.stringify({
      id: 'evt_test',
      type: 'customer.subscription.updated',
      created: 100,
      livemode: false,
      data: { object: { id: 'sub_test' } },
    }),
  );
  await expect(billing.webhook(raw, 'bad')).rejects.toMatchObject({ status: 400 });
  expect(retrieve).not.toHaveBeenCalled();
  const signature = Stripe.webhooks.generateTestHeaderString({
    payload: raw.toString(),
    secret: 'whsec_local',
  });
  await billing.webhook(raw, signature);
  await billing.webhook(raw, signature);
  expect((await db().doc(paths.user('billing_parent')).get()).data()?.['plan']).toBe('family');
  expect(
    (await db().collection('billingEvents').where('__name__', '==', 'evt_test').get()).size,
  ).toBe(1);
  expect(
    (await db().doc(paths.subscription('billing_parent')).get()).data()?.['currentPeriodEnd'],
  ).toBe(1900000000000);
});

it('reuses an open checkout and rejects overlapping portal initialization', async () => {
  const uid = 'billing_concurrent';
  await writeDoc(paths.user(uid), UserDocSchema, {
    email: 'parent@example.test',
    displayName: 'Parent',
    consentAt: 1,
    plan: 'free',
    stripeCustomerId: 'cus_concurrent',
    createdAt: 1,
  });
  const client = new Stripe('sk_test_local');
  vi.spyOn(client.subscriptions, 'list').mockReturnValue(
    Promise.resolve({ data: [] }) as unknown as ReturnType<typeof client.subscriptions.list>,
  );
  const create = vi.spyOn(client.checkout.sessions, 'create').mockResolvedValue({
    id: 'cs_pending',
    status: 'open',
    url: 'https://checkout.stripe.test/pending',
  } as Stripe.Response<Stripe.Checkout.Session>);
  vi.spyOn(client.checkout.sessions, 'retrieve').mockResolvedValue({
    id: 'cs_pending',
    status: 'open',
    url: 'https://checkout.stripe.test/pending',
  } as Stripe.Response<Stripe.Checkout.Session>);
  const billing = new StripeBilling(
    {
      secretKey: 'sk_test_local',
      webhookSecret: 'whsec_local',
      priceId: 'price_test',
      webUrl: 'https://app.example',
    },
    client,
  );
  expect(await billing.checkout(uid)).toEqual(await billing.checkout(uid));
  expect(create).toHaveBeenCalledOnce();
  await db()
    .doc(`billingLocks/${uid}`)
    .set({ lease: 'another-operation', expiresAt: Date.now() + 60000 });
  const portal = vi.spyOn(client.billingPortal.sessions, 'create');
  await expect(billing.portal(uid)).rejects.toMatchObject({ status: 503 });
  expect(portal).not.toHaveBeenCalled();
  await db().doc(`billingLocks/${uid}`).delete();
  await db().doc(`deletionLocks/${uid}`).set({ requestedAt: 1 });
  await expect(billing.portal(uid)).rejects.toMatchObject({ status: 403 });
  expect(portal).not.toHaveBeenCalled();
});
