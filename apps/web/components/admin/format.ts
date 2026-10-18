import { currentLanguage, formatNumber } from '../../lib/i18n';
import { copy as uiText } from '../../lib/i18n/ui';
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
  if (amount > 0 && amount < 0.005) return currentLanguage() === 'bn' ? '<$০.০১' : '<$0.01';
  return `$${uiText(amount.toFixed(2))}`;
}

export function formatPercent(rate: number | null): string {
  if (rate === null) return uiText('No runs yet');
  return `${formatNumber(Math.round(rate * 1000) / 10, currentLanguage())}%`;
}

export const formatCount = (n: number) =>
  n.toLocaleString(currentLanguage() === 'bn' ? 'bn-BD' : 'en-US');

export function formatDateKey(key: string): string {
  const d = new Date(Date.UTC(+key.slice(0, 4), +key.slice(4, 6) - 1, +key.slice(6, 8)));
  if (currentLanguage() === 'bn')
    return new Intl.DateTimeFormat('bn-BD', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      timeZone: 'UTC',
    }).format(d);
  return `${DAYS[d.getUTCDay()]} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function formatWhen(ms: number | null): string {
  if (ms === null || !ms) return uiText('Never');
  const d = new Date(ms);
  if (currentLanguage() === 'bn')
    return (
      new Intl.DateTimeFormat('bn-BD', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: 'UTC',
      }).format(d) + ' ইউটিসি'
    );
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}, ${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())} UTC`;
}

const BAND_ORDER = ['6-7', '8-10', '11-13'] as const;
export function ageBandSummary(children: AdminFamilyDetail['children']): string {
  if (!children.length) return uiText('No explorer profiles');
  return BAND_ORDER.map(
    (band) => [band, children.filter((c) => c.ageBand === band).length] as const,
  )
    .filter(([, n]) => n > 0)
    .map(([band, n]) =>
      currentLanguage() === 'bn'
        ? `${formatNumber(n, 'bn')} জন, ${uiText(band.replace('-', '–'))} বছর`
        : `${n} aged ${band.replace('-', '–')}`,
    )
    .join(' · ');
}

export function planLabel(row: Pick<AdminFamilyRow, 'plan' | 'compPlan' | 'subscriptionStatus'>) {
  const base = uiText(row.plan === 'family' ? 'Family' : 'Free');
  if (row.compPlan)
    return currentLanguage() === 'bn' ? `${base} (বিশেষ সুবিধা)` : `${base} (comped)`;
  if (row.subscriptionStatus && row.subscriptionStatus !== 'active')
    return `${base} (${uiText(row.subscriptionStatus.replace('_', ' '))})`;
  return base;
}

const FIELD_LABELS: Record<string, string> = {
  plan: 'Plan',
  compPlan: 'Comped plan',
  voiceSeconds: 'Voice seconds',
  worlds: 'Worlds',
  images: 'Images',
  suspended: 'Suspended',
  hidden: 'Hidden',
  on: 'Paused',
  reason: 'Reason',
  theme: 'Theme',
  revision: 'Revision',
  name: 'Name',
  nameBn: 'Name in Bangla',
  code: 'School code',
  status: 'Status',
  seats: 'Seats',
  voiceSecondsPerDay: 'Daily voice seconds',
  createdAt: 'Created',
  updatedAt: 'Updated',
  publishedAt: 'Published on',
  expiresAt: 'Expires',
  email: 'Email',
  inviteId: 'Invite',
  kind: 'Kind',
  titleEn: 'Title in English',
  titleBn: 'Title in Bangla',
  ageBands: 'Age bands',
  worldId: 'World',
  packId: 'Pack',
};
const fieldLabel = (key: string) => uiText(FIELD_LABELS[key] ?? key);
/** Stored enum values shown as words, for the fields whose values are a fixed vocabulary. */
const ENUM_FIELDS = new Set(['status', 'plan', 'compPlan', 'kind', 'theme']);
const VALUE_LABELS: Record<string, string> = {
  draft: 'Draft',
  published: 'Published',
  retired: 'Retired',
  archived: 'Archived',
  active: 'Active',
  suspended: 'Suspended',
  free: 'Free',
  family: 'Family',
  storyPack: 'Story pack',
  world: 'World',
  forest: 'Forest',
  ocean: 'Ocean',
  terracotta: 'Terracotta',
};

const show = (key: string, v: unknown) =>
  v === null || v === undefined
    ? uiText('none')
    : typeof v === 'number' && key.endsWith('At')
      ? formatWhen(v)
      : typeof v === 'string' && ENUM_FIELDS.has(key) && VALUE_LABELS[v]
        ? uiText(VALUE_LABELS[v])
        : typeof v === 'boolean' && currentLanguage() === 'bn'
          ? v
            ? 'হ্যাঁ'
            : 'না'
          : uiText(String(v));
export function describeChange(before: AdminAuditDoc['before'], after: AdminAuditDoc['after']) {
  const keys = [...new Set([...Object.keys(after ?? {}), ...Object.keys(before ?? {})])];
  const parts = keys
    .filter((k) => show(k, before?.[k]) !== show(k, after?.[k]))
    .map((k) => `${fieldLabel(k)}: ${show(k, before?.[k])} → ${show(k, after?.[k])}`);
  return parts.length ? parts.join('; ') : uiText('No change');
}

type AuditFacts = Pick<AdminAuditDoc, 'action' | 'before' | 'after'>;

/** The change column: field by field, with plain sentences where a diff says nothing. */
export function auditChange(entry: AuditFacts): string {
  const described = describeChange(entry.before, entry.after);
  if (entry.action === 'quota.reset' && described === uiText('No change'))
    return uiText("Today's counters were already at zero.");
  // Entries written before revocations recorded the invite itself.
  if (entry.action === 'school.inviteRevoke' && !entry.before) return uiText('Invite removed');
  return described;
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
  'school.create': 'School created',
  'school.update': 'School updated',
  'school.suspend': 'School paused',
  'school.reinstate': 'School reinstated',
  'school.invite': 'Teacher invited',
  'school.inviteRevoke': 'Invite revoked',
  'school.plan': 'School plan changed',
  'catalog.create': 'Catalog draft added',
  'catalog.update': 'Catalog item updated',
  'catalog.publish': 'Catalog item published',
  'catalog.retire': 'Catalog item retired',
  'lesson.publish': 'Lesson published',
  'lesson.save': 'Lesson saved',
  'lesson.approve': 'Lesson language approved',
  'lesson.archive': 'Lesson archived',
};
export const actionLabel = (action: AdminAuditAction) => uiText(ACTIONS[action]);

/** Names an entry by what it did; older entries logged drafts and edits under publish or reinstate. */
export function auditActionLabel(entry: AuditFacts): string {
  const was = entry.before?.['status'];
  const now = entry.after?.['status'];
  if (entry.action === 'catalog.publish') {
    if (!entry.before) return uiText('Catalog draft added');
    if (now !== 'published' || was === now) return uiText('Catalog item updated');
  }
  if ((entry.action === 'school.reinstate' || entry.action === 'school.suspend') && was === now)
    return uiText('School updated');
  return actionLabel(entry.action);
}

const KIND_LABELS: Record<AdminAuditDoc['target']['kind'], string> = {
  family: 'Family',
  world: 'World',
  system: 'System',
  school: 'School',
  catalog: 'Catalog item',
  lesson: 'Lesson',
};
const SYSTEM_TARGETS: Record<string, string> = {
  runtime: 'Kill switch',
  appearance: 'Interface palette',
};
export const kindLabel = (kind: AdminAuditDoc['target']['kind']) => uiText(KIND_LABELS[kind]);

/** Long document ids, shortened for reading; the full id stays available to copy. */
export function shortId(id: string): string {
  return id.length > 14 ? `${id.slice(0, 6)}…${id.slice(-5)}` : id;
}

export type TargetNames = Partial<Record<AdminAuditDoc['target']['kind'], Map<string, string>>>;
/** A readable name for an audited target, from what the console already knows. */
export function targetLabel(target: AdminAuditDoc['target'], names: TargetNames): string {
  const known = names[target.kind]?.get(target.id);
  if (known) return known;
  if (target.kind === 'system' && SYSTEM_TARGETS[target.id])
    return uiText(SYSTEM_TARGETS[target.id]);
  return `${kindLabel(target.kind)} ${shortId(target.id)}`;
}

/** Every label this module translates, so a test can hold Bangla coverage to it. */
export const FORMAT_COPY = [
  ...Object.values(FIELD_LABELS),
  ...Object.values(VALUE_LABELS),
  ...Object.values(ACTIONS),
  ...Object.values(KIND_LABELS),
  ...Object.values(SYSTEM_TARGETS),
];

export function ofLimit(used: number, limit: number, unit: string): string {
  return uiText('{v0} of {v1} {v2}', { v0: used, v1: limit, v2: unit });
}

export function ageBandCounts(counts: Record<'6-7' | '8-10' | '11-13', number>): string {
  return uiText('{v0} aged 6–7 · {v1} aged 8–10 · {v2} aged 11–13', {
    v0: counts['6-7'],
    v1: counts['8-10'],
    v2: counts['11-13'],
  });
}

export const pageLabel = (page: number) => uiText('Page {v0}', { v0: page });

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
