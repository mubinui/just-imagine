'use client';
import { useLanguage } from '../../lib/i18n';
import { copy as uiText } from '../../lib/i18n/ui';
import { UiIcon, type UiIconName } from '../UiIcon';
import { formatNumber, type Language } from '../../lib/i18n';

export type IconName = Extract<
  UiIconName,
  | 'map'
  | 'paw'
  | 'phone'
  | 'hangUp'
  | 'mic'
  | 'back'
  | 'studio'
  | 'close'
  | 'space'
  | 'animals_farm'
  | 'animals_jungle'
  | 'animals_ocean'
  | 'learn'
>;

/** The legacy filled option stays accepted; every control now shares the duotone weight. */
export function LearnIcon({ name }: { name: IconName; filled?: boolean }) {
  return <UiIcon name={name} />;
}

export function StarIcon() {
  return <UiIcon name="star" />;
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
