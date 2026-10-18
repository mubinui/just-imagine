import { describe, expect, it } from 'vitest';
import { db, readDoc, writeDoc } from '@just-imagine/server-core';
import { SubscriptionDocSchema, UserDocSchema, paths } from '@just-imagine/protocol';
import { NoPaymentBilling } from '../src/no-payment-billing';
process.env['GOOGLE_CLOUD_PROJECT'] = 'demo-just-imagine';

const billing = new NoPaymentBilling({ webUrl: 'https://app.example' });
const parent = (uid: string, consentAt = 1) =>
  writeDoc(paths.user(uid), UserDocSchema, {
    email: `${uid}@example.test`,
    displayName: 'Parent',
    consentAt,
    plan: 'free',
    stripeCustomerId: null,
    createdAt: 1,
  });

describe('subscriptions without payment', () => {
  it('starts the Family plan at once and returns to the billing page', async () => {
    await parent('nopay_start');
    expect(billing.mode).toBe('no-payment');
    await expect(billing.checkout('nopay_start')).resolves.toEqual({
      url: 'https://app.example/parent/billing?checkout=success',
    });
    expect((await readDoc(paths.user('nopay_start'), UserDocSchema))?.plan).toBe('family');
    expect(await readDoc(paths.subscription('nopay_start'), SubscriptionDocSchema)).toMatchObject({
      source: 'no-payment',
      status: 'active',
      tier: 'family',
    });
  });

  it('records which promotional plan the family chose and lets them switch', async () => {
    await parent('nopay_choose');
    await billing.checkout('nopay_choose', 'family-year');
    expect(await readDoc(paths.subscription('nopay_choose'), SubscriptionDocSchema)).toMatchObject({
      planId: 'family-year',
      status: 'active',
    });
    await billing.checkout('nopay_choose', 'family-month');
    expect((await readDoc(paths.subscription('nopay_choose'), SubscriptionDocSchema))?.planId).toBe(
      'family-month',
    );
    await expect(billing.checkout('nopay_choose', 'family-month')).rejects.toMatchObject({
      status: 409,
    });
  });

  it('refuses a second start while the plan is active', async () => {
    await parent('nopay_twice');
    await billing.checkout('nopay_twice');
    await expect(billing.checkout('nopay_twice')).rejects.toMatchObject({ status: 409 });
  });

  it('cancels back to the free plan and can start again', async () => {
    await parent('nopay_cancel');
    await billing.checkout('nopay_cancel');
    await billing.cancel('nopay_cancel');
    expect((await readDoc(paths.user('nopay_cancel'), UserDocSchema))?.plan).toBe('free');
    expect((await readDoc(paths.subscription('nopay_cancel'), SubscriptionDocSchema))?.status).toBe(
      'canceled',
    );
    await expect(billing.checkout('nopay_cancel')).resolves.toBeDefined();
  });

  it('requires a consented parent and an account that is not being deleted', async () => {
    await parent('nopay_unconsented', 0);
    await expect(billing.checkout('nopay_unconsented')).rejects.toMatchObject({ status: 403 });
    await parent('nopay_deleting');
    await db().doc('deletionLocks/nopay_deleting').set({ at: 1 });
    await expect(billing.checkout('nopay_deleting')).rejects.toMatchObject({ status: 403 });
  });

  it('cancels quietly for an account that is already gone, as deletion does', async () => {
    await expect(billing.cancel('nopay_never_existed')).resolves.toBeUndefined();
  });

  it('has nothing to manage and no webhook', async () => {
    await expect(billing.portal('nopay_start')).resolves.toEqual({
      url: 'https://app.example/parent/billing',
    });
    await expect(billing.webhook(Buffer.from('{}'), 'sig')).rejects.toMatchObject({
      status: 404,
    });
  });
});
