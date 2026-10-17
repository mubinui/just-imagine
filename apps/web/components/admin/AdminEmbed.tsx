'use client';
import Link from 'next/link';
import { useLanguage } from '../../lib/i18n';
import { copy as uiText } from '../../lib/i18n/ui';
import { UiIcon } from '../UiIcon';

/**
 * Shared school screens (the lesson editor) inside console chrome. The console header owns the
 * language, so the embedded screen's own switch is hidden by admin.css.
 */
export function AdminEmbed({
  back,
  children,
}: {
  back?: { href: string; label: string };
  children: React.ReactNode;
}) {
  useLanguage();
  return (
    <div className="adm-embed">
      {back && (
        <Link className="adm-back" href={back.href}>
          <UiIcon name="back" />
          {uiText(back.label)}
        </Link>
      )}
      {children}
    </div>
  );
}
