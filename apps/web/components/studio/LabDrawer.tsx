'use client';
import type { Variable, Challenge } from '@just-imagine/scene-schema';
import { s } from '../../lib/strings/en';
import { ChevronIcon } from './parts';

export function LabDrawer({
  variables,
  values,
  challenges,
  activeChallenge,
  completedChallenge,
  open,
  onToggle,
  onChange,
  onKeypad,
}: {
  variables: Record<string, Variable>;
  values: Record<string, number>;
  challenges: Challenge[];
  activeChallenge: string;
  completedChallenge: string;
  open: boolean;
  onToggle: () => void;
  onChange: (id: string, value: number, v: Variable) => void;
  onKeypad: (id: string, v: Variable) => void;
}) {
  return (
    <section className={open ? 'lab-drawer' : 'lab-drawer is-closed'} aria-label={s.lab}>
      <div className="lab-head">
        <h2>{s.lab}</h2>
        <button
          type="button"
          aria-expanded={open}
          aria-label={open ? s.labClose : s.labOpen}
          onClick={onToggle}
        >
          <ChevronIcon />
        </button>
      </div>
      <div className="lab-body">
        {Object.entries(variables).map(([id, v]) => (
          <div className="variable" key={id}>
            <label htmlFor={id}>
              {v.label}
              <output htmlFor={id}>
                {values[id] ?? v.value} {v.unit}
              </output>
            </label>
            <input
              id={id}
              type="range"
              min={v.min}
              max={v.max}
              step={v.step}
              value={values[id] ?? v.value}
              onChange={(e) => onChange(id, Number(e.target.value), v)}
            />
            <button type="button" className="num" onClick={() => onKeypad(id, v)}>
              {s.numeric}
            </button>
          </div>
        ))}
        {challenges.map((c) => {
          const state =
            completedChallenge === c.id ? 'done' : activeChallenge === c.id ? 'active' : '';
          return (
            <p className={state ? `challenge ${state}` : 'challenge'} key={c.id} aria-live="polite">
              <strong>
                {state === 'done'
                  ? s.challengeDone
                  : state === 'active'
                    ? s.challengeActive
                    : s.challengeTry}
                : {c.goal}
              </strong>
              {c.hint}
            </p>
          );
        })}
      </div>
    </section>
  );
}
