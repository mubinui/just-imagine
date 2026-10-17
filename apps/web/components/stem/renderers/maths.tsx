'use client';
import { useId, useMemo, type PointerEvent, type ReactNode } from 'react';
import {
  VIEW,
  evaluate,
  riemannArea,
  slope,
  outcomeCount,
  theoretical,
  type CurveParams,
  type ProbabilityParams,
  type RiemannParams,
} from '@just-imagine/stem-sims';
import { simulationPoint } from '../../../lib/school/simulation-geometry';
import { outcomeName } from '../../../lib/stem/readings';
import { curveEquation, linearEquation } from '../sim-format';
import {
  Axes,
  Chip,
  H,
  Label,
  W,
  clamp,
  niceCeil,
  niceTicks,
  scale,
  textWidth,
  tr,
  type RendererProps,
} from './kit';

const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

const BOX: [number, number, number, number] = [44, 14, 626, 386];
const SX = scale(VIEW.min, VIEW.max, BOX[0], BOX[2]);
const SY = scale(VIEW.min, VIEW.max, BOX[3], BOX[1]);
const TICKS = [-10, -8, -6, -4, -2, 2, 4, 6, 8, 10];

/** Polylines of f over the window, broken where f is undefined. */
function curvePaths(f: (x: number) => number | null, samples = 800): string[] {
  const out: string[] = [];
  let run: string[] = [];
  for (let i = 0; i <= samples; i++) {
    const x = VIEW.min + ((VIEW.max - VIEW.min) * i) / samples;
    const y = f(x);
    if (y === null || !Number.isFinite(y) || Math.abs(y) > 200) {
      if (run.length > 1) out.push(run.join(' '));
      run = [];
      continue;
    }
    run.push(`${SX(x).toFixed(2)},${SY(y).toFixed(2)}`);
  }
  if (run.length > 1) out.push(run.join(' '));
  return out;
}

/** The corner of the plot the curve crosses least, for a readout card. */
function quietCorner(f: (x: number) => number | null, width: number, height: number) {
  const corners = [
    { x: BOX[0] + 8, y: BOX[1] + 4, align: 'left' as const },
    { x: BOX[2] - 8, y: BOX[1] + 4, align: 'right' as const },
    { x: BOX[0] + 8, y: BOX[3] - height - 4, align: 'left' as const },
    { x: BOX[2] - 8, y: BOX[3] - height - 4, align: 'right' as const },
  ];
  const score = (c: (typeof corners)[number]) => {
    const left = c.align === 'left' ? c.x : c.x - width;
    let hits = 0;
    for (let i = 0; i <= 200; i++) {
      const x = VIEW.min + ((VIEW.max - VIEW.min) * i) / 200;
      const y = f(x);
      if (y === null) continue;
      const px = SX(x),
        py = SY(y);
      if (px >= left - 6 && px <= left + width + 6 && py >= c.y - 6 && py <= c.y + height + 6)
        hits++;
    }
    return hits;
  };
  return corners.reduce((best, c) => (score(c) < score(best) ? c : best));
}

function Plot({
  name,
  num,
  children,
  onDrag,
}: {
  name: string;
  num: (v: unknown) => string;
  children: ReactNode;
  onDrag?: (x: number) => void;
}) {
  const clip = useId().replaceAll(':', '');
  function drag(e: PointerEvent<SVGSVGElement>) {
    if (!onDrag || !e.buttons) return;
    const point = simulationPoint([e.clientX, e.clientY], e.currentTarget.getScreenCTM());
    if (!point) return;
    const x = VIEW.min + ((point[0] - BOX[0]) / (BOX[2] - BOX[0])) * (VIEW.max - VIEW.min);
    onDrag(Math.round(clamp(x, VIEW.min, VIEW.max) * 10) / 10);
  }
  return (
    <svg
      className="stem-canvas"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={name}
      onPointerDown={(e) => {
        if (!onDrag) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        drag(e);
      }}
      onPointerMove={drag}
    >
      <defs>
        <clipPath id={clip}>
          <rect x={BOX[0]} y={BOX[1]} width={BOX[2] - BOX[0]} height={BOX[3] - BOX[1]} />
        </clipPath>
      </defs>
      <Axes
        box={BOX}
        x={SX}
        y={SY}
        xTicks={TICKS}
        yTicks={TICKS}
        xLabel="x"
        yLabel="y"
        num={num}
        xAt={0}
        yAt={0}
      />
      <g clipPath={`url(#${clip})`}>{children}</g>
    </svg>
  );
}

function point(x: number, y: number, num: (v: unknown, d?: number) => string) {
  return `(${num(x, 2)}, ${num(y, 2)})`;
}

/* ---------------------------------------------------------------- Function grapher */
export function GrapherView({
  params,
  solved,
  language,
  num,
  font,
  name,
  set,
  locked,
}: RendererProps) {
  const p = params as CurveParams & { x: number };
  const f = (x: number) => evaluate(p, x);
  const paths = useMemo(() => curvePaths(f), [p.family, p.a, p.b, p.c, p.d]); // eslint-disable-line react-hooks/exhaustive-deps
  const roots = [solved.root1, solved.root2, solved.root3].filter(isNum);
  const value = solved.value;
  const lines = [
    curveEquation(p, language),
    ...(isNum(solved.vertexX) && isNum(solved.vertexY)
      ? [`${tr(language, 'Vertex', 'শীর্ষবিন্দু')} ${point(solved.vertexX, solved.vertexY, num)}`]
      : []),
    roots.length
      ? `${tr(language, roots.length > 1 ? 'Roots' : 'Root', 'মূল')}: ${roots.map((r) => num(r, 2)).join(', ')}${n(solved.rootCount) > 3 ? ' …' : ''}`
      : tr(language, 'No root in view', 'দেখানো অংশে মূল নেই'),
    isNum(solved.yIntercept)
      ? `${tr(language, 'y-intercept', 'y-অক্ষছেদ')}: ${num(solved.yIntercept, 2)}`
      : tr(language, 'No y-intercept', 'y-অক্ষছেদ নেই'),
    isNum(value)
      ? `f(${num(p.x, 2)}) = ${num(value, 2)}`
      : `f(${num(p.x, 2)}) ${tr(language, 'is undefined', 'অসংজ্ঞায়িত')}`,
  ];
  const chipW = Math.max(...lines.map((l) => textWidth(l, font))) + font * 1.2;
  const corner = quietCorner(f, chipW, lines.length * font * 1.3 + font * 0.7);
  return (
    <Plot name={name} num={num} onDrag={locked.includes('x') ? undefined : (x) => set('x', x)}>
      {paths.map((d, i) => (
        <polyline key={i} points={d} className="stem-line" />
      ))}
      {isNum(value) && (
        <>
          <path d={`M${SX(p.x)} ${SY(0)}V${SY(value)}H${SX(0)}`} className="sim-guide" />
          <circle cx={SX(p.x)} cy={SY(value)} r="9" className="stem-handle" />
        </>
      )}
      {roots.map((r, i) => (
        <g key={'r' + i}>
          <circle cx={SX(r)} cy={SY(0)} r="6" className="sim-marker sim-tone-tangent" />
          <Label x={SX(r)} y={SY(0) + (i % 2 ? -18 : 20)} anchor="middle" small tone="tangent">
            {num(r, 2)}
          </Label>
        </g>
      ))}
      {isNum(solved.yIntercept) && (
        <circle cx={SX(0)} cy={SY(solved.yIntercept)} r="6" className="sim-marker" />
      )}
      {isNum(solved.vertexX) && isNum(solved.vertexY) && (
        <circle
          cx={SX(solved.vertexX)}
          cy={SY(solved.vertexY)}
          r="7"
          className="sim-marker sim-tone-net"
        />
      )}
      <Chip x={corner.x} y={corner.y} align={corner.align} font={font} lines={lines} />
    </Plot>
  );
}

/* ---------------------------------------------------------------- Derivative */
export function DerivativeView({
  params,
  solved,
  language,
  num,
  font,
  name,
  set,
  locked,
}: RendererProps) {
  const p = params as CurveParams & { x: number };
  const f = (x: number) => evaluate(p, x);
  const paths = useMemo(() => curvePaths(f), [p.family, p.a, p.b, p.c, p.d]); // eslint-disable-line react-hooks/exhaustive-deps
  const dPaths = useMemo(() => curvePaths((x) => slope(p, x)), [p.family, p.a, p.b, p.c, p.d]); // eslint-disable-line react-hooks/exhaustive-deps
  const y = solved.y,
    m = solved.slope,
    c = solved.tangentIntercept;
  const defined = isNum(y) && isNum(m) && isNum(c);
  const lines = [
    curveEquation(p, language),
    defined
      ? `${tr(language, 'Tangent', 'স্পর্শক')}: ${linearEquation(m, c, language)}`
      : tr(language, 'No tangent here', 'এখানে স্পর্শক নেই'),
    defined
      ? `${tr(language, 'Slope', 'ঢাল')} f′(${num(p.x, 2)}) = ${num(m, 2)}`
      : `f′(${num(p.x, 2)}) ${tr(language, 'is undefined', 'অসংজ্ঞায়িত')}`,
  ];
  const chipW = Math.max(...lines.map((l) => textWidth(l, font))) + font * 1.2;
  const corner = quietCorner(f, chipW, lines.length * font * 1.3 + font * 0.7);
  // Label the derivative curve where it is inside the window, near the right.
  let labelAt: [number, number] | null = null;
  for (let x = 9.5; x > -9.5; x -= 0.5) {
    const d = slope(p, x);
    if (d !== null && Math.abs(d) < 9) {
      labelAt = [SX(x), SY(d)];
      break;
    }
  }
  return (
    <Plot name={name} num={num} onDrag={locked.includes('x') ? undefined : (x) => set('x', x)}>
      {dPaths.map((d, i) => (
        <polyline key={'d' + i} points={d} className="sim-derivative" />
      ))}
      {labelAt && (
        <Label x={labelAt[0]} y={labelAt[1] - 16} anchor="end" small tone="soft">
          f′(x)
        </Label>
      )}
      {paths.map((d, i) => (
        <polyline key={i} points={d} className="stem-line" />
      ))}
      {defined && (
        <>
          <line
            x1={SX(p.x - 4)}
            y1={SY(y + m * -4)}
            x2={SX(p.x + 4)}
            y2={SY(y + m * 4)}
            className="sim-tangent"
          />
          <path d={`M${SX(p.x)} ${SY(y)}H${SX(p.x + 1)}V${SY(y + m)}`} className="sim-rise-run" />
          <Label
            x={SX(p.x + 0.5)}
            y={SY(y) + (m >= 0 ? 14 : -14)}
            anchor="middle"
            small
            tone="tangent"
          >
            {num(1)}
          </Label>
          <Label x={SX(p.x + 1) + 8} y={SY(y + m / 2)} small tone="tangent">
            {num(m, 2)}
          </Label>
          <circle cx={SX(p.x)} cy={SY(y)} r="9" className="stem-handle" />
        </>
      )}
      <Chip x={corner.x} y={corner.y} align={corner.align} font={font} lines={lines} />
    </Plot>
  );
}

/* ---------------------------------------------------------------- Riemann sums */
const RULE: Record<string, [string, string]> = {
  left: ['Left', 'বাম প্রান্ত'],
  right: ['Right', 'ডান প্রান্ত'],
  midpoint: ['Midpoint', 'মধ্যবিন্দু'],
  trapezoid: ['Trapezoid', 'ট্রাপিজিয়াম'],
};
const STRIP_COUNTS = [
  1, 2, 3, 4, 5, 6, 8, 10, 12, 15, 20, 25, 30, 40, 50, 60, 80, 100, 120, 150, 200,
];
export function RiemannView({ params, solved, language, num, font, name }: RendererProps) {
  const p = params as RiemannParams;
  const f = (x: number) => evaluate(p, x);
  const paths = useMemo(() => curvePaths(f), [p.family, p.a, p.b, p.c, p.d]); // eslint-disable-line react-hooks/exhaustive-deps
  const h = (p.to - p.from) / p.n;
  const strips = Array.from({ length: p.n }, (_, i) => {
    const x0 = p.from + i * h,
      x1 = x0 + h;
    if (p.rule === 'trapezoid') {
      const a = f(x0),
        b = f(x1);
      if (a === null || b === null) return null;
      return {
        key: i,
        negative: a + b < 0,
        points: `${SX(x0)},${SY(0)} ${SX(x0)},${SY(clamp(a, -50, 50))} ${SX(x1)},${SY(clamp(b, -50, 50))} ${SX(x1)},${SY(0)}`,
      };
    }
    const at = p.rule === 'left' ? x0 : p.rule === 'right' ? x1 : x0 + h / 2;
    const y = f(at);
    if (y === null) return null;
    const yy = clamp(y, -50, 50);
    return {
      key: i,
      negative: y < 0,
      points: `${SX(x0)},${SY(0)} ${SX(x0)},${SY(yy)} ${SX(x1)},${SY(yy)} ${SX(x1)},${SY(0)}`,
    };
  });
  const sq = tr(language, 'sq. units', 'বর্গ একক');
  const lines = [
    curveEquation(p, language),
    `${RULE[p.rule]![language === 'bn' ? 1 : 0]} · n = ${num(p.n)}`,
  ];
  const chipW = Math.max(...lines.map((l) => textWidth(l, font))) + font * 1.2;
  const corner = quietCorner(f, chipW, lines.length * font * 1.3 + font * 0.7);
  const series = useMemo(
    () =>
      STRIP_COUNTS.map(
        (count) => [count, riemannArea.solve({ ...p, n: count })['estimate']] as const,
      ).filter((e): e is readonly [number, number] => isNum(e[1])),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- every parameter but n
    [p.family, p.a, p.b, p.c, p.d, p.from, p.to, p.rule],
  );
  const exact = solved.exact;
  const values = [...series.map((s) => s[1]), ...(isNum(exact) ? [exact] : [])];
  const lo = Math.min(...values),
    hi = Math.max(...values);
  const pad = Math.max((hi - lo) * 0.12, 0.05 * Math.max(Math.abs(hi), 1));
  const panelH = 220;
  const pbox: [number, number, number, number] = [340, 22, 626, panelH - 66];
  const px = scale(0, Math.log10(200), pbox[0], pbox[2]);
  const py = scale(lo - pad, hi + pad, pbox[3], pbox[1]);
  const rows: [string, unknown, string][] = [
    [tr(language, 'Estimate', 'আনুমানিক'), solved.estimate, 'net'],
    [tr(language, 'Exact', 'প্রকৃত'), exact, 'ink'],
    [tr(language, 'Error', 'ত্রুটি'), solved.error, 'force'],
  ];
  const sp = Math.max(40, font * 2.6);
  return (
    <>
      <Plot name={name} num={num}>
        {strips.map(
          (s) =>
            s && (
              <polygon
                key={s.key}
                points={s.points}
                className={s.negative ? 'sim-strip is-negative' : 'sim-strip'}
              />
            ),
        )}
        {paths.map((d, i) => (
          <polyline key={i} points={d} className="stem-line" />
        ))}
        <path
          d={`M${SX(p.from)} ${BOX[1]}V${BOX[3]}M${SX(p.to)} ${BOX[1]}V${BOX[3]}`}
          className="sim-guide"
        />
        <Label
          x={SX(p.from)}
          y={BOX[3] - 14}
          anchor="middle"
          small
        >{`a = ${num(p.from, 2)}`}</Label>
        <Label x={SX(p.to)} y={BOX[3] - 14} anchor="middle" small>{`b = ${num(p.to, 2)}`}</Label>
        <Chip x={corner.x} y={corner.y} align={corner.align} font={font} lines={lines} />
      </Plot>
      <svg
        className="stem-traces sim-panel"
        viewBox={`0 0 ${W} ${panelH}`}
        role="img"
        aria-label={tr(
          language,
          'Estimate as the number of strips grows',
          'ফালির সংখ্যা বাড়ার সঙ্গে আনুমানিক মান',
        )}
      >
        {rows.map(([label, value, tone], i) => (
          <g key={label} className={`sim-tone-${tone}`}>
            <text x="16" y={26 + i * sp} dominantBaseline="central" className="sim-small">
              {label}
            </text>
            <text
              x="16"
              y={26 + i * sp + font * 1.1}
              dominantBaseline="central"
              className="sim-bold"
            >
              {isNum(value) ? `${num(value, 3)} ${sq}` : tr(language, 'undefined', 'অসংজ্ঞায়িত')}
            </text>
          </g>
        ))}
        <Axes
          box={pbox}
          x={px}
          y={py}
          xTicks={[]}
          yTicks={niceTicks(lo - pad, hi + pad, 3)}
          xLabel=""
          yLabel=""
          num={(v) => num(v, 2)}
          grid={false}
        />
        {[1, 10, 100].map((c) => (
          <text
            key={c}
            x={px(Math.log10(c))}
            y={pbox[3] + 10}
            textAnchor="middle"
            className="stem-tick sim-small"
            dominantBaseline="hanging"
          >
            {num(c)}
          </text>
        ))}
        <text x={pbox[2]} y={panelH - 6} textAnchor="end" className="sim-axis-label sim-small">
          {tr(language, 'Number of strips n', 'ফালির সংখ্যা n')}
        </text>
        {isNum(exact) && <path d={`M${pbox[0]} ${py(exact)}H${pbox[2]}`} className="sim-guide" />}
        <polyline
          points={series.map(([c, v]) => `${px(Math.log10(c))},${py(v)}`).join(' ')}
          className="sim-path is-solid"
        />
        {isNum(solved.estimate) && (
          <circle cx={px(Math.log10(p.n))} cy={py(solved.estimate)} r="7" className="stem-handle" />
        )}
      </svg>
    </>
  );
}

/* ---------------------------------------------------------------- Probability */
function Pips({ value, x, y, size }: { value: number; x: number; y: number; size: number }) {
  const s = size / 4;
  const layout: Record<number, [number, number][]> = {
    1: [[0, 0]],
    2: [
      [-1, -1],
      [1, 1],
    ],
    3: [
      [-1, -1],
      [0, 0],
      [1, 1],
    ],
    4: [
      [-1, -1],
      [1, -1],
      [-1, 1],
      [1, 1],
    ],
    5: [
      [-1, -1],
      [1, -1],
      [0, 0],
      [-1, 1],
      [1, 1],
    ],
    6: [
      [-1, -1],
      [1, -1],
      [-1, 0],
      [1, 0],
      [-1, 1],
      [1, 1],
    ],
  };
  return (
    <>
      {(layout[value] ?? []).map(([dx, dy], i) => (
        <circle key={i} cx={x + dx * s} cy={y + dy * s} r={size / 11} className="sim-pip" />
      ))}
    </>
  );
}
const SECTOR_TONES = ['sim-sector-a', 'sim-sector-b', 'sim-sector-c', 'sim-sector-d'];
export function ProbabilityView({
  params,
  o,
  time,
  running,
  language,
  num,
  font,
  name,
  set,
  locked,
  reducedMotion,
}: RendererProps) {
  const p = params as ProbabilityParams;
  const k = outcomeCount(p);
  const odds = theoretical(p);
  const done = n(o.done);
  const last = isNum(o.last) ? o.last : null;
  const rel = Array.from({ length: k }, (_, i) => n(o['relative' + i]));
  const yMax = Math.min(1, niceCeil(Math.max(...odds, ...rel) * 1.15));
  const box: [number, number, number, number] = [338, 46, 624, 318];
  const sy = scale(0, yMax, box[3], box[1]);
  const slot = (box[2] - box[0]) / k;
  const cx = 150,
    cy = 150;
  const flip = running && !reducedMotion ? Math.abs(Math.cos(time * 14)) : 1;
  const spin = running && !reducedMotion ? time * 900 : 0;
  const pointer = last === null ? -90 + spin : (360 / k) * (last + 0.5) - 90 + spin;
  return (
    <>
      <svg className="stem-canvas" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={name}>
        {p.experiment === 'coin' && (
          <g transform={`translate(${cx},${cy}) scale(${Math.max(flip, 0.06)},1)`}>
            <circle r="78" className="sim-coin" />
            <circle r="64" className="sim-coin-rim" />
            <text textAnchor="middle" dominantBaseline="central" className="sim-coin-face">
              {last === null ? '?' : last === 0 ? tr(language, 'H', 'হে') : tr(language, 'T', 'টে')}
            </text>
          </g>
        )}
        {p.experiment === 'die' && (
          <g>
            <rect x={cx - 70} y={cy - 70} width="140" height="140" rx="26" className="sim-die" />
            {last === null ? (
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                className="sim-coin-face"
              >
                ?
              </text>
            ) : (
              <Pips value={last + 1} x={cx} y={cy} size={140} />
            )}
          </g>
        )}
        {p.experiment === 'spinner' && (
          <g>
            {Array.from({ length: k }, (_, i) => {
              const a0 = ((360 / k) * i - 90) * (Math.PI / 180),
                a1 = ((360 / k) * (i + 1) - 90) * (Math.PI / 180);
              const am = (a0 + a1) / 2;
              return (
                <g key={i}>
                  <path
                    d={`M${cx} ${cy}L${cx + 82 * Math.cos(a0)} ${cy + 82 * Math.sin(a0)}A82 82 0 0 1 ${cx + 82 * Math.cos(a1)} ${cy + 82 * Math.sin(a1)}Z`}
                    className={`sim-sector ${SECTOR_TONES[i % 4]} ${last === i && !running ? 'is-hit' : ''}`}
                  />
                  <text
                    x={cx + 58 * Math.cos(am)}
                    y={cy + 58 * Math.sin(am)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="sim-small sim-bold"
                  >
                    {num(i + 1)}
                  </text>
                </g>
              );
            })}
            <g transform={`translate(${cx},${cy}) rotate(${pointer})`}>
              <path d="M0 -6L70 0L0 6Z" className="sim-spinner-arrow" />
            </g>
            <circle cx={cx} cy={cy} r="8" className="sim-pivot" />
          </g>
        )}
        <text x={cx} y="268" textAnchor="middle" dominantBaseline="central" className="sim-bold">
          {`${tr(language, 'Trials', 'পরীক্ষা')}: ${num(done)} / ${num(p.trials)}`}
        </text>
        <text
          x={cx}
          y={268 + font * 1.5}
          textAnchor="middle"
          dominantBaseline="central"
          className="sim-small"
        >
          {last === null
            ? tr(language, 'Press Run to start', 'শুরু করতে চালাও চাপো')
            : `${tr(language, 'Last', 'শেষ ফল')}: ${outcomeName(p, last, language)}`}
        </text>
        <Axes
          box={box}
          x={(v) => v}
          y={sy}
          xTicks={[]}
          yTicks={niceTicks(0, yMax, 4)}
          xLabel=""
          yLabel={tr(language, 'Relative frequency', 'আপেক্ষিক গণসংখ্যা')}
          num={(v) => num(v, 2)}
          font={font}
        />
        {Array.from({ length: k }, (_, i) => {
          const x0 = box[0] + slot * i + slot * 0.16,
            w = slot * 0.68;
          return (
            <g key={i}>
              <rect
                x={x0}
                y={sy(rel[i]!)}
                width={w}
                height={box[3] - sy(rel[i]!)}
                rx="3"
                className="sim-bar-exp"
              />
              <path d={`M${x0 - 3} ${sy(odds[i]!)}h${w + 6}`} className="sim-theory" />
              <text
                x={x0 + w / 2}
                y={box[3] + 10}
                textAnchor="middle"
                dominantBaseline="hanging"
                className="stem-tick sim-small"
              >
                {k <= 2 ? outcomeName(p, i, language) : num(i + 1)}
              </text>
            </g>
          );
        })}
        <g>
          <rect x={box[0]} y={H - 40} width="16" height="16" rx="3" className="sim-bar-exp" />
          <text x={box[0] + 24} y={H - 32} dominantBaseline="central" className="sim-small">
            {tr(language, 'Experimental', 'পরীক্ষালব্ধ')}
          </text>
          <path d={`M${box[0] + 150} ${H - 32}h22`} className="sim-theory" />
          <text x={box[0] + 180} y={H - 32} dominantBaseline="central" className="sim-small">
            {tr(language, 'Theoretical', 'তাত্ত্বিক')}
          </text>
        </g>
      </svg>
      <div className="sim-actions">
        <button
          type="button"
          disabled={locked.includes('seed')}
          onClick={() => set('seed', Math.floor(Math.random() * 2 ** 31))}
        >
          {tr(language, 'New random run', 'নতুন দৈব রান')}
        </button>
      </div>
    </>
  );
}

/* ---------------------------------------------------------------- Trigonometric waves */
export function WavesView({ params, o, language, num, font, name }: RendererProps) {
  const p = params as {
    wave: 'sine' | 'cosine';
    amplitude: number;
    frequency: number;
    phaseDeg: number;
  };
  const unit = 30;
  const cx = 128,
    cy = 200;
  const r = p.amplitude * unit;
  const sx = scale(0, 720, 280, 624);
  const sy = (v: number) => cy - v * unit;
  const fn = p.wave === 'sine' ? Math.sin : Math.cos;
  const wave = (deg: number) =>
    p.amplitude * fn(((p.frequency * deg + p.phaseDeg) * Math.PI) / 180);
  const full = Array.from({ length: 361 }, (_, i) => `${sx(i * 2)},${sy(wave(i * 2))}`).join(' ');
  const theta = n(o.angleDeg);
  const traced = Array.from({ length: 181 }, (_, i) => {
    const d = (theta * i) / 180;
    return `${sx(d)},${sy(wave(d))}`;
  }).join(' ');
  const alpha = ((p.frequency * theta + p.phaseDeg) * Math.PI) / 180;
  const pt = [cx + r * Math.cos(alpha), cy - r * Math.sin(alpha)] as const;
  const value = n(o.value);
  const period = n(o.periodDeg);
  const inner = [
    p.frequency === 1 ? 'θ' : `${num(p.frequency, 2)}θ`,
    p.phaseDeg === 0 ? '' : ` ${p.phaseDeg < 0 ? '−' : '+'} ${num(Math.abs(p.phaseDeg))}°`,
  ].join('');
  const equation = `y = ${p.amplitude === 1 ? '' : num(p.amplitude, 2) + ' '}${p.wave === 'sine' ? 'sin' : 'cos'}(${inner})`;
  const yTicks = [-5, -4, -3, -2, -1, 1, 2, 3, 4, 5];
  const periodEnd = Math.min(720, period);
  return (
    <svg className="stem-canvas" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={name}>
      {yTicks.map((t) => (
        <line key={t} x1={sx(0)} x2={sx(720)} y1={sy(t)} y2={sy(t)} className="sim-grid" />
      ))}
      <path
        d={`M${sx(0)} ${cy}H${sx(720)}M${sx(0)} ${sy(5.4)}V${sy(-5.4)}`}
        className="stem-axis"
      />
      {[90, 180, 270, 360, 450, 540, 630, 720].map((d) => (
        <g key={d}>
          <path d={`M${sx(d)} ${cy}v6`} className="stem-axis" />
          {d % 180 === 0 && (
            <text
              x={sx(d)}
              y={cy + 10}
              textAnchor="middle"
              dominantBaseline="hanging"
              className="stem-tick sim-small sim-halo"
            >
              {`${num(d)}°`}
            </text>
          )}
        </g>
      ))}
      {[-4, -2, 2, 4].map((t) => (
        <text
          key={t}
          x={sx(0) - 8}
          y={sy(t)}
          textAnchor="end"
          dominantBaseline="middle"
          className="stem-tick sim-small"
        >
          {num(t)}
        </text>
      ))}
      <Label x={sx(720)} y={cy - 16} anchor="end" small>
        θ (°)
      </Label>
      <Label x={sx(0) + 8} y={sy(5.2)} small>
        y
      </Label>
      <circle cx={cx} cy={cy} r={Math.max(r, 2)} className="stem-circle" />
      <path
        d={`M${cx - 5.2 * unit + 30} ${cy}H${cx + 5.2 * unit - 30}M${cx} ${sy(4.6)}V${sy(-4.6)}`}
        className="sim-grid"
      />
      <line x1={cx} y1={cy} x2={pt[0]} y2={pt[1]} className="stem-line" />
      {p.wave === 'sine' ? (
        <path d={`M${pt[0]} ${pt[1]}V${cy}`} className="sim-component" />
      ) : (
        <>
          <path d={`M${cx} ${cy}H${pt[0]}`} className="sim-component" />
          <path
            d={`M${pt[0]} ${cy}A${Math.abs(pt[0] - cx)} ${Math.abs(pt[0] - cx)} 0 0 ${pt[0] >= cx ? 0 : 1} ${cx} ${sy(value)}`}
            className="sim-guide"
          />
        </>
      )}
      <path
        d={`M${p.wave === 'sine' ? pt[0] : cx} ${sy(value)}H${sx(theta)}`}
        className="sim-guide"
      />
      <polyline points={full} className="sim-path" />
      <polyline points={traced} className="stem-line" />
      <circle cx={pt[0]} cy={pt[1]} r="8" className="stem-handle" />
      <circle cx={sx(theta)} cy={sy(value)} r="8" className="stem-handle" />
      <path
        d={`M${sx(0)} ${sy(-p.amplitude) + 2}V${sy(p.amplitude) - 2}`}
        className="sim-bracket sim-tone-net"
      />
      <path d={`M${sx(0)} ${H - 40}H${sx(periodEnd)}`} className="sim-bracket sim-tone-tangent" />
      <Label x={(sx(0) + sx(periodEnd)) / 2} y={H - 22} anchor="middle" small tone="tangent">
        {`${tr(language, 'Period', 'পর্যায়')} = ${num(period, 1)}°`}
      </Label>
      <Chip
        x={W - 10}
        y={10}
        align="right"
        font={font}
        lines={[
          equation,
          `${tr(language, 'Amplitude', 'বিস্তার')} A = ${num(p.amplitude, 2)}`,
          `θ = ${num(theta, 0)}° · y = ${num(value, 2)}`,
        ]}
      />
      <Label x={cx} y={H - 22} anchor="middle" small>
        {`bθ + φ = ${num((((p.frequency * theta + p.phaseDeg) % 360) + 360) % 360, 0)}°`}
      </Label>
    </svg>
  );
}
