'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { SIMS, type SimId, type SimModel, type Observable } from '@just-imagine/stem-sims';
import { useSchoolLanguage } from '../../lib/i18n/study';
import { Field } from '../school/shared';
import { readingLabel, readingState, forceVectorLengths } from '../../lib/school/readings';
import '../../app/stem.css';
export const SIM_DEFAULTS: Record<SimId, Record<string, unknown>> = {
  'motion-graphs': { u: 5, a: 1, duration: 10 },
  'newton-cart': { mass: 2, force: 12, muS: 0.4, muK: 0.2 },
  'ohms-circuit': { emf: 6, topology: 'series', resistors: [10, 20] },
  'linear-graph': { m: 1, c: 0 },
  'unit-circle': { angleDeg: 45 },
};
export const PARAMS: Record<
  SimId,
  { id: string; label: [string, string]; min: number; max: number; step: number; unit: string }[]
> = {
  'motion-graphs': [
    { id: 'u', label: ['Initial velocity', 'আদি বেগ'], min: 0, max: 20, step: 0.5, unit: 'm/s' },
    { id: 'a', label: ['Acceleration', 'ত্বরণ'], min: -5, max: 5, step: 0.1, unit: 'm/s²' },
    { id: 'duration', label: ['Duration', 'সময়কাল'], min: 2, max: 20, step: 0.5, unit: 's' },
  ],
  'newton-cart': [
    { id: 'mass', label: ['Mass', 'ভর'], min: 0.5, max: 10, step: 0.1, unit: 'kg' },
    { id: 'force', label: ['Applied force', 'প্রযুক্ত বল'], min: 0, max: 60, step: 0.1, unit: 'N' },
    {
      id: 'muS',
      label: ['Static friction coefficient', 'স্থিত ঘর্ষণ গুণাঙ্ক'],
      min: 0,
      max: 0.8,
      step: 0.01,
      unit: '',
    },
    {
      id: 'muK',
      label: ['Kinetic friction coefficient', 'গতীয় ঘর্ষণ গুণাঙ্ক'],
      min: 0,
      max: 0.8,
      step: 0.01,
      unit: '',
    },
  ],
  'ohms-circuit': [
    { id: 'emf', label: ['Voltage', 'বিভব পার্থক্য'], min: 1.5, max: 12, step: 0.1, unit: 'V' },
  ],
  'linear-graph': [
    { id: 'm', label: ['Slope', 'ঢাল'], min: -10, max: 10, step: 0.1, unit: '' },
    { id: 'c', label: ['Intercept', 'অক্ষছেদ'], min: -10, max: 10, step: 0.1, unit: '' },
  ],
  'unit-circle': [
    { id: 'angleDeg', label: ['Angle', 'কোণ'], min: 0, max: 360, step: 1, unit: '°' },
  ],
};
export function scientificNumber(value: unknown): string {
  if (value === null) return '—';
  if (typeof value === 'boolean') return value ? '✓' : '—';
  if (typeof value !== 'number') return String(value ?? '');
  return (Math.abs(value) < 1e-9 ? 0 : value).toLocaleString('en-US', { maximumFractionDigits: 3 });
}
const plot = (x: number, y: number) => `${320 + x * 20},${200 - y * 14}`;
export function SimView({
  id,
  value,
  onChange,
  locked = [],
  onObserve,
  highlight,
}: {
  id: SimId;
  value: Record<string, unknown>;
  onChange: (v: Record<string, unknown>) => void;
  locked?: string[];
  onObserve?: (simId: string, o: Observable) => void;
  highlight?: string;
}) {
  const { language, s } = useSchoolLanguage(),
    [running, setRunning] = useState(false),
    [time, setTime] = useState(0);
  const vectorId = useId().replaceAll(':', '');
  const model = SIMS[id] as SimModel<unknown>;
  const parsed = model.params.safeParse(value);
  const valid = parsed.success;
  const params = parsed.success ? parsed.data : model.params.parse(SIM_DEFAULTS[id]);
  const horizon = typeof value.duration === 'number' ? value.duration : 5;
  const o = model.at(params, time);
  const forceVectors = forceVectorLengths(Number(value.force ?? 0), Number(o.friction ?? 0));
  const timeRef = useRef(0);
  useEffect(() => {
    timeRef.current = time;
  }, [time]);
  const callback = useRef(onObserve);
  useEffect(() => {
    callback.current = onObserve;
  }, [onObserve]);
  const observationJson = JSON.stringify(o);
  useEffect(() => {
    callback.current?.(id, JSON.parse(observationJson));
  }, [id, observationJson]);
  useEffect(() => {
    if (!running) return;
    let frame = 0,
      previous = performance.now(),
      elapsed = timeRef.current;
    const tick = (now: number) => {
      const dt = (now - previous) / 1000;
      previous = now;
      elapsed = Math.min(horizon, elapsed + dt);
      setTime(elapsed);
      if (elapsed >= horizon) {
        setRunning(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, horizon]);
  function set(key: string, n: unknown) {
    if (locked.includes(key)) return;
    onChange({ ...value, [key]: n });
    setTime(0);
    setRunning(false);
  }
  const graph = id === 'linear-graph',
    circle = id === 'unit-circle';
  function drag(event: React.PointerEvent<SVGSVGElement>) {
    if (!event.buttons) return;
    const rect = event.currentTarget.getBoundingClientRect(),
      x = ((event.clientX - rect.left) / rect.width) * 640,
      y = ((event.clientY - rect.top) / rect.height) * 400;
    if (circle)
      set('angleDeg', Math.round(((Math.atan2(200 - y, x - 320) * 180) / Math.PI + 360) % 360));
    if (graph)
      set('c', Math.max(-10, Math.min(10, (200 - y) / 14 - (Number(value.m) * (x - 320)) / 20)));
  }
  return (
    <div className="stem-workspace">
      <section className="stem-visual">
        <svg
          className="stem-canvas"
          viewBox="0 0 640 400"
          role="img"
          aria-label={id}
          onPointerDown={(e) => {
            if (graph || circle) {
              e.currentTarget.setPointerCapture(e.pointerId);
              drag(e);
            }
          }}
          onPointerMove={drag}
        >
          {(graph || circle) && (
            <>
              <path d="M30 200H610M320 25V375" className="stem-axis" />
              {(circle ? [-1, -0.5, 0.5, 1] : [-10, -5, 5, 10]).map((n) => (
                <g key={n}>
                  <text x={320 + n * (circle ? 140 : 20)} y="220" textAnchor="middle">
                    {n}
                  </text>
                  <text x="305" y={200 - n * (circle ? 140 : 14)}>
                    {n}
                  </text>
                </g>
              ))}
            </>
          )}
          {graph && (
            <>
              <polyline
                points={`${plot(-15, -15 * Number(value.m) + Number(value.c))} ${plot(15, 15 * Number(value.m) + Number(value.c))}`}
                className="stem-line"
              />
              <circle cx="320" cy={200 - Number(value.c) * 14} r="9" className="stem-handle" />
              <text x="32" y="35">
                y = {scientificNumber(value.m)}x + {scientificNumber(value.c)}
              </text>
            </>
          )}
          {circle && (
            <>
              <circle cx="320" cy="200" r="140" className="stem-circle" />
              <path
                d={`M320 200L${320 + Number(o.cos) * 140} ${200 - Number(o.sin) * 140}`}
                className="stem-line"
              />
              <path
                d={`M${320 + Number(o.cos) * 140} 200V${200 - Number(o.sin) * 140}H320`}
                className="stem-projection"
              />
              <circle
                cx={320 + Number(o.cos) * 140}
                cy={200 - Number(o.sin) * 140}
                r="9"
                className="stem-handle"
              />
              <text x="30" y="35">
                sin θ = {scientificNumber(o.sin)} · cos θ = {scientificNumber(o.cos)}
              </text>
            </>
          )}
          {id === 'newton-cart' && (
            <>
              <path d="M35 290H605" className="stem-axis" />
              <g
                transform={`translate(${55 + Math.min(430, (Number(o.x) / Math.max(1, Number(model.solve(params).x))) * 430)},220)`}
              >
                <rect x="0" y="0" width="85" height="48" rx="8" className="stem-body" />
                <circle cx="18" cy="62" r="13" className="stem-wheel" />
                <circle cx="68" cy="62" r="13" className="stem-wheel" />
                <text x="42" y="29" textAnchor="middle">
                  {value.mass as number} kg
                </text>
              </g>
              <defs>
                <marker
                  id={vectorId + '-push'}
                  markerWidth="11"
                  markerHeight="11"
                  refX="10"
                  refY="5.5"
                  orient="auto"
                  markerUnits="userSpaceOnUse"
                >
                  <path d="M0 0L11 5.5L0 11Z" fill="var(--accent)" />
                </marker>
                <marker
                  id={vectorId + '-friction'}
                  markerWidth="11"
                  markerHeight="11"
                  refX="10"
                  refY="5.5"
                  orient="auto"
                  markerUnits="userSpaceOnUse"
                >
                  <path d="M0 0L11 5.5L0 11Z" fill="var(--focus)" />
                </marker>
              </defs>
              {Number(value.force) > 0 && (
                <path
                  d={`M320 110h${forceVectors.applied}`}
                  className="stem-line"
                  markerEnd={`url(#${vectorId}-push)`}
                />
              )}
              {Number(o.friction) > 0 && (
                <path
                  d={`M320 160h${-forceVectors.friction}`}
                  className="stem-force-friction"
                  markerEnd={`url(#${vectorId}-friction)`}
                />
              )}
              <circle cx="320" cy="110" r="4" fill="var(--accent)" />
              <circle cx="320" cy="160" r="4" fill="var(--focus)" />
              <text x="40" y="55">
                {language === 'bn' ? 'বলচিত্র' : 'Force diagram'} (N)
              </text>
              <text x="330" y="92">
                {language === 'bn' ? 'প্রযুক্ত বল' : 'Applied force'}:{' '}
                {scientificNumber(value.force)} N
              </text>
              <text x="310" y="195" textAnchor="end">
                {language === 'bn' ? 'ঘর্ষণ বল' : 'Friction force'}: {scientificNumber(o.friction)}{' '}
                N
              </text>
              <text x="40" y="345">
                a = {scientificNumber(o.a)} m/s² · v = {scientificNumber(o.v)} m/s
              </text>
            </>
          )}
          {id === 'motion-graphs' && (
            <>
              {[0, 1].map((panel) => {
                const max = Math.max(
                  1,
                  ...Array.from({ length: 61 }, (_, i) =>
                    Number(model.at(params, (horizon * i) / 60)[panel ? 'v' : 'x']),
                  ),
                );
                return (
                  <g key={panel} transform={`translate(${panel * 300},0)`}>
                    <path d="M45 320V70M45 320H295" className="stem-axis" />
                    <text x="50" y="45">
                      {panel ? 'v (m/s)' : 'x (m)'}
                    </text>
                    <text x="235" y="350">
                      t (s)
                    </text>
                    <polyline
                      points={Array.from(
                        { length: 61 },
                        (_, i) =>
                          `${45 + (i / 60) * 240},${320 - (Number(model.at(params, (horizon * i) / 60)[panel ? 'v' : 'x']) / max) * 230}`,
                      ).join(' ')}
                      className="stem-line"
                    />
                    <circle
                      cx={45 + (time / horizon) * 240}
                      cy={320 - (Number(o[panel ? 'v' : 'x']) / max) * 230}
                      r="7"
                      className="stem-handle"
                    />
                  </g>
                );
              })}
            </>
          )}
          {id === 'ohms-circuit' && (
            <>
              <path
                d={
                  value.topology === 'parallel'
                    ? 'M100 185V70H550V310H100V215M85 185h30M90 215h20'
                    : 'M100 185V80H550V310H100V215M85 185h30M90 215h20'
                }
                className="stem-wire"
              />
              {(value.resistors as number[]).map((r, i) => (
                <g
                  key={i}
                  transform={
                    value.topology === 'parallel'
                      ? `translate(300,${95 + i * 85})`
                      : `translate(${200 + i * 115},80)`
                  }
                >
                  {value.topology === 'parallel' && (
                    <path d="M-200 0H-18M52 0H250" className="stem-wire" />
                  )}
                  <rect x="-18" y="-16" width="70" height="32" rx="4" className="stem-body" />
                  <text x="15" y="7" textAnchor="middle">
                    {r} Ω
                  </text>
                  <text
                    x={value.topology === 'parallel' ? 100 : 15}
                    y={value.topology === 'parallel' ? 25 : 65}
                    textAnchor="middle"
                  >
                    {scientificNumber(o['v' + i])} V
                  </text>
                  <text
                    x={value.topology === 'parallel' ? 180 : 15}
                    y={value.topology === 'parallel' ? 25 : 95}
                    textAnchor="middle"
                  >
                    {scientificNumber(o['p' + i])} W
                  </text>
                </g>
              ))}
              <text x="65" y="255">
                {scientificNumber(value.emf)} V
              </text>
              <text x="180" y={value.topology === 'parallel' ? 365 : 270}>
                I = {scientificNumber(o.current)} A
              </text>
              <text x="380" y="365">
                {value.topology === 'parallel' ? '∥' : '—'} R = {scientificNumber(o.req)} Ω
              </text>
            </>
          )}
        </svg>
        {circle && (
          <svg className="stem-traces" viewBox="0 0 640 160" role="img" aria-label="sin θ, cos θ">
            <path d="M30 80H610M30 20V140" className="stem-axis" />
            <polyline
              points={Array.from(
                { length: 121 },
                (_, i) => `${30 + (i / 120) * 580},${80 - Math.sin((i / 120) * Math.PI * 2) * 55}`,
              ).join(' ')}
              className="stem-line"
            />
            <polyline
              points={Array.from(
                { length: 121 },
                (_, i) => `${30 + (i / 120) * 580},${80 - Math.cos((i / 120) * Math.PI * 2) * 55}`,
              ).join(' ')}
              className="stem-projection"
            />
            <path
              d={`M${30 + (Number(value.angleDeg) / 360) * 580} 20V140`}
              className="stem-axis"
            />
            <text x="45" y="155">
              sin θ
            </text>
            <text x="130" y="155">
              cos θ
            </text>
            <text x="570" y="155">
              360°
            </text>
          </svg>
        )}
        <div className="stem-run">
          {(id === 'motion-graphs' || id === 'newton-cart') && (
            <button
              onClick={() => {
                if (time >= horizon) setTime(0);
                setRunning(!running);
              }}
              aria-pressed={running}
            >
              {s(running ? 'pause' : 'play')}
            </button>
          )}
          <button
            onClick={() => {
              setRunning(false);
              setTime(0);
            }}
          >
            {s('reset')}
          </button>
          <output>
            {s('time')}: {scientificNumber(time)} s
          </output>
        </div>
        <dl className="stem-readings">
          {Object.entries(o)
            .filter(
              ([key, v]) =>
                readingLabel(id, key, language) && !(id === 'ohms-circuit' && v === null),
            )
            .map(([key, v]) => (
              <div key={key}>
                <dt>{readingLabel(id, key, language)!.label}</dt>
                <dd>
                  {readingState(id, key, v, language) ?? scientificNumber(v)}
                  {v !== null && readingLabel(id, key, language)!.unit && (
                    <>
                      {' '}
                      <span>{readingLabel(id, key, language)!.unit}</span>
                    </>
                  )}
                </dd>
              </div>
            ))}
        </dl>
      </section>
      <aside className="stem-params">
        <h2>{s('parameters')}</h2>
        {!valid && <p role="alert">{parsed.error?.issues[0]?.message}</p>}
        {PARAMS[id].map((p) => (
          <Field key={p.id} label={`${p.label[language === 'bn' ? 1 : 0]} ${p.unit}`}>
            <div className={'stem-param ' + (highlight === p.id ? 'is-highlighted' : '')}>
              <input
                aria-label={p.label[language === 'bn' ? 1 : 0]}
                type="range"
                min={p.min}
                max={p.max}
                step={p.step}
                value={Number(value[p.id])}
                disabled={locked.includes(p.id)}
                onChange={(e) => set(p.id, Number(e.target.value))}
              />
              <input
                aria-label={p.label[language === 'bn' ? 1 : 0] + ' value'}
                type="number"
                min={p.min}
                max={p.max}
                step={p.step}
                value={Number(value[p.id])}
                disabled={locked.includes(p.id)}
                onChange={(e) => set(p.id, Number(e.target.value))}
              />
            </div>
          </Field>
        ))}
        {id === 'ohms-circuit' && (
          <>
            <Field label={language === 'bn' ? 'সংযোগ' : 'Connection'}>
              <select
                value={String(value.topology)}
                disabled={locked.includes('topology')}
                onChange={(e) => set('topology', e.target.value)}
              >
                <option value="series">{language === 'bn' ? 'শ্রেণি' : 'Series'}</option>
                <option value="parallel">{language === 'bn' ? 'সমান্তরাল' : 'Parallel'}</option>
              </select>
            </Field>
            {(value.resistors as number[]).map((r, i) => (
              <Field key={i} label={`R${i + 1} (Ω)`}>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={r}
                  disabled={locked.includes('resistors')}
                  onChange={(e) =>
                    set(
                      'resistors',
                      (value.resistors as number[]).map((v, j) =>
                        i === j ? Number(e.target.value) : v,
                      ),
                    )
                  }
                />
              </Field>
            ))}
            <button
              disabled={locked.includes('resistors') || (value.resistors as number[]).length >= 3}
              onClick={() => set('resistors', [...(value.resistors as number[]), 10])}
            >
              + R
            </button>
            <button
              disabled={locked.includes('resistors') || (value.resistors as number[]).length <= 1}
              onClick={() => set('resistors', (value.resistors as number[]).slice(0, -1))}
            >
              − R
            </button>
          </>
        )}
      </aside>
    </div>
  );
}
