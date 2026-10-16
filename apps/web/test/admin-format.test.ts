import { describe, it, expect } from 'vitest';
import {
  actionLabel,
  ageBandSummary,
  canConfirmDeletion,
  describeChange,
  formatDateKey,
  formatPercent,
  formatUsd,
  formatWhen,
  planLabel,
  adminPath,
} from '../components/admin/format';

describe('admin formatting', () => {
  it('formats money with cents and tiny amounts honestly', () => {
    expect(formatUsd(0)).toBe('$0.00');
    expect(formatUsd(12.345)).toBe('$12.35');
    expect(formatUsd(0.004)).toBe('<$0.01');
  });
  it('formats rates and missing rates', () => {
    expect(formatPercent(0.125)).toBe('12.5%');
    expect(formatPercent(null)).toBe('No runs yet');
  });
  it('turns a UTC date key into a short day label', () => {
    expect(formatDateKey('20261016')).toBe('Fri 16 Oct');
  });
  it('formats timestamps in UTC so every operator reads the same time', () => {
    expect(formatWhen(Date.UTC(2026, 9, 16, 9, 5))).toBe('16 Oct 2026, 09:05 UTC');
    expect(formatWhen(null)).toBe('Never');
  });
  it('summarises children as counts per age band, never names', () => {
    expect(
      ageBandSummary([
        { ageBand: '8-10', tier: 'playground', createdAt: 1 },
        { ageBand: '6-7', tier: 'playground', createdAt: 2 },
        { ageBand: '8-10', tier: 'lab', createdAt: 3 },
      ]),
    ).toBe('1 aged 6–7 · 2 aged 8–10');
    expect(ageBandSummary([])).toBe('No explorer profiles');
  });
  it('labels plans with the comp and subscription state', () => {
    expect(planLabel({ plan: 'family', compPlan: 'family', subscriptionStatus: null })).toBe(
      'Family (comped)',
    );
    expect(planLabel({ plan: 'family', compPlan: null, subscriptionStatus: 'trialing' })).toBe(
      'Family (trialing)',
    );
    expect(planLabel({ plan: 'free', compPlan: null, subscriptionStatus: null })).toBe('Free');
  });
  it('describes an audited change field by field', () => {
    expect(
      describeChange({ plan: 'free', compPlan: null }, { plan: 'family', compPlan: 'family' }),
    ).toBe('plan: free → family; compPlan: none → family');
    expect(describeChange(null, { on: true })).toBe('on: none → true');
    expect(describeChange({ hidden: true }, { hidden: true })).toBe('No change');
  });
  it('names each audited action in plain words', () => {
    expect(actionLabel('killSwitch.set')).toBe('Kill switch');
    expect(actionLabel('account.delete')).toBe('Deletion requested');
  });
  it('only confirms deletion on the exact phrase for this family', () => {
    expect(canConfirmDeletion('delete ana@example.test', 'Ana@Example.test')).toBe(true);
    expect(canConfirmDeletion('  DELETE ana@example.test ', 'ana@example.test')).toBe(true);
    expect(canConfirmDeletion('delete ben@example.test', 'ana@example.test')).toBe(false);
    expect(canConfirmDeletion('', 'ana@example.test')).toBe(false);
  });
  it('fills admin route parameters and query strings safely', () => {
    expect(adminPath('family', { uid: 'u 1' })).toBe('/v1/admin/families/u%201');
    expect(adminPath('families', {}, { q: 'ana', limit: 25, cursor: undefined })).toBe(
      '/v1/admin/families?q=ana&limit=25',
    );
    expect(() => adminPath('family', {})).toThrow();
  });
});
