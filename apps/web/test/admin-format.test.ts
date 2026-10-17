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
  auditActionLabel,
  auditChange,
  targetLabel,
  shortId,
  ofLimit,
  ageBandCounts,
  pageLabel,
  FORMAT_COPY,
} from '../components/admin/format';
import { isNetworkFailure, NETWORK_MESSAGE } from '../components/admin/errors';
import { ADMIN_PAGES, currentPage } from '../components/admin/nav';
import { hasUiCopy } from '../lib/i18n/ui';
import { setRenderLanguage } from '../lib/i18n';

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
    ).toBe('Plan: Free → Family; Comped plan: none → Family');
    expect(describeChange(null, { on: true })).toBe('Paused: none → true');
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
  it('shows audited timestamps as dates, never epoch milliseconds', () => {
    const at = Date.UTC(2026, 9, 25, 9, 5);
    expect(describeChange(null, { email: 'ana@example.test', expiresAt: at })).toBe(
      'Email: none → ana@example.test; Expires: none → 25 Oct 2026, 09:05 UTC',
    );
    expect(describeChange({ createdAt: at }, null)).toBe('Created: 25 Oct 2026, 09:05 UTC → none');
  });
  it('labels catalog and school entries by what actually changed', () => {
    expect(
      auditActionLabel({
        action: 'catalog.publish',
        before: null,
        after: { status: 'draft', kind: 'storyPack' },
      }),
    ).toBe('Catalog draft added');
    expect(
      auditActionLabel({
        action: 'catalog.publish',
        before: { status: 'draft' },
        after: { status: 'draft' },
      }),
    ).toBe('Catalog item updated');
    expect(
      auditActionLabel({
        action: 'catalog.publish',
        before: { status: 'draft' },
        after: { status: 'published' },
      }),
    ).toBe('Catalog item published');
    // Entries written before the fix: a seats-only edit was logged as a reinstatement.
    expect(
      auditActionLabel({
        action: 'school.reinstate',
        before: { status: 'active', seats: 40 },
        after: { status: 'active', seats: 45 },
      }),
    ).toBe('School updated');
    expect(
      auditActionLabel({
        action: 'school.reinstate',
        before: { status: 'suspended' },
        after: { status: 'active' },
      }),
    ).toBe('School reinstated');
  });
  it('explains resets and revocations instead of saying nothing changed', () => {
    const zero = { voiceSeconds: 0, worlds: 0, images: 0 };
    expect(auditChange({ action: 'quota.reset', before: zero, after: zero })).toBe(
      "Today's counters were already at zero.",
    );
    expect(
      auditChange({ action: 'quota.reset', before: { ...zero, worlds: 2 }, after: zero }),
    ).toBe('Worlds: 2 → 0');
    expect(
      auditChange({ action: 'school.inviteRevoke', before: null, after: { inviteId: 'j_1' } }),
    ).toBe('Invite removed');
  });
  it('names audit targets when the console knows them and shortens raw ids', () => {
    const names = { school: new Map([['s_01m55x6bsncb6r', 'Audit School']]) };
    expect(targetLabel({ kind: 'school', id: 's_01m55x6bsncb6r' }, names)).toBe('Audit School');
    expect(targetLabel({ kind: 'family', id: '1ZUYfHwo68MRfw3eQr' }, names)).toBe(
      'Family 1ZUYfH…w3eQr',
    );
    expect(targetLabel({ kind: 'system', id: 'runtime' }, names)).toBe('Kill switch');
    expect(shortId('abc')).toBe('abc');
  });
  it('builds usage sentences as single strings with their spaces', () => {
    expect(ofLimit(0, 15, 'min')).toBe('0 of 15 min');
    expect(ageBandCounts({ '6-7': 0, '8-10': 1, '11-13': 0 })).toBe(
      '0 aged 6–7 · 1 aged 8–10 · 0 aged 11–13',
    );
    expect(pageLabel(1)).toBe('Page 1');
    setRenderLanguage('bn');
    try {
      expect(ofLimit(0, 3, 'worlds')).toBe('০ / ৩ জগৎ ব্যবহৃত');
      expect(pageLabel(2)).toBe('পাতা ২');
    } finally {
      setRenderLanguage('en');
    }
  });
  it('recognises an unreachable api and says so plainly', () => {
    expect(isNetworkFailure(new TypeError('Failed to fetch'))).toBe(true);
    expect(isNetworkFailure(new TypeError('Load failed'))).toBe(true);
    expect(isNetworkFailure(new Error('The api answered 500. Try again.'))).toBe(false);
    expect(NETWORK_MESSAGE).not.toMatch(/fetch/i);
    expect(hasUiCopy(NETWORK_MESSAGE)).toBe(true);
  });
  it('has Bangla copy for every navigation label', () => {
    expect(ADMIN_PAGES.filter((p) => !hasUiCopy(p.label)).map((p) => p.label)).toEqual([]);
  });
  it('has Bangla copy for every audit field, action and target kind', () => {
    expect(FORMAT_COPY.filter((label) => !hasUiCopy(label))).toEqual([]);
  });
  it('keeps nested editor routes under their console page', () => {
    expect(currentPage('/admin/lessons/abc')).toBe('/admin/lessons');
    expect(currentPage('/admin')).toBe('/admin');
    expect(currentPage('/admin/audit')).toBe('/admin/audit');
  });
});
