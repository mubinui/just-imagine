import {
  ADMIN_ROUTES,
  deletionConfirmationFor,
  type AdminAuditAction,
  type AdminAuditDoc,
  type AdminFamilyDetail,
  type AdminFamilyRow,
  type AdminRouteKey,
} from '@just-imagine/protocol';

const DAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const pad = (n: number) => String(n).padStart(2, '0');

export function formatUsd(amount: number): string {
  if (amount > 0 && amount < 0.005) return '<$0.01';
  return `$${amount.toFixed(2)}`;
}

export function formatPercent(rate: number | null): string {
  if (rate === null) return 'No runs yet';
  return `${Math.round(rate * 1000) / 10}%`;
}

export const formatCount = (n: number) => n.toLocaleString('en-US');

export function formatDateKey(key: string): string {
  const d = new Date(Date.UTC(+key.slice(0, 4), +key.slice(4, 6) - 1, +key.slice(6, 8)));
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function formatWhen(ms: number | null): string {
  if (ms === null || !ms) return 'Never';
  const d = new Date(ms);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

const BAND_ORDER = ['6-7', '8-10', '11-13'] as const;
export function ageBandSummary(children: AdminFamilyDetail['children']): string {
  if (!children.length) return 'No explorer profiles';
  return BAND_ORDER.map(
    (band) => [band, children.filter((c) => c.ageBand === band).length] as const,
  )
    .filter(([, n]) => n > 0)
    .map(([band, n]) => `${n} aged ${band.replace('-', '–')}`)
    .join(' · ');
}

export function planLabel(row: Pick<AdminFamilyRow, 'plan' | 'compPlan' | 'subscriptionStatus'>) {
  const base = row.plan === 'family' ? 'Family' : 'Free';
  if (row.compPlan) return `${base} (comped)`;
  if (row.subscriptionStatus && row.subscriptionStatus !== 'active')
    return `${base} (${row.subscriptionStatus.replace('_', ' ')})`;
  return base;
}

const show = (v: unknown) => (v === null || v === undefined ? 'none' : String(v));
export function describeChange(before: AdminAuditDoc['before'], after: AdminAuditDoc['after']) {
  const keys = [...new Set([...Object.keys(after ?? {}), ...Object.keys(before ?? {})])];
  const parts = keys
    .filter((k) => show(before?.[k]) !== show(after?.[k]))
    .map((k) => `${k}: ${show(before?.[k])} → ${show(after?.[k])}`);
  return parts.length ? parts.join('; ') : 'No change';
}

const ACTIONS: Record<AdminAuditAction, string> = {
  'plan.override': 'Plan changed',
  'quota.reset': 'Quota reset',
  'account.suspend': 'Suspended',
  'account.reinstate': 'Reinstated',
  'account.delete': 'Deletion requested',
  'world.hide': 'World hidden',
  'world.unhide': 'World shown',
  'killSwitch.set': 'Kill switch',
  'appearance.set': 'Theme changed',
};
export const actionLabel = (action: AdminAuditAction) => ACTIONS[action];

export function canConfirmDeletion(typed: string, email: string): boolean {
  return typed.trim().toLowerCase() === deletionConfirmationFor(email);
}

export function adminPath(
  route: AdminRouteKey,
  params: Record<string, string> = {},
  query: Record<string, string | number | undefined> = {},
): string {
  const path = ADMIN_ROUTES[route].path.replace(/:([A-Za-z]+)/g, (_, key: string) => {
    const value = params[key];
    if (!value) throw new Error(`Missing route parameter ${key}`);
    return encodeURIComponent(value);
  });
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(query))
    if (v !== undefined && v !== '') search.set(k, String(v));
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}
