'use client';
import { useEffect, useState, useSyncExternalStore, type ReactNode } from 'react';
import type { Observable } from '@just-imagine/stem-sims';
import type { SimLanguage } from '../sim-format';

/** What every library renderer receives from SimView. */
export interface RendererProps {
  /** Parsed, valid params. */
  params: Record<string, unknown>;
  /** The model's at(params, time). */
  o: Observable;
  /** The model's solve(params). */
  solved: Observable;
  /** Model seconds since the run started. */
  time: number;
  horizon: number;
  running: boolean;
  language: SimLanguage;
  /** Readout formatting in the page language (Bangla digits in Bangla). */
  num: (value: unknown, digits?: number) => string;
  /** SVG font size in viewBox units, already scaled for narrow screens. */
  font: number;
  /** The sim's accessible name. */
  name: string;
  /** Change one parameter (ignored when the key is locked). */
  set: (key: string, value: unknown) => void;
  /** Change several parameters at once; locked keys are dropped. */
  update: (changes: Record<string, unknown>) => void;
  locked: readonly string[];
  reducedMotion: boolean;
}

export const W = 640;
export const H = 400;
export const tr = (language: SimLanguage, en: string, bn: string) => (language === 'bn' ? bn : en);

/** Approximate rendered width of SVG text, for placing chips and avoiding the edges. */
export function textWidth(text: string, font: number): number {
  let width = 0;
  for (const ch of text) width += /[ঀ-৿]/u.test(ch) ? 0.62 : /[ .,:·]/.test(ch) ? 0.3 : 0.56;
  return width * font;
}

export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** 1, 2 or 5 times a power of ten: tick steps a reader can count in. */
export function niceStep(span: number, count = 5): number {
  const raw = Math.max(span, 1e-9) / count;
  const power = 10 ** Math.floor(Math.log10(raw));
  const unit = raw / power;
  return (unit < 1.5 ? 1 : unit < 3.5 ? 2 : unit < 7.5 ? 5 : 10) * power;
}
export function niceTicks(min: number, max: number, count = 5): number[] {
  const step = niceStep(max - min, count);
  const out: number[] = [];
  for (let v = Math.ceil(min / step - 1e-9) * step; v <= max + step * 1e-6; v += step)
    out.push(Math.abs(v) < step * 1e-9 ? 0 : Number(v.toPrecision(12)));
  return out;
}
/** The smallest nice number at or above value. */
export function niceCeil(value: number): number {
  if (value <= 0) return 1;
  const power = 10 ** Math.floor(Math.log10(value));
  for (const m of [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10])
    if (m * power >= value - 1e-12) return m * power;
  return 10 * power;
}

export type Tone =
  | 'velocity'
  | 'force'
  | 'net'
  | 'momentum'
  | 'kinetic'
  | 'potential'
  | 'thermal'
  | 'vector-a'
  | 'vector-b'
  | 'ink'
  | 'soft'
  | 'curve'
  | 'tangent';

/** A vector arrow with a drawn head; colour comes from its tone, so meaning stays consistent. */
export function Arrow({
  x1,
  y1,
  x2,
  y2,
  tone,
  width = 4,
  head = 13,
  dashed = false,
}: {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  tone: Tone;
  width?: number;
  head?: number;
  dashed?: boolean;
}) {
  const dx = x2 - x1,
    dy = y2 - y1,
    length = Math.hypot(dx, dy);
  if (!Number.isFinite(length) || length < 1) return null;
  const ux = dx / length,
    uy = dy / length;
  const h = Math.min(head, length * 0.6);
  const bx = x2 - ux * h,
    by = y2 - uy * h;
  const wing = h * 0.5;
  return (
    <g className={`sim-arrow sim-tone-${tone}`}>
      <line
        x1={x1}
        y1={y1}
        x2={bx}
        y2={by}
        strokeWidth={width}
        strokeDasharray={dashed ? '7 6' : undefined}
      />
      <polygon
        points={`${x2},${y2} ${bx - uy * wing},${by + ux * wing} ${bx + uy * wing},${by - ux * wing}`}
      />
    </g>
  );
}

/** Text with a surface-coloured halo so it stays readable over lines and fills. */
export function Label({
  x,
  y,
  children,
  tone,
  anchor = 'start',
  baseline = 'middle',
  small = false,
  bold = false,
}: {
  x: number;
  y: number;
  children: ReactNode;
  tone?: Tone;
  anchor?: 'start' | 'middle' | 'end';
  baseline?: 'middle' | 'hanging' | 'auto' | 'central';
  small?: boolean;
  bold?: boolean;
}) {
  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      dominantBaseline={baseline}
      className={[
        'sim-halo',
        tone ? `sim-tone-${tone}` : '',
        small ? 'sim-small' : '',
        bold ? 'sim-bold' : '',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      {children}
    </text>
  );
}

/** A rounded readout card drawn inside the SVG; lines are stacked and sized from the font. */
export function Chip({
  x,
  y,
  lines,
  font,
  align = 'left',
  tone,
}: {
  x: number;
  y: number;
  lines: string[];
  font: number;
  /** Which edge x refers to. */
  align?: 'left' | 'right' | 'center';
  tone?: Tone;
}) {
  const pad = font * 0.6,
    lineHeight = font * 1.3;
  const width = Math.max(...lines.map((l) => textWidth(l, font))) + pad * 2;
  const height = lines.length * lineHeight + pad * 1.1;
  const left = align === 'left' ? x : align === 'right' ? x - width : x - width / 2;
  const cx = clamp(left, 4, W - width - 4);
  return (
    <g className={`stem-chip ${tone ? `sim-tone-${tone}` : ''}`}>
      <rect x={cx} y={y} width={width} height={height} rx="10" />
      {lines.map((line, i) => (
        <text
          key={i}
          x={cx + pad}
          y={y + pad * 0.55 + lineHeight * (i + 0.5)}
          dominantBaseline="central"
        >
          {line}
        </text>
      ))}
    </g>
  );
}

/** A linear map from data to the SVG box. */
export function scale(d0: number, d1: number, p0: number, p1: number) {
  const k = (p1 - p0) / (d1 - d0 || 1);
  return (v: number) => p0 + (v - d0) * k;
}

/** Axes with ticks and labelled units, inside the box [left, top, right, bottom]. */
export function Axes({
  box,
  x,
  y,
  xTicks,
  yTicks,
  xLabel,
  yLabel,
  num,
  xAt,
  yAt,
  grid = true,
  font = 16,
}: {
  box: [number, number, number, number];
  x: (v: number) => number;
  y: (v: number) => number;
  xTicks: number[];
  yTicks: number[];
  xLabel: string;
  yLabel: string;
  num: (v: unknown) => string;
  /** Where the horizontal axis sits, in data units (defaults to the bottom edge). */
  xAt?: number;
  yAt?: number;
  grid?: boolean;
  /** SVG font size, for placing the axis titles clear of the tick labels. */
  font?: number;
}) {
  const [left, top, right, bottom] = box;
  const axisY = xAt === undefined ? bottom : clamp(y(xAt), top, bottom);
  const axisX = yAt === undefined ? left : clamp(x(yAt), left, right);
  return (
    <g>
      {grid &&
        xTicks.map((t) => (
          <line key={'gx' + t} x1={x(t)} x2={x(t)} y1={top} y2={bottom} className="sim-grid" />
        ))}
      {grid &&
        yTicks.map((t) => (
          <line key={'gy' + t} x1={left} x2={right} y1={y(t)} y2={y(t)} className="sim-grid" />
        ))}
      <path d={`M${left} ${axisY}H${right}M${axisX} ${top}V${bottom}`} className="stem-axis" />
      {xTicks.map((t) => (
        <g key={'x' + t}>
          <path d={`M${x(t)} ${axisY}v6`} className="stem-axis" />
          {!(yAt !== undefined && t === 0) && (
            <text
              x={x(t)}
              y={axisY + 10}
              textAnchor="middle"
              dominantBaseline="hanging"
              className="stem-tick sim-halo"
            >
              {num(t)}
            </text>
          )}
        </g>
      ))}
      {yTicks.map((t) => (
        <g key={'y' + t}>
          <path d={`M${axisX - 6} ${y(t)}h6`} className="stem-axis" />
          {!(xAt !== undefined && t === 0) && (
            <text
              x={axisX - 10}
              y={y(t)}
              textAnchor="end"
              dominantBaseline="middle"
              className="stem-tick sim-halo"
            >
              {num(t)}
            </text>
          )}
        </g>
      ))}
      {/* Axes on the edge of the plot carry their titles outside it, clear of the data. */}
      {xAt === undefined ? (
        <text
          x={right}
          y={axisY + 14 + font * 1.25}
          textAnchor="end"
          dominantBaseline="hanging"
          className="sim-axis-label"
        >
          {xLabel}
        </text>
      ) : (
        <text x={right} y={axisY - 10} textAnchor="end" className="sim-axis-label sim-halo">
          {xLabel}
        </text>
      )}
      {yAt === undefined ? (
        <text
          transform={`translate(${Math.max(
            font * 0.7,
            axisX - 18 - Math.max(0, ...yTicks.map((t) => textWidth(num(t), font))) - font * 0.85,
          )},${(top + bottom) / 2}) rotate(-90)`}
          textAnchor="middle"
          dominantBaseline="central"
          className="sim-axis-label"
        >
          {yLabel}
        </text>
      ) : (
        <text
          x={axisX + 10}
          y={top + 4}
          dominantBaseline="hanging"
          className="sim-axis-label sim-halo"
        >
          {yLabel}
        </text>
      )}
    </g>
  );
}

/** Horizontal energy bars on one shared scale; the dashed outline is the starting energy. */
export function EnergyPanel({
  rows,
  total,
  num,
  font,
  label,
  totalLabel,
}: {
  rows: { label: string; value: number; tone: Tone }[];
  total: number;
  num: (v: unknown, digits?: number) => string;
  font: number;
  label: string;
  totalLabel: string;
}) {
  const rowH = Math.max(34, font * 1.9);
  const labelW =
    Math.max(...[...rows.map((r) => r.label), totalLabel].map((l) => textWidth(l, font))) + 28;
  const valueW = textWidth('000.00 J', font) + 16;
  const barX = labelW,
    barW = W - labelW - valueW - 12;
  const max = Math.max(total, ...rows.map((r) => r.value), 1e-9);
  const height = rowH * (rows.length + 1) + 18;
  const all = [
    ...rows,
    { label: totalLabel, value: rows.reduce((s, r) => s + r.value, 0), tone: 'ink' as Tone },
  ];
  return (
    <svg
      className="stem-traces sim-panel"
      viewBox={`0 0 ${W} ${height}`}
      role="img"
      aria-label={label}
    >
      {all.map((r, i) => {
        const y = 10 + i * rowH;
        const w = (Math.max(0, r.value) / max) * barW;
        const isTotal = i === rows.length;
        return (
          <g key={r.label} className={`sim-tone-${r.tone}`}>
            <text x={16} y={y + rowH / 2} dominantBaseline="central" className="sim-bar-label">
              {r.label}
            </text>
            <rect
              x={barX}
              y={y + rowH * 0.18}
              width={barW}
              height={rowH * 0.64}
              rx="6"
              className="sim-bar-track"
            />
            {isTotal ? (
              <>
                {
                  rows.reduce(
                    (acc, part) => {
                      const pw = (Math.max(0, part.value) / max) * barW;
                      acc.nodes.push(
                        <rect
                          key={part.label}
                          x={barX + acc.x}
                          y={y + rowH * 0.18}
                          width={pw}
                          height={rowH * 0.64}
                          className={`sim-bar sim-tone-${part.tone}`}
                        />,
                      );
                      acc.x += pw;
                      return acc;
                    },
                    { x: 0, nodes: [] as ReactNode[] },
                  ).nodes
                }
                <rect
                  x={barX}
                  y={y + rowH * 0.1}
                  width={(total / max) * barW}
                  height={rowH * 0.8}
                  rx="7"
                  className="sim-bar-outline"
                />
              </>
            ) : (
              <rect
                x={barX}
                y={y + rowH * 0.18}
                width={w}
                height={rowH * 0.64}
                rx="6"
                className="sim-bar"
              />
            )}
            <text
              x={W - 12}
              y={y + rowH / 2}
              textAnchor="end"
              dominantBaseline="central"
              className="sim-bar-value"
            >
              {num(r.value, 2)} J
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/** True when the reader asked the system for less motion. */
const MOTION_QUERY = '(prefers-reduced-motion: reduce)';
function subscribeMotion(listener: () => void) {
  if (typeof window === 'undefined' || !window.matchMedia) return () => {};
  const query = window.matchMedia(MOTION_QUERY);
  query.addEventListener?.('change', listener);
  return () => query.removeEventListener?.('change', listener);
}
export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeMotion,
    () =>
      typeof window !== 'undefined' &&
      !!window.matchMedia &&
      window.matchMedia(MOTION_QUERY).matches,
    () => false,
  );
}

/** Seconds since mount, ticking on requestAnimationFrame; frozen at 0 when disabled. */
export function useAmbientClock(enabled: boolean): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    let frame = 0;
    const start = performance.now() - t * 1000;
    const tick = (now: number) => {
      setT((now - start) / 1000);
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- resume from the current time only
  }, [enabled]);
  return t;
}

/** A segmented toggle for view options that are not model parameters. */
export function ViewToggle<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div className="sim-view-toggle" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Deterministic pseudo-random numbers in [0, 1) for particle layouts that must not jump. */
export function hash(i: number, salt = 0): number {
  const s = Math.sin(i * 127.1 + salt * 311.7) * 43758.5453;
  return s - Math.floor(s);
}
/** Bounce a moving coordinate between 0 and span (a triangle wave). */
export function bounce(position: number, span: number): number {
  if (span <= 0) return 0;
  const p = ((position % (2 * span)) + 2 * span) % (2 * span);
  return p > span ? 2 * span - p : p;
}
