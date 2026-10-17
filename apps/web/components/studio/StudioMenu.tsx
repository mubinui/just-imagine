'use client';
import { copy as uiText } from '../../lib/i18n/ui';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { useLanguage } from '../../lib/i18n';
import { s } from '../../lib/strings/en';
import { UiIcon } from '../UiIcon';

/** The Studio's one "More" menu: other worlds, Start over and Captions, kept off the stage. */
export function StudioMenu({
  worlds,
  captions,
  onRestart,
  onCaptions,
}: {
  worlds?: ReactNode;
  captions: boolean;
  onRestart: () => void;
  onCaptions: () => void;
}) {
  useLanguage();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      trigger.current?.focus();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);
  const more = uiText('More');
  return (
    <div className="studio-menu" ref={root}>
      <button
        ref={trigger}
        type="button"
        className="studio-menu-trigger"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => setOpen(!open)}
      >
        <span>{more}</span>
        <UiIcon name="chevron" />
      </button>
      {open && (
        <div
          id={id}
          className="studio-menu-panel"
          role="group"
          aria-label={more}
          // A chosen world, Start over or Captions closes the menu; the stage stays in view.
          onClick={(event) => {
            if (event.target instanceof Element && event.target.closest('button')) setOpen(false);
          }}
        >
          {worlds && <div className="studio-menu-worlds">{worlds}</div>}
          <div className="studio-menu-actions">
            <button type="button" onClick={onRestart}>
              <UiIcon name="restart" />
              <span>{s.reset}</span>
            </button>
            <button type="button" aria-pressed={captions} onClick={onCaptions}>
              <UiIcon name="captions" />
              <span>{s.captions}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
