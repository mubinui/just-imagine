import type { UiIconName } from '../UiIcon';

/** The operator console's pages, in navigation order. */
export const ADMIN_PAGES: readonly { href: string; label: string; icon: UiIconName }[] = [
  { href: '/admin', label: 'Overview', icon: 'home' },
  { href: '/admin/families', label: 'Families', icon: 'heart' },
  { href: '/admin/schools', label: 'Schools', icon: 'learn' },
  { href: '/admin/catalog', label: 'Catalog', icon: 'gallery' },
  { href: '/admin/lessons', label: 'Lessons', icon: 'book' },
  { href: '/admin/safety', label: 'Safety', icon: 'check' },
  { href: '/admin/content', label: 'Content', icon: 'game' },
  { href: '/admin/appearance', label: 'Appearance', icon: 'star' },
  { href: '/admin/system', label: 'System', icon: 'timer' },
  { href: '/admin/audit', label: 'Audit log', icon: 'write' },
];

/** The page a path belongs to; lesson editor routes stay under Lessons. */
export function currentPage(path: string): string {
  const match = ADMIN_PAGES.filter(
    (p) => path === p.href || (p.href !== '/admin' && path.startsWith(p.href + '/')),
  ).at(-1);
  return match?.href ?? '/admin';
}

/** Fired after the kill switch changes, so the console-wide banner refreshes at once. */
export const KILL_SWITCH_EVENT = 'adm:kill-switch';
