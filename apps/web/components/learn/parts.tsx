'use client';
import { useLanguage } from '../../lib/i18n';
import { copy as uiText } from '../../lib/i18n/ui';
import { UiIcon, type UiIconName } from '../UiIcon';
import { formatNumber, type Language } from '../../lib/i18n';

const PATHS = {
  map: 'M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20ZM9 4v13.5M15 6.5V20',
  paw: 'M8.5 9.5a1.8 2.2 0 1 0 0-.01M15.5 9.5a1.8 2.2 0 1 0 0-.01M5 13.5a1.6 2 0 1 0 0-.01M19 13.5a1.6 2 0 1 0 0-.01M12 13c3 0 5 3.2 5 5s-1.6 2-5 2-5-.3-5-2 2-5 5-5Z',
  phone:
    'M5 4h3.5l1.8 4.4-2.3 1.5a11 11 0 0 0 6.1 6.1l1.5-2.3L20 15.5V19a1 1 0 0 1-1 1A16 16 0 0 1 4 5a1 1 0 0 1 1-1Z',
  hangUp:
    'M3.5 14.5c4.6-4.4 12.4-4.4 17 0l-1.9 2.6-3.6-1.3-.4-2.5a9 9 0 0 0-5.2 0L9 15.8l-3.6 1.3Z',
  mic: 'M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3ZM5.5 11a6.5 6.5 0 0 0 13 0M12 17.5V21M8.5 21h7',
  back: 'M10 6 4 12l6 6M4 12h16',
  studio: 'M12 2.8 14.4 9.6 21.2 12l-6.8 2.4L12 21.2l-2.4-6.8L2.8 12l6.8-2.4Z',
  close: 'M6 6l12 12M18 6 6 18',
  space:
    'M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10ZM2.5 15.5c2-1.6 6.4-4 11-5.4s7.6-1.2 8 .1-2.8 3.6-7.4 5-8.6 1.7-11.6.3Z',
  animals_farm: 'M3 11 12 4l9 7v9H3ZM9 20v-6h6v6M9 14l6 6M15 14l-6 6',
  animals_jungle:
    'M12 21V9M12 9C9 4 4 5 3 8c3-1 6 0 9 1ZM12 9c3-5 8-4 9-1-3-1-6 0-9 1ZM12 13c-3-2-6-1-7 1 3 0 5 0 7 1',
  animals_ocean:
    'M2 9c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0M2 15c2.5-2 4.5-2 7 0s4.5 2 7 0 4.5-2 6 0',
  learn: 'M4 18c2-6 6-9 8-9s6 3 8 9M8 8a4 4 0 1 1 8 0M12 4V2M5.5 6 4 4.5M18.5 6 20 4.5',
} as const;
export type IconName = keyof typeof PATHS;

export function LearnIcon({ name, filled = false }: { name: IconName; filled?: boolean }) {
  const shared: Partial<Record<IconName, UiIconName>> = {
    mic: 'mic',
    paw: 'paw',
    studio: 'game',
    map: 'book',
    learn: 'book',
    close: 'close',
    back: 'back',
  };
  if (shared[name]) return <UiIcon name={shared[name]!} />;
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden="true"
      fill={filled ? 'currentColor' : 'none'}
      stroke={filled ? 'none' : 'currentColor'}
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={PATHS[name]} />
    </svg>
  );
}

export function StarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
      <path d="m12 2.5 2.6 6.1 6.6.6-5 4.4 1.5 6.5L12 16.7l-5.7 3.4 1.5-6.5-5-4.4 6.6-.6Z" />
    </svg>
  );
}

/** The child's points: a sunshine star and the number in their own numerals. */
export function PointsBadge({
  points,
  label,
  language,
  bump,
}: {
  points: number;
  label: string;
  language: Language;
  bump?: number;
}) {
  useLanguage();
  return (
    <p className="learn-points" aria-label={`${label}: ${points}`} data-bump={bump}>
      <span className="star" key={bump}>
        <StarIcon />
      </span>
      <span className="value">{formatNumber(points, language)}</span>
      <span className="label">{uiText(label)}</span>
    </p>
  );
}
