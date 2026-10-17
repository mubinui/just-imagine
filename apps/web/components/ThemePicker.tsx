'use client';
import { useCallback, useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { THEME_PALETTES } from '@just-imagine/protocol';
import { UiIcon } from './UiIcon';
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
  const panelId = useId();
  const titleId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const choices = [
    { value: 'default', label: copy.defaultCompact, theme: state.published.theme },
    { value: 'forest', label: copy.forest, theme: 'forest' },
    { value: 'ocean', label: copy.ocean, theme: 'ocean' },
    { value: 'terracotta', label: copy.terracotta, theme: 'terracotta' },
  ] as const;
  const selected = choices.find((choice) => choice.value === state.preference)!;
  const placePanel = useCallback(() => {
    const bounds = trigger.current?.getBoundingClientRect();
    if (!bounds || !panel.current) return;
    const width = Math.min(288, window.innerWidth - 32);
    panel.current.style.setProperty(
      '--theme-panel-left',
      `${Math.max(16, Math.min(bounds.right - width, window.innerWidth - width - 16))}px`,
    );
    panel.current.style.setProperty(
      '--theme-panel-top',
      `${Math.max(16, Math.min(bounds.bottom + 8, window.innerHeight - 340))}px`,
    );
  }, []);
  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', placePanel);
    window.addEventListener('scroll', placePanel, true);
    return () => {
      window.removeEventListener('resize', placePanel);
      window.removeEventListener('scroll', placePanel, true);
    };
  }, [open, placePanel]);
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
      <button
        ref={trigger}
        type="button"
        className="theme-trigger"
        aria-label={copy.title}
        aria-expanded={open}
        aria-controls={panelId}
        aria-haspopup="dialog"
        popoverTarget={panelId}
        onClick={() => {
          placePanel();
          trigger.current?.focus();
        }}
      >
        <span
          className="theme-swatch"
          style={{ backgroundColor: THEME_PALETTES[state.theme].accent }}
          aria-hidden="true"
        />
        <span>{selected.label}</span>
        <UiIcon name="chevron" />
      </button>
      <div
        ref={panel}
        id={panelId}
        className="theme-panel"
        popover="auto"
        role="dialog"
        aria-labelledby={titleId}
        aria-describedby={helpId}
        onToggle={(event) => setOpen(event.newState === 'open')}
      >
        <h2 id={titleId}>{copy.title}</h2>
        <fieldset>
          <legend className="sr-only">{copy.label}</legend>
          {choices.map((choice) => (
            <label className="theme-choice" key={choice.value}>
              <span
                className="theme-swatch"
                style={{ backgroundColor: THEME_PALETTES[choice.theme].accent }}
                aria-hidden="true"
              />
              <span>{choice.label}</span>
              <input
                type="radio"
                name={panelId}
                value={choice.value}
                checked={state.preference === choice.value}
                onChange={() => setThemePreference(choice.value)}
              />
            </label>
          ))}
        </fieldset>
        <p className="theme-panel-feedback" role="status">
          {feedback}
        </p>
      </div>
      <span id={helpId} className="sr-only">
        {copy.help}
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
