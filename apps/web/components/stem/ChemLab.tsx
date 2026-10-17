'use client';
import { useEffect, useState } from 'react';
import { REAGENTS } from '@just-imagine/stem-content';
import { useSchoolLanguage } from '../../lib/i18n/study';
import { schoolRequest } from '../../lib/school/api';
import { ErrorNotice, useSchoolAction } from '../school/shared';
import {
  MAX_IDEAL_PH_CONCENTRATION_M,
  type Reaction,
  type MixResult,
} from '@just-imagine/stem-sims';
import { requestSnapshot, runCurrentRequest } from '../../lib/school/request-snapshot';
import { UiIcon } from '../UiIcon';
import { useStudyCopy } from '../study/copy';
import {
  REAGENT_GROUPS,
  groupReagents,
  limitingSummary,
  phRangeIssue,
  type LabAnswer,
} from './lab-logic';
import '../../app/stem.css';
export type { LabAnswer } from './lab-logic';
type ReactResponse =
  | {
      status: 'reaction' | 'observation';
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
const EMPTY: LabAnswer = { reagentIds: [], heat: false, amounts: {} };
const reagent = (id: string) => REAGENTS.find((r) => r.id === id);
/** Indicators are known by name; long organic formulas are noise on a school bench. */
const showsFormula = (r: (typeof REAGENTS)[number]) => Boolean(r.formula) && r.kind !== 'indicator';

export function ChemLab({
  offered = REAGENTS.map((r) => r.id),
  lessonId,
  stepIndex = 0,
  onAnswer,
  initial,
}: {
  offered?: string[];
  lessonId?: string;
  stepIndex?: number;
  onAnswer?: (answer: LabAnswer) => void;
  initial?: LabAnswer;
}) {
  const { s, language, text } = useSchoolLanguage(),
    { t, n } = useStudyCopy(),
    action = useSchoolAction();
  const [answer, setAnswer] = useState<LabAnswer>(() =>
      initial && Array.isArray(initial.reagentIds)
        ? {
            reagentIds: initial.reagentIds,
            heat: Boolean(initial.heat),
            amounts: initial.amounts ?? {},
          }
        : EMPTY,
    ),
    [result, setResult] = useState<ReactResponse>(),
    [mixed, setMixed] = useState<LabAnswer>();
  const [snapshots] = useState(requestSnapshot);
  const scope = JSON.stringify([lessonId, stepIndex, offered]);
  useEffect(() => () => snapshots.invalidate(), [snapshots, scope]);
  function update(next: LabAnswer) {
    snapshots.invalidate();
    setAnswer(next);
    setResult(undefined);
    action.setError('');
    onAnswer?.(next);
  }
  function toggle(id: string) {
    const chosen = reagent(id)!;
    const ids = answer.reagentIds.includes(id)
      ? answer.reagentIds.filter((v) => v !== id)
      : [
          ...answer.reagentIds.filter(
            (v) => chosen.kind !== 'indicator' || reagent(v)?.kind !== 'indicator',
          ),
          id,
        ];
    const amounts = Object.fromEntries(
      ids
        .filter((v) => {
          const r = reagent(v);
          return r?.state === 'aq' && r.kind !== 'indicator';
        })
        .map((v) => [v, answer.amounts[v] ?? { volumeMl: 50, concentrationM: 0.1 }]),
    );
    update({ ...answer, reagentIds: ids, amounts });
  }
  function setAmount(id: string, key: 'volumeMl' | 'concentrationM', value: number) {
    update({
      ...answer,
      amounts: { ...answer.amounts, [id]: { ...answer.amounts[id]!, [key]: value } },
    });
  }

  const rawResult = result && 'result' in result ? result.result : null;
  const reaction = rawResult?.reaction ?? null;
  const selected = answer.reagentIds.map(reagent).filter((r) => r !== undefined);
  const restingColour =
    selected.find((r) => r.kind !== 'indicator' && r.state !== 's')?.colour ?? null;
  const colour =
    rawResult?.indicator?.colour ?? reaction?.observations.colourTo ?? restingColour ?? null;
  const hasLiquid = selected.some((r) => r.state !== 's' && r.state !== 'g') || Boolean(rawResult);
  const groups = groupReagents(REAGENTS.filter((r) => offered.includes(r.id)));
  const rangeIssue = mixed ? phRangeIssue(mixed) : null;
  const limits =
    reaction && rawResult?.quantities
      ? limitingSummary(rawResult.quantities, reaction, REAGENTS)
      : null;
  const ph = rawResult?.ph ?? null;
  const tempChange = reaction?.observations.tempChange;

  return (
    <div className="stem-lab">
      <div className="stem-bench">
        <section className="stem-shelf" aria-labelledby={`shelf-${stepIndex}`}>
          <header className="stem-panel-head">
            <h2 id={`shelf-${stepIndex}`}>{t('shelf')}</h2>
            <p>{t('shelfNote')}</p>
          </header>
          {groups.map((group) => (
            <div className="stem-reagent-group" key={group.id}>
              <h3>{REAGENT_GROUPS[group.id][language === 'bn' ? 1 : 0]}</h3>
              <div className="stem-reagents">
                {group.reagents.map((r) => {
                  const on = answer.reagentIds.includes(r.id);
                  return (
                    <button
                      type="button"
                      key={r.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('text/plain', r.id)}
                      className="stem-reagent"
                      data-kind={r.kind}
                      aria-pressed={on}
                      onClick={() => toggle(r.id)}
                    >
                      <span
                        className="stem-swatch"
                        data-state={r.state}
                        style={{ '--swatch': r.colour } as React.CSSProperties}
                        aria-hidden="true"
                      />
                      <span className="stem-reagent-text">
                        {showsFormula(r) ? (
                          <>
                            <strong>
                              <Formula value={r.formula!} />
                            </strong>
                            <span>{text(r.name)}</span>
                          </>
                        ) : (
                          <strong className="stem-reagent-name">{text(r.name)}</strong>
                        )}
                      </span>
                      <span className="stem-reagent-state" aria-hidden="true">
                        {on && <UiIcon name="check" width={20} height={20} />}
                        <span className="sr-only">{on ? t('added') : t('add')}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </section>
        <section
          className="stem-beaker"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            const id = e.dataTransfer.getData('text/plain');
            if (offered.includes(id) && !answer.reagentIds.includes(id)) toggle(id);
          }}
          aria-labelledby={`beaker-${stepIndex}`}
        >
          <header className="stem-panel-head">
            <h2 id={`beaker-${stepIndex}`}>{t('inBeaker')}</h2>
          </header>
          <div className="stem-beaker-stage">
            <svg viewBox="0 0 260 230" role="img" aria-label={s('observations')}>
              {answer.heat && (
                <path
                  d="M104 222q-8-10 0-20t0-20M130 222q-8-10 0-20t0-20M156 222q-8-10 0-20t0-20"
                  className="stem-heat"
                />
              )}
              {hasLiquid && (
                <path
                  d="M63 95h134v88q0 11-11 11H74q-11 0-11-11Z"
                  fill={colour ?? 'var(--stem-liquid)'}
                  className="stem-liquid"
                />
              )}
              {selected
                .filter((r) => r.state === 's')
                .map((r, i) => (
                  <ellipse
                    key={r.id}
                    cx={100 + i * 30}
                    cy={186}
                    rx={14}
                    ry={6}
                    fill={r.colour}
                    stroke="var(--soft)"
                  />
                ))}
              {reaction?.observations.gas &&
                [0, 1, 2, 3, 4].map((i) => (
                  <circle
                    key={i}
                    cx={90 + i * 19}
                    cy={85 - (i % 3) * 20}
                    r={5 + (i % 3)}
                    fill="none"
                    stroke="var(--accent)"
                    strokeWidth="2"
                  />
                ))}
              {reaction?.observations.precipitate && (
                <path d="M66 174h128v16H66Z" fill={reaction.observations.precipitate.colour} />
              )}
              <path
                d="M52 22h8v163q0 14 14 14h112q14 0 14-14V22h8"
                fill="none"
                stroke="currentColor"
                strokeWidth="4"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              {[60, 100, 140].map((y) => (
                <path key={y} d={`M182 ${y}h14`} stroke="var(--soft)" strokeWidth="2" />
              ))}
            </svg>
            <p className="stem-ph-readout" aria-live="polite">
              <span>pH</span>
              <strong>{ph === null ? '—' : n(ph, 2)}</strong>
            </p>
          </div>
          {selected.length ? (
            <ul className="stem-contents">
              {selected.map((r) => (
                <li key={r.id} className="stem-quantity">
                  <div className="stem-quantity-head">
                    <span
                      className="stem-swatch"
                      data-state={r.state}
                      style={{ '--swatch': r.colour } as React.CSSProperties}
                      aria-hidden="true"
                    />
                    <strong>
                      {showsFormula(r) && (
                        <span>
                          <Formula value={r.formula!} />
                        </span>
                      )}
                      <span className="stem-quantity-name">{text(r.name)}</span>
                    </strong>
                    <button
                      type="button"
                      className="stem-remove"
                      aria-label={t('remove', { name: text(r.name) })}
                      onClick={() => toggle(r.id)}
                    >
                      <UiIcon name="close" width={18} height={18} />
                    </button>
                  </div>
                  {r.state === 'aq' && r.kind !== 'indicator' && (
                    <div className="stem-quantity-fields">
                      <label>
                        <span>{t('volume')}</span>
                        <span className="stem-unit-input">
                          <input
                            type="number"
                            min="1"
                            max="1000"
                            step="1"
                            value={answer.amounts[r.id]?.volumeMl ?? 50}
                            onChange={(e) => setAmount(r.id, 'volumeMl', Number(e.target.value))}
                          />
                          <span>mL</span>
                        </span>
                      </label>
                      <label>
                        <span>{t('concentration')}</span>
                        <span className="stem-unit-input">
                          <input
                            type="number"
                            min="0.001"
                            max="5"
                            step="0.001"
                            value={answer.amounts[r.id]?.concentrationM ?? 0.1}
                            onChange={(e) =>
                              setAmount(r.id, 'concentrationM', Number(e.target.value))
                            }
                          />
                          <span>M</span>
                        </span>
                      </label>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="stem-beaker-empty">{t('beakerEmpty')}</p>
          )}
          <label className="sch-option stem-heat-toggle">
            <input
              type="checkbox"
              checked={answer.heat}
              onChange={(e) => update({ ...answer, heat: e.target.checked })}
            />
            {s('heat')}
          </label>
          <div className="stem-beaker-actions">
            <button
              className="sch-primary"
              disabled={action.busy || !answer.reagentIds.length}
              onClick={() =>
                void action.run(async () => {
                  const submitted = answer;
                  await runCurrentRequest(
                    snapshots.begin(),
                    schoolRequest<ReactResponse>('study/react', {
                      ...submitted,
                      ...(lessonId ? { lessonId, stepIndex } : {}),
                    }),
                    (next) => {
                      setMixed(submitted);
                      setResult(next);
                    },
                  );
                })
              }
            >
              {action.busy ? t('mixing') : s('mix')}
            </button>
            <button
              type="button"
              disabled={!answer.reagentIds.length && !answer.heat}
              onClick={() => update(EMPTY)}
            >
              <UiIcon name="restart" width={20} height={20} />
              {s('reset')}
            </button>
          </div>
          <ErrorNotice error={action.error} />
        </section>
      </div>
      {rawResult && (
        <section className="stem-lab-result" aria-live="polite">
          <header className="stem-result-head">
            <h2>{s('observations')}</h2>
            <span className="sch-status">
              {reaction
                ? s(
                    result?.status === 'reaction' && result.source === 'ai'
                      ? 'aiSource'
                      : 'tableSource',
                  )
                : t('model')}
            </span>
          </header>
          {reaction && (
            <p className="stem-equation">
              <Formula value={reaction.equation} />
            </p>
          )}
          {reaction && <p className="stem-result-copy">{text(reaction.explanation)}</p>}
          <dl className="stem-result-facts">
            <div>
              <dt>{t('phResult')}</dt>
              <dd>{ph === null ? '—' : n(ph, 2)}</dd>
            </div>
            {rawResult.quantities && (
              <div>
                <dt>{t('totalVolume')}</dt>
                <dd>
                  {n(rawResult.quantities.volumeMl, 1)} <span>mL</span>
                </dd>
              </div>
            )}
            {limits && (
              <div>
                <dt>{t('limiting')}</dt>
                <dd>
                  {limits.kind === 'exact' ? (
                    t('exactAmounts')
                  ) : (
                    <>
                      <Formula value={limits.formula} />
                      {limits.leftover.length > 0 && (
                        <small>
                          {t('leftOver')}:{' '}
                          {limits.leftover.map((l, i) => (
                            <span key={l.formula}>
                              {i > 0 && ', '}
                              <Formula value={l.formula} /> {n(l.moles, 4)} mol
                            </span>
                          ))}
                        </small>
                      )}
                    </>
                  )}
                </dd>
              </div>
            )}
            {reaction && (
              <div>
                <dt>{t('temperature')}</dt>
                <dd>
                  {tempChange === 'up'
                    ? t('warmer')
                    : tempChange === 'down'
                      ? t('cooler')
                      : t('noChange')}
                </dd>
              </div>
            )}
          </dl>
          {ph === null && (
            <p className="stem-result-note" role="status">
              {rangeIssue
                ? t('phOutOfRange', {
                    formula: reagent(rangeIssue.id)?.formula ?? rangeIssue.id,
                    c: rangeIssue.concentrationM,
                    max: MAX_IDEAL_PH_CONCENTRATION_M,
                  })
                : t('phUnknown')}
              {rawResult.indicator && t('indicatorUnknown')}
            </p>
          )}
          {rawResult.indicator && ph !== null && (
            <p className="stem-result-note">
              {rawResult.indicator.colour === null ? t('colourless') : t('colourShown')}
            </p>
          )}
          {reaction && (
            <>
              <h3>{s('products')}</h3>
              <ul className="stem-products">
                {reaction.products.map((p) => (
                  <li key={p.formula}>
                    <strong>
                      <Formula value={p.formula} />
                    </strong>{' '}
                    {text(p.name)}
                    {rawResult.quantities?.productsMoles[p.formula] !== undefined && (
                      <span className="stem-moles">
                        {n(rawResult.quantities.productsMoles[p.formula], 4)} mol
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              {(reaction.observations.gas || reaction.observations.precipitate) && (
                <ul className="stem-products">
                  {reaction.observations.gas && (
                    <li>
                      {t('gas')}:{' '}
                      <strong>
                        <Formula value={reaction.observations.gas} />
                      </strong>
                    </li>
                  )}
                  {reaction.observations.precipitate && (
                    <li>
                      {t('precipitate')}:{' '}
                      <strong>
                        <Formula value={reaction.observations.precipitate.formula} />
                      </strong>
                    </li>
                  )}
                </ul>
              )}
            </>
          )}
        </section>
      )}
      {result?.status === 'unsupported' && (
        <p className="stem-result-note stem-unsupported" role="status">
          {language === 'bn' ? s('unknownReaction') : result.message}
        </p>
      )}
      <p className="stem-model-note">{t('idealModel', { max: MAX_IDEAL_PH_CONCENTRATION_M })}</p>
    </div>
  );
}
