'use client';
import { useEffect, useId, useRef, useState, type CSSProperties } from 'react';
import { SIMS, type SimId, type SimModel, type Observable } from '@just-imagine/stem-sims';
import { useSchoolLanguage } from '../../lib/i18n/study';
import { Field } from '../school/shared';
import { UiIcon } from '../UiIcon';
import { readingLabel, readingState, forceVectorLengths } from '../../lib/school/readings';
import {
  cartCamera,
  circuitGeometry,
  draggedParameter,
  simulationPoint,
} from '../../lib/school/simulation-geometry';
import {
  formatNumber,
  linearEquation,
  snapToStep,
  simName,
  isTimedSim,
  simClock,
} from './sim-format';
import {
  LIMITS,
  PARAMS,
  SIM_DEFAULTS,
  unitText,
  type ChoiceParam,
  type SliderParam,
} from '../../lib/stem/sim-params';
import { localUnit, stemReadingState } from '../../lib/stem/readings';
import { HIDE_WHEN_NULL, READOUTS, RENDERERS, usePrefersReducedMotion } from './renderers';
import '../../app/stem.css';
export { SIM_DEFAULTS, PARAMS };
export function scientificNumber(value: unknown, language: 'en' | 'bn' = 'en'): string {
  return formatNumber(value, language);
}
const plot = (x: number, y: number) => `${320 + x * 20},${200 - y * 14}`;
/** Put the equation chip in the first corner the plotted line does not cross. */
function labelCorner(m: number, c: number, width: number, height: number) {
  const lineY = (px: number) => 200 - (m * ((px - 320) / 20) + c) * 14;
  const corners = [
    { x: 24, y: 16 },
    { x: 616 - width, y: 16 },
    { x: 24, y: 384 - height },
    { x: 616 - width, y: 384 - height },
  ];
  const clear = corners.find(({ x, y }) => {
    const a = lineY(x - 8),
      b = lineY(x + width + 8);
    return Math.max(a, b) < y - 8 || Math.min(a, b) > y + height + 8;
  });
  return { ...(clear ?? corners[0]!), width, height };
}
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
  const num = (v: unknown, digits = 3) => formatNumber(v, language, digits);
  const reducedMotion = usePrefersReducedMotion();
  const workspace = useRef<HTMLDivElement>(null);
  const [textScale, setTextScale] = useState(1);
  useEffect(() => {
    const node = workspace.current?.querySelector('.stem-visual');
    if (!node || typeof ResizeObserver === 'undefined') return;
    // SVG text is drawn in a 640-unit world; keep it at a readable size on narrow canvases.
    const observer = new ResizeObserver(([entry]) => {
      const width = entry?.contentRect.width ?? 640;
      if (width > 0) setTextScale(Math.round((640 / width) * 100) / 100);
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);
  const model = SIMS[id] as SimModel<unknown>;
  const parsed = model.params.safeParse(value);
  const valid = parsed.success;
  const params = parsed.success ? parsed.data : null;
  const clock = valid ? simClock(id, params) : { horizon: 5, scale: 1 };
  const horizon = clock.horizon,
    timeScale = clock.scale;
  const o: Observable = valid ? model.at(params, time) : {};
  const Renderer = RENDERERS[id];
  const solved: Observable = valid && Renderer ? model.solve(params) : {};
  const resistors = Array.isArray(value.resistors)
    ? value.resistors.map((r: unknown) =>
        typeof r === 'number' && Number.isFinite(r) ? r : undefined,
      )
    : [];
  const circuit =
    valid && id === 'ohms-circuit'
      ? circuitGeometry(value.topology as 'series' | 'parallel', resistors.length)
      : null;
  const cart = id === 'newton-cart' && valid ? cartCamera(Number(o.x)) : null;
  const forceVectors = forceVectorLengths(Number(value.force ?? 0), Number(o.friction ?? 0));
  const timeRef = useRef(0);
  useEffect(() => {
    timeRef.current = time;
  }, [time]);
  const callback = useRef(onObserve);
  useEffect(() => {
    callback.current = onObserve;
  }, [onObserve]);
  const observationJson = valid ? JSON.stringify(o) : null;
  useEffect(() => {
    if (observationJson !== null) callback.current?.(id, JSON.parse(observationJson));
  }, [id, observationJson]);
  useEffect(() => {
    if (!running || !valid) return;
    let frame = 0,
      previous = performance.now(),
      elapsed = timeRef.current;
    const tick = (now: number) => {
      const dt = (now - previous) / 1000;
      previous = now;
      elapsed = Math.min(horizon, elapsed + dt * timeScale);
      setTime(elapsed);
      if (elapsed >= horizon) {
        setRunning(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [running, horizon, timeScale, valid]);
  function update(changes: Record<string, unknown>) {
    const allowed = Object.entries(changes).filter(([key]) => !locked.includes(key));
    if (!allowed.length) return;
    onChange({ ...value, ...Object.fromEntries(allowed) });
    setTime(0);
    setRunning(false);
  }
  function set(key: string, n: unknown) {
    update({ [key]: n });
  }
  const graph = id === 'linear-graph',
    circle = id === 'unit-circle';
  function drag(event: React.PointerEvent<SVGSVGElement>) {
    if (!event.buttons) return;
    const point = simulationPoint(
      [event.clientX, event.clientY],
      event.currentTarget.getScreenCTM(),
    );
    const change = draggedParameter(id, value, point, locked);
    const range = PARAMS[id].find(
      (p): p is SliderParam => p.id === change?.key && p.kind !== 'choice',
    );
    if (change) set(change.key, range ? snapToStep(change.value, range) : change.value);
  }
  const svgFont = Math.min(24, Math.max(16, 11.5 * textScale));
  const timed = isTimedSim(id);
  const equation = graph ? linearEquation(Number(value.m), Number(value.c), language) : '';
  const equationBox = graph
    ? labelCorner(
        Number(value.m),
        Number(value.c),
        equation.length * svgFont * 0.56 + 28,
        svgFont + 18,
      )
    : null;
  return (
    <div
      className="stem-workspace"
      ref={workspace}
      style={{ '--stem-font': `${svgFont}px` } as CSSProperties}
    >
      <section className="stem-visual">
        {!valid && (
          <p role="status" className="stem-paused">
            {language === 'bn'
              ? 'মানগুলো ঠিক না হওয়া পর্যন্ত চিত্র ও ফল দেখানো বন্ধ আছে।'
              : 'The diagram and readings are paused until the values are valid.'}
          </p>
        )}
        {valid && Renderer && (
          <Renderer
            params={params as Record<string, unknown>}
            o={o}
            solved={solved}
            time={time}
            horizon={horizon}
            running={running}
            language={language}
            num={num}
            font={svgFont}
            name={simName(id, language)}
            set={set}
            update={update}
            locked={locked}
            reducedMotion={reducedMotion}
          />
        )}
        {valid && !Renderer && (
          <svg
            className="stem-canvas"
            viewBox="0 0 640 400"
            role="img"
            aria-label={simName(id, language)}
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
                    <path
                      d={`M${320 + n * (circle ? 140 : 20)} 195v10M315 ${200 - n * (circle ? 140 : 14)}h10`}
                      className="stem-axis"
                    />
                    <text
                      x={320 + n * (circle ? 140 : 20)}
                      y="212"
                      textAnchor="middle"
                      dominantBaseline="hanging"
                      className="stem-tick"
                    >
                      {num(n)}
                    </text>
                    <text
                      x="310"
                      y={200 - n * (circle ? 140 : 14)}
                      textAnchor="end"
                      dominantBaseline="middle"
                      className="stem-tick"
                    >
                      {num(n)}
                    </text>
                  </g>
                ))}
                <text
                  x="310"
                  y="212"
                  textAnchor="end"
                  dominantBaseline="hanging"
                  className="stem-tick"
                >
                  {num(0)}
                </text>
              </>
            )}
            {graph && (
              <>
                <polyline
                  points={`${plot(-15, -15 * Number(value.m) + Number(value.c))} ${plot(15, 15 * Number(value.m) + Number(value.c))}`}
                  className="stem-line"
                />
                <circle cx="320" cy={200 - Number(value.c) * 14} r="9" className="stem-handle" />
                {equationBox && (
                  <g className="stem-chip">
                    <rect
                      x={equationBox.x}
                      y={equationBox.y}
                      width={equationBox.width}
                      height={equationBox.height}
                      rx="10"
                    />
                    <text
                      x={equationBox.x + 14}
                      y={equationBox.y + equationBox.height / 2}
                      dominantBaseline="central"
                    >
                      {equation}
                    </text>
                  </g>
                )}
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
                  sin θ = {num(o.sin)} · cos θ = {num(o.cos)}
                </text>
              </>
            )}
            {cart && (
              <>
                <path d="M35 290H605" className="stem-axis" />
                {cart.ticks.map((tick) => (
                  <g key={tick.metres}>
                    <path d={`M${tick.x} 290v7`} className="stem-axis" />
                    <text x={tick.x} y="319" textAnchor="middle">
                      {num(tick.metres)} m
                    </text>
                  </g>
                ))}
                <g transform={`translate(${cart.cartX},220)`}>
                  <rect x="0" y="0" width="85" height="48" rx="8" className="stem-body" />
                  <circle cx="18" cy="62" r="13" className="stem-wheel" />
                  <circle cx="68" cy="62" r="13" className="stem-wheel" />
                  <text x="42" y="29" textAnchor="middle">
                    {num(value.mass)} kg
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
                  {language === 'bn' ? 'প্রযুক্ত বল' : 'Applied force'}: {num(value.force)} N
                </text>
                <text x="310" y="195" textAnchor="end">
                  {language === 'bn' ? 'ঘর্ষণ বল' : 'Friction force'}: {num(o.friction)} N
                </text>
                <text x="40" y="345">
                  a = {num(o.a)} m/s² · v = {num(o.v)} m/s
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
                      {[0, 0.5, 1].map((fraction) => (
                        <g key={fraction}>
                          <text
                            x="34"
                            y={320 - fraction * 230}
                            textAnchor="end"
                            dominantBaseline="middle"
                            className="stem-tick"
                          >
                            {num(max * fraction)}
                          </text>
                          <text
                            x={45 + fraction * 240}
                            y="332"
                            textAnchor="middle"
                            dominantBaseline="hanging"
                            className="stem-tick"
                          >
                            {num(horizon * fraction)}
                          </text>
                        </g>
                      ))}
                      <text x="50" y="45">
                        {panel ? 'v (m/s)' : 'x (m)'}
                      </text>
                      <text x="235" y="375">
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
            {circuit && (
              <>
                {circuit.wires.map((wire, index) => (
                  <line
                    key={index}
                    x1={wire.from[0]}
                    y1={wire.from[1]}
                    x2={wire.to[0]}
                    y2={wire.to[1]}
                    className="stem-wire"
                  />
                ))}
                <path d="M85 185h30M90 215h20" className="stem-wire" />
                {circuit.resistors.map(({ x, y, index: i }) => (
                  <g key={i} transform={`translate(${x},${y})`}>
                    <rect x="-18" y="-16" width="70" height="32" rx="4" className="stem-body" />
                    <text x="15" y="7" textAnchor="middle">
                      {resistors[i]} Ω
                    </text>
                    <text
                      x={value.topology === 'parallel' ? 100 : 15}
                      y={value.topology === 'parallel' ? 25 : 65}
                      textAnchor="middle"
                    >
                      {num(o['v' + i])} V
                    </text>
                    <text
                      x={value.topology === 'parallel' ? 180 : 15}
                      y={value.topology === 'parallel' ? 25 : 95}
                      textAnchor="middle"
                    >
                      {num(o['p' + i])} W
                    </text>
                  </g>
                ))}
                <text x="65" y="255">
                  {num(value.emf)} V
                </text>
                <text x="180" y={value.topology === 'parallel' ? 365 : 270}>
                  I = {num(o.current)} A
                </text>
                <text x="610" y="365" textAnchor="end">
                  {language === 'bn' ? 'মোট রোধ' : 'Total resistance'} = {num(o.req)} Ω
                </text>
              </>
            )}
          </svg>
        )}
        {valid && circle && (
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
            {[0, 90, 180, 270, 360].map((angle) => (
              <text key={angle} x={30 + (angle / 360) * 580} y="18" textAnchor="middle">
                {angle}°
              </text>
            ))}
          </svg>
        )}
        {timed && (
          <div className="stem-run">
            <button
              disabled={!valid}
              className="stem-run-primary"
              onClick={() => {
                if (time >= horizon) setTime(0);
                setRunning(!running);
              }}
              aria-pressed={running}
            >
              <UiIcon name={running ? 'stop' : 'play'} width={20} height={20} />
              {s(running ? 'pause' : 'play')}
            </button>
            <button
              disabled={!valid || (time === 0 && !running)}
              onClick={() => {
                setRunning(false);
                setTime(0);
              }}
            >
              <UiIcon name="restart" width={20} height={20} />
              {s('reset')}
            </button>
            <input
              type="range"
              className="stem-scrub"
              aria-label={language === 'bn' ? 'সময় বেছে নাও' : 'Scrub through time'}
              min={0}
              max={horizon}
              step={horizon / 400}
              value={Math.min(time, horizon)}
              disabled={!valid}
              onChange={(e) => {
                setRunning(false);
                setTime(Number(e.target.value));
              }}
            />
            <output>
              {s('time')}: {valid ? num(time, 2) : '—'} s
              {valid && id === 'orbit' && (
                <span className="stem-run-note">
                  {' · '}
                  {language === 'bn' ? 'কক্ষপথে ' : 'in orbit '}
                  {num(
                    ((time / 12) * (2 * Math.PI * Number(value.radius) * 1e6)) /
                      (Number(solved.circularSpeed) * 1000) /
                      3600,
                    2,
                  )}{' '}
                  h
                </span>
              )}
            </output>
          </div>
        )}
      </section>
      <aside className="stem-params">
        <h2>{s('parameters')}</h2>
        {!valid && (
          <p role="alert">
            {language === 'bn'
              ? 'দেখানো সীমার মধ্যে প্রতিটি মান দিন।'
              : 'Enter every value within the shown ranges.'}
            {id === 'newton-cart' &&
              (language === 'bn'
                ? ' গতীয় ঘর্ষণ গুণাঙ্ক স্থিত ঘর্ষণ গুণাঙ্কের চেয়ে বেশি হতে পারবে না।'
                : ' Kinetic friction must not exceed static friction.')}
          </p>
        )}
        {PARAMS[id]
          .filter((p) => !p.when || p.when(value))
          .map((p) =>
            p.kind === 'choice' ? (
              <ChoiceControl
                key={p.id}
                spec={p}
                value={value[p.id]}
                language={language}
                disabled={locked.includes(p.id)}
                highlighted={highlight === p.id}
                onChange={(v) => set(p.id, v)}
              />
            ) : (
              <SliderControl
                key={p.id}
                spec={p}
                value={value[p.id]}
                language={language}
                disabled={locked.includes(p.id)}
                highlighted={highlight === p.id}
                onChange={(v) => set(p.id, v)}
              />
            ),
          )}
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
            {resistors.map((r, i) => (
              <Field key={i} label={`R${i + 1} (Ω)`}>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={r ?? ''}
                  disabled={locked.includes('resistors')}
                  onChange={(e) =>
                    set(
                      'resistors',
                      resistors.map((v, j) =>
                        i === j ? (e.target.value === '' ? undefined : Number(e.target.value)) : v,
                      ),
                    )
                  }
                />
              </Field>
            ))}
            <button
              disabled={locked.includes('resistors') || resistors.length >= 3}
              onClick={() => set('resistors', [...resistors, 10])}
            >
              {language === 'bn' ? 'রোধ যোগ করো' : 'Add resistor'}
            </button>
            <button
              disabled={locked.includes('resistors') || resistors.length <= 1}
              onClick={() => set('resistors', resistors.slice(0, -1))}
            >
              {language === 'bn' ? 'শেষ রোধ সরাও' : 'Remove last resistor'}
            </button>
          </>
        )}
      </aside>
      <section className="stem-details">
        {valid && (
          <dl className="stem-readings">
            {(READOUTS[id]
              ? READOUTS[id].map((key) => [key, key in o ? o[key] : solved[key]] as const)
              : Object.entries(o)
            )
              .filter(
                ([key, v]) =>
                  v !== undefined &&
                  readingLabel(id, key, language) &&
                  !(id === 'ohms-circuit' && v === null) &&
                  !(v === null && HIDE_WHEN_NULL.has(key)),
              )
              .map(([key, v]) => (
                <div key={key}>
                  <dt>{readingLabel(id, key, language)!.label}</dt>
                  <dd>
                    {(Renderer ? stemReadingState(id, key, v ?? null, language, value) : null) ??
                      readingState(id, key, v ?? null, language) ??
                      num(v)}
                    {typeof v === 'number' && readingLabel(id, key, language)!.unit && (
                      <>
                        {' '}
                        <span>{localUnit(readingLabel(id, key, language)!.unit, language)}</span>
                      </>
                    )}
                  </dd>
                </div>
              ))}
          </dl>
        )}
        <p className="stem-limits">{LIMITS[id][language === 'bn' ? 1 : 0]}</p>
      </section>
    </div>
  );
}

function SliderControl({
  spec: p,
  value,
  language,
  disabled,
  highlighted,
  onChange,
}: {
  spec: SliderParam;
  value: unknown;
  language: 'en' | 'bn';
  disabled: boolean;
  highlighted: boolean;
  onChange: (v: number | undefined) => void;
}) {
  const label = p.label[language === 'bn' ? 1 : 0];
  const unit = unitText(p.unit, language);
  const current = typeof value === 'number' && Number.isFinite(value) ? value : undefined;
  const log = p.scale === 'log';
  const toSlider = (v: number) => (log ? Math.log10(v) : v);
  const fromSlider = (v: number) => {
    if (!log) return v;
    const raw = 10 ** v;
    const power = 10 ** (Math.floor(Math.log10(raw)) - 1);
    return snapToStep(Math.round(raw / power) * power, p);
  };
  return (
    <Field label={`${label}${unit ? ` (${unit})` : ''}`}>
      <div
        className={[
          'stem-param',
          highlighted ? 'is-highlighted' : '',
          p.entry === 'number' ? 'is-number-only' : '',
        ].join(' ')}
      >
        {p.entry !== 'number' && (
          <input
            aria-label={label}
            type="range"
            min={toSlider(p.min)}
            max={toSlider(p.max)}
            step={log ? 0.01 : p.step}
            value={current === undefined ? toSlider(p.min) : toSlider(current)}
            disabled={disabled}
            onChange={(e) => onChange(fromSlider(Number(e.target.value)))}
          />
        )}
        <input
          aria-label={label + ' value'}
          type="number"
          min={p.min}
          max={p.max}
          step={p.step}
          value={current ?? ''}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value === '' ? undefined : Number(e.target.value))}
        />
      </div>
    </Field>
  );
}

/** Up to four short options as a segmented radio group; longer lists as a select. */
function ChoiceControl({
  spec: p,
  value,
  language,
  disabled,
  highlighted,
  onChange,
}: {
  spec: ChoiceParam;
  value: unknown;
  language: 'en' | 'bn';
  disabled: boolean;
  highlighted: boolean;
  onChange: (v: string | boolean) => void;
}) {
  const group = useId();
  const i = language === 'bn' ? 1 : 0;
  const label = p.label[i];
  const segmented =
    p.options.length <= 7 &&
    p.options.every((o) => o.label[i].length <= (p.options.length > 4 ? 5 : 14));
  if (!segmented)
    return (
      <Field label={label}>
        <select
          className={highlighted ? 'is-highlighted' : ''}
          value={String(value)}
          disabled={disabled}
          onChange={(e) =>
            onChange(
              p.options.find((o) => String(o.value) === e.target.value)?.value ?? e.target.value,
            )
          }
        >
          {p.options.map((o) => (
            <option key={String(o.value)} value={String(o.value)}>
              {o.label[i]}
            </option>
          ))}
        </select>
      </Field>
    );
  return (
    <fieldset
      className={'stem-choice' + (highlighted ? ' is-highlighted' : '')}
      disabled={disabled}
    >
      <legend>{label}</legend>
      <div className="stem-segments">
        {p.options.map((o) => (
          <label key={String(o.value)} className={o.value === value ? 'is-selected' : ''}>
            <input
              type="radio"
              name={group}
              value={String(o.value)}
              checked={o.value === value}
              onChange={() => onChange(o.value)}
            />
            <span>{o.label[i]}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
