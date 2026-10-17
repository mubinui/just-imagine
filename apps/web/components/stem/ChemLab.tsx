'use client';
import { useState } from 'react';
import { REAGENTS } from '@just-imagine/stem-content';
import { useSchoolLanguage } from '../../lib/i18n/study';
import { schoolRequest } from '../../lib/school/api';
import { Field, ErrorNotice, useSchoolAction } from '../school/shared';
import type { Reaction, MixResult } from '@just-imagine/stem-sims';
import '../../app/stem.css';
export type LabAnswer = {
  reagentIds: string[];
  heat: boolean;
  amounts: Record<string, { volumeMl: number; concentrationM: number }>;
};
type ReactResponse =
  | {
      status: 'reaction';
      source: 'table' | 'ai';
      result: MixResult & { reaction: Reaction | null };
    }
  | { status: 'unsupported'; message: string };
export function Formula({ value }: { value: string }) {
  return (
    <>
      {value
        .split(/(\d+)/)
        .map((part, i) =>
          /^\d+$/.test(part) && i > 0 && /[A-Za-z)]$/.test(value.split(/(\d+)/)[i - 1] ?? '') ? (
            <sub key={i}>{part}</sub>
          ) : (
            <span key={i}>{part.replaceAll('->', ' → ')}</span>
          ),
        )}
    </>
  );
}
export function ChemLab({
  offered = REAGENTS.map((r) => r.id),
  lessonId,
  stepIndex = 0,
  onAnswer,
}: {
  offered?: string[];
  lessonId?: string;
  stepIndex?: number;
  onAnswer?: (answer: LabAnswer) => void;
}) {
  const { s, language, text } = useSchoolLanguage(),
    action = useSchoolAction();
  const [answer, setAnswer] = useState<LabAnswer>({ reagentIds: [], heat: false, amounts: {} }),
    [result, setResult] = useState<ReactResponse>();
  function update(next: LabAnswer) {
    setAnswer(next);
    setResult(undefined);
    onAnswer?.(next);
  }
  function toggle(id: string) {
    const reagent = REAGENTS.find((r) => r.id === id)!;
    const ids = answer.reagentIds.includes(id)
      ? answer.reagentIds.filter((v) => v !== id)
      : [
          ...answer.reagentIds.filter(
            (v) =>
              reagent.kind !== 'indicator' ||
              REAGENTS.find((r) => r.id === v)?.kind !== 'indicator',
          ),
          id,
        ];
    const amounts = Object.fromEntries(
      ids
        .filter((v) => {
          const r = REAGENTS.find((r) => r.id === v);
          return r?.state === 'aq' && r.kind !== 'indicator';
        })
        .map((v) => [v, answer.amounts[v] ?? { volumeMl: 50, concentrationM: 0.1 }]),
    );
    update({ ...answer, reagentIds: ids, amounts });
  }

  const reaction = result?.status === 'reaction' ? result.result.reaction : null;
  const rawResult = result?.status === 'reaction' ? result.result : null;
  const colour = rawResult?.indicator?.colour ?? reaction?.observations.colourTo ?? 'transparent';
  return (
    <div className="stem-lab">
      <div className="stem-bench">
        <section>
          <h2>{s('chooseReagents')}</h2>
          <div
            className="stem-reagents"
            role="region"
            tabIndex={0}
            aria-label={s('chooseReagents')}
          >
            {REAGENTS.filter((r) => offered.includes(r.id)).map((r) => (
              <button
                type="button"
                key={r.id}
                draggable
                onDragStart={(e) => e.dataTransfer.setData('text/plain', r.id)}
                className="stem-reagent"
                aria-pressed={answer.reagentIds.includes(r.id)}
                onClick={() => toggle(r.id)}
              >
                <strong>
                  <Formula value={r.formula ?? r.id} />
                </strong>
                <span>{text(r.name)}</span>
                <span className="stem-reagent-state">
                  {answer.reagentIds.includes(r.id)
                    ? language === 'bn'
                      ? 'নির্বাচিত'
                      : 'Selected'
                    : language === 'bn'
                      ? 'যোগ করো'
                      : 'Add to beaker'}
                </span>
              </button>
            ))}
          </div>
        </section>
        <section
          className="stem-beaker"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData('text/plain');
            if (offered.includes(id) && !answer.reagentIds.includes(id)) toggle(id);
          }}
          aria-label={s('mix')}
        >
          <div>
            <svg viewBox="0 0 260 250" role="img" aria-label={s('observations')}>
              <path
                d="M60 35v170q0 12 12 12h116q12 0 12-12V35"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                d="M63 115h134v88q0 11-11 11H74q-11 0-11-11Z"
                fill={colour === 'transparent' ? 'var(--mint)' : colour}
              />
              {reaction?.observations.gas &&
                [0, 1, 2, 3, 4].map((i) => (
                  <circle
                    key={i}
                    cx={90 + i * 19}
                    cy={105 - (i % 3) * 22}
                    r={5 + (i % 3)}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="2"
                  />
                ))}
              {reaction?.observations.precipitate && (
                <path d="M66 194h128v16H66Z" fill={reaction.observations.precipitate.colour} />
              )}
              <text x="130" y="242" textAnchor="middle" fill="currentColor" fontSize="18">
                pH {rawResult?.ph == null ? '—' : rawResult.ph.toFixed(2)}
              </text>
            </svg>
            <label className="sch-option">
              <input
                type="checkbox"
                checked={answer.heat}
                onChange={(e) => update({ ...answer, heat: e.target.checked })}
              />
              {s('heat')}
            </label>
            <div className="sch-toolbar">
              <button
                className="sch-primary"
                disabled={action.busy || !answer.reagentIds.length}
                onClick={() =>
                  void action.run(async () => {
                    setResult(
                      await schoolRequest<ReactResponse>('study/react', {
                        ...answer,
                        ...(lessonId ? { lessonId, stepIndex } : {}),
                      }),
                    );
                  })
                }
              >
                {action.busy ? s('loading') : s('mix')}
              </button>
              <button onClick={() => update({ reagentIds: [], heat: false, amounts: {} })}>
                {s('reset')}
              </button>
            </div>
          </div>
          <div>
            {answer.reagentIds.map((id) => {
              const reagent = REAGENTS.find((r) => r.id === id)!;
              return (
                <div key={id} className="stem-quantity">
                  <strong>{text(reagent.name)}</strong>
                  {reagent.state === 'aq' && reagent.kind !== 'indicator' && (
                    <>
                      <Field label={s('volume')}>
                        <input
                          type="number"
                          min="1"
                          max="1000"
                          step="1"
                          value={answer.amounts[id]?.volumeMl ?? 50}
                          onChange={(e) =>
                            update({
                              ...answer,
                              amounts: {
                                ...answer.amounts,
                                [id]: { ...answer.amounts[id]!, volumeMl: Number(e.target.value) },
                              },
                            })
                          }
                        />
                      </Field>
                      <Field label={s('concentration')}>
                        <input
                          type="number"
                          min="0.001"
                          max="5"
                          step="0.001"
                          value={answer.amounts[id]?.concentrationM ?? 0.1}
                          onChange={(e) =>
                            update({
                              ...answer,
                              amounts: {
                                ...answer.amounts,
                                [id]: {
                                  ...answer.amounts[id]!,
                                  concentrationM: Number(e.target.value),
                                },
                              },
                            })
                          }
                        />
                      </Field>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
      <ErrorNotice error={action.error} />
      {result?.status === 'unsupported' && (
        <p role="status">{language === 'bn' ? s('unknownReaction') : result.message}</p>
      )}
      {reaction && (
        <section className="stem-lab-result" aria-live="polite">
          <span className="sch-status">
            {s(
              result?.status === 'reaction' && result.source === 'ai' ? 'aiSource' : 'tableSource',
            )}
          </span>
          <p className="stem-equation">
            <Formula value={reaction.equation} />
          </p>
          <p>{text(reaction.explanation)}</p>
          {rawResult?.quantities && (
            <p>
              {s('volume')}: {rawResult.quantities.volumeMl.toFixed(1)} ·{' '}
              {language === 'bn' ? 'সীমিত বিকারক' : 'Limiting reagent'}:{' '}
              {rawResult.quantities.limitingReagent ?? '—'}
            </p>
          )}
          <h3>{s('products')}</h3>
          <p>{reaction.products.map((p) => `${text(p.name)} (${p.formula})`).join(' · ')}</p>
          <h3>{s('observations')}</h3>
          <p>
            {reaction.observations.gas && (
              <>
                {language === 'bn' ? 'গ্যাস' : 'Gas'}: <Formula value={reaction.observations.gas} />{' '}
                ·{' '}
              </>
            )}
            {reaction.observations.precipitate && (
              <>
                {language === 'bn' ? 'অধঃক্ষেপ' : 'Precipitate'}:{' '}
                <Formula value={reaction.observations.precipitate.formula} /> ·{' '}
              </>
            )}
            {language === 'bn' ? 'তাপমাত্রা' : 'Temperature'}:{' '}
            {reaction.observations.tempChange === 'up'
              ? '↑'
              : reaction.observations.tempChange === 'down'
                ? '↓'
                : '—'}
          </p>
        </section>
      )}
    </div>
  );
}
