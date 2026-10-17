'use client';
import { useId, useSyncExternalStore } from 'react';
import { useLanguage } from '../lib/i18n';
import {
  getAppearanceSnapshot,
  getAppearanceServerSnapshot,
  subscribeAppearance,
  parseThemePreference,
  setThemePreference,
} from '../lib/appearance';
import '../app/theme-picker.css';

const COPY = {
  en: {
    title: 'App theme',
    label: 'Theme',
    default: 'Follow app default',
    defaultCompact: 'App default',
    forest: 'Forest',
    ocean: 'Ocean',
    terracotta: 'Terracotta',
    help: 'Choose the colors you see on this device. Characters and worlds keep their artwork.',
    saved: 'Your choice is saved on this device.',
    following: 'Following the app default.',
    temporary: 'Applied for this visit. This browser could not save your choice.',
  },
  bn: {
    title: 'অ্যাপের রং',
    label: 'রং',
    default: 'অ্যাপের রং অনুসরণ',
    defaultCompact: 'অ্যাপের নির্ধারিত',
    forest: 'বন',
    ocean: 'সমুদ্র',
    terracotta: 'পোড়ামাটি',
    help: 'এই ডিভাইসে পছন্দের রং বেছে নাও। চরিত্র ও জগতের ছবি একই থাকবে।',
    saved: 'এই ডিভাইসে তোমার পছন্দ রাখা হয়েছে।',
    following: 'অ্যাপের নির্ধারিত রং অনুসরণ করছে।',
    temporary: 'এবারের জন্য রং বদলেছে। এই ব্রাউজারে তোমার পছন্দ রাখা যায়নি।',
  },
} as const;

/** A device preference, independent of the operator's published app default. */
export function ThemePicker({
  compact = false,
  language: requestedLanguage,
}: {
  compact?: boolean;
  language?: 'en' | 'bn';
}) {
  const { language } = useLanguage();
  const copy = COPY[requestedLanguage ?? language];
  const state = useSyncExternalStore(
    subscribeAppearance,
    getAppearanceSnapshot,
    getAppearanceServerSnapshot,
  );
  const helpId = useId();
  const feedback = !state.preferenceSaved
    ? copy.temporary
    : state.preference === 'default'
      ? copy.following
      : copy.saved;
  const control = (
    <label>
      <span className="theme-picker-label">{copy.label}</span>
      <select
        aria-label={copy.title}
        aria-describedby={helpId}
        value={state.preference}
        onChange={(event) => setThemePreference(parseThemePreference(event.target.value))}
      >
        <option value="default">{compact ? copy.defaultCompact : copy.default}</option>
        <option value="forest">{copy.forest}</option>
        <option value="ocean">{copy.ocean}</option>
        <option value="terracotta">{copy.terracotta}</option>
      </select>
    </label>
  );
  return compact ? (
    <div className="theme-picker theme-picker--compact">
      {control}
      <span id={helpId} className="sr-only">
        {copy.help}
      </span>
      <span className="sr-only" role="status">
        {feedback}
      </span>
    </div>
  ) : (
    <section className="theme-picker theme-picker--settings parent-section">
      <h2>{copy.title}</h2>
      <p id={helpId}>{copy.help}</p>
      {control}
      <p className="theme-picker-feedback" role="status">
        {feedback}
      </p>
    </section>
  );
}
