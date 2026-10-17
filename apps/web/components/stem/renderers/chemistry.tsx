'use client';
import { useMemo } from 'react';
import {
  FLAMES,
  INDICATOR_COLOURS,
  REFERENCE_HALF_LIFE_S,
  phIndicatorColour,
  titration,
  type PhParams,
  type TitrationParams,
} from '@just-imagine/stem-sims';
import { hexColour } from '../sim-format';
import { colourName } from '../../../lib/stem/readings';
import {
  Axes,
  Chip,
  H,
  Label,
  W,
  bounce,
  clamp,
  hash,
  niceCeil,
  niceTicks,
  scale,
  textWidth,
  tr,
  useAmbientClock,
  type RendererProps,
} from './kit';

const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

function Canvas({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <svg className="stem-canvas" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={name}>
      {children}
    </svg>
  );
}

const FORMULA: Record<string, string> = {
  hcl: 'HCl',
  naoh: 'NaOH',
  ethanoic: 'CH₃COOH',
  ammonia: 'NH₃',
  water: 'H₂O',
};

/* ---------------------------------------------------------------- pH and indicators */
export function PhView({ params, o, language, num, font, name }: RendererProps) {
  const p = params as PhParams;
  const ph = n(o.ph);
  const fill = hexColour(o.colour) ?? '#f4f7f6';
  const nature =
    Math.abs(ph - 7) < 0.005
      ? tr(language, 'Neutral', 'নিরপেক্ষ')
      : ph < 7
        ? tr(language, 'Acidic', 'অম্লীয়')
        : tr(language, 'Alkaline', 'ক্ষারীয়');
  const strip = scale(0, 14, 40, 600);
  const bands = Array.from({ length: 140 }, (_, i) => ({
    x: strip(i / 10),
    colour:
      '#' +
      INDICATOR_COLOURS[phIndicatorColour(p.indicator, i / 10 + 0.05)]
        .toString(16)
        .padStart(6, '0'),
  }));
  return (
    <Canvas name={name}>
      <path d="M190 22V200" className="sim-probe" />
      <path d="M190 22C190 0 300 0 300 36" className="sim-cable" />
      <path
        d="M52 44V184Q52 210 78 210H182Q208 210 208 184V44"
        className="sim-liquid"
        style={{ fill }}
      />
      <rect x="52" y="44" width="156" height="66" className="sim-air" />
      <path d="M40 34H52V184Q52 210 78 210H182Q208 210 208 184V34H220" className="sim-glass" />
      {[80, 120, 160].map((y) => (
        <path key={y} d={`M52 ${y}h14`} className="sim-glass-mark" />
      ))}
      <Label x={130} y={232} anchor="middle" bold>
        {FORMULA[p.substance]}
      </Label>
      <Label x={130} y={258} anchor="middle" small>
        {`${num(p.concentration, 4)} mol/dm³`}
      </Label>
      <rect x="300" y="26" width="300" height="118" rx="16" className="sim-meter" />
      <rect x="318" y="42" width="264" height="70" rx="10" className="sim-meter-screen" />
      <text
        x="450"
        y="78"
        textAnchor="middle"
        dominantBaseline="central"
        className="sim-meter-value"
      >
        pH {num(ph, 2)}
      </text>
      <text
        x="450"
        y="128"
        textAnchor="middle"
        dominantBaseline="central"
        className="sim-small sim-meter-caption"
      >
        {tr(language, 'pH meter', 'pH মিটার')}
      </text>
      <Chip
        x={450}
        y={160}
        align="center"
        font={font}
        lines={[`${nature} · ${colourName('ph-indicator', o.colour ?? null, language) ?? ''}`]}
      />
      {bands.map((b) => (
        <rect key={b.x} x={b.x} y="290" width={560 / 140 + 0.6} height="30" fill={b.colour} />
      ))}
      <rect x="40" y="290" width="560" height="30" rx="4" className="sim-strip-frame" />
      {Array.from({ length: 15 }, (_, i) => (
        <g key={i}>
          <path d={`M${strip(i)} 320v6`} className="stem-axis" />
          <text
            x={strip(i)}
            y="330"
            textAnchor="middle"
            dominantBaseline="hanging"
            className="stem-tick sim-small"
          >
            {num(i)}
          </text>
        </g>
      ))}
      <polygon
        points={`${strip(ph)},288 ${strip(ph) - 9},272 ${strip(ph) + 9},272`}
        className="sim-pointer"
      />
      <Label x={40} y={382} small tone="force">
        {tr(language, 'Acidic', 'অম্লীয়')}
      </Label>
      <Label x={strip(7)} y={382} anchor="middle" small>
        {tr(language, 'Neutral', 'নিরপেক্ষ')}
      </Label>
      <Label x={600} y={382} anchor="end" small tone="velocity">
        {tr(language, 'Alkaline', 'ক্ষারীয়')}
      </Label>
    </Canvas>
  );
}

/* ---------------------------------------------------------------- Titration */
const TRANSITION: Record<string, [number, number] | null> = {
  phenolphthalein: [8.2, 10],
  methylOrange: [3.1, 4.4],
  bromothymol: [6, 7.6],
  universal: null,
};
export function TitrationView({ params, o, solved, language, num, font, name }: RendererProps) {
  const p = params as TitrationParams;
  const eq = n(solved.equivalenceVolume);
  const xMax = Math.min(100, niceCeil(Math.max(Math.min(2 * eq, 100), p.baseAdded, 10)));
  const box: [number, number, number, number] = [338, 26, 624, 322];
  const sx = scale(0, xMax, box[0], box[2]),
    sy = scale(0, 14, box[3], box[1]);
  const curve = useMemo(
    () =>
      Array.from({ length: 201 }, (_, i) => {
        const v = (xMax * i) / 200;
        return `${sx(v)},${sy(clamp(n(titration.at({ ...p, baseAdded: v }, 0).ph), 0, 14))}`;
      }).join(' '),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- depends on the chemistry, not the added volume
    [p.acid, p.acidConcentration, p.acidVolume, p.baseConcentration, xMax],
  );
  const band = TRANSITION[p.indicator];
  const fill = hexColour(o.colour) ?? '#f4f7f6';
  const level = 22 + (190 * p.baseAdded) / 100;
  const ph = n(o.ph);
  const endLabel = `${tr(language, 'End point', 'সমতা বিন্দু')} ${num(eq, 1)} cm³`;
  return (
    <Canvas name={name}>
      {/* burette */}
      <rect x="96" y="22" width="28" height="190" className="sim-air" />
      <rect x="96" y={level} width="28" height={212 - level} className="sim-liquid sim-base" />
      <path d="M96 14V212M124 14V212M96 212L104 222H116L124 212" className="sim-glass" />
      {[0, 20, 40, 60, 80, 100].map((v) => (
        <g key={v}>
          <path d={`M96 ${22 + 1.9 * v}h10`} className="sim-glass-mark" />
          <text
            x="88"
            y={22 + 1.9 * v}
            textAnchor="end"
            dominantBaseline="middle"
            className="stem-tick sim-small"
          >
            {num(v)}
          </text>
        </g>
      ))}
      <Label x={140} y={30} small>
        cm³
      </Label>
      <Label x={140} y={60} small bold>
        NaOH
      </Label>
      <Label x={140} y={86} small>{`${num(p.baseConcentration, 2)} mol/dm³`}</Label>
      <rect x="98" y="222" width="24" height="10" rx="3" className="sim-tap" />
      <path d="M110 232V250" className="sim-glass" />
      {/* flask */}
      <path
        d="M96 262V296L44 378Q40 388 52 388H168Q180 388 176 378L124 296V262"
        className="sim-glass-fill"
      />
      <path
        d="M88 340L52 384Q50 388 56 388H164Q170 388 168 384L132 340Z"
        className={
          'sim-liquid' + (o.colour === INDICATOR_COLOURS.colourless ? ' is-colourless' : '')
        }
        style={{ fill }}
      />
      <path
        d="M96 262V296L44 378Q40 388 52 388H168Q180 388 176 378L124 296V262"
        className="sim-glass"
      />
      <Label x={186} y={330} small bold>
        {`${FORMULA[p.acid]} ${num(p.acidVolume, 1)} cm³`}
      </Label>
      <Label x={186} y={358} small>
        {`+ NaOH ${num(p.baseAdded, 1)} cm³`}
      </Label>
      {/* curve */}
      {band && (
        <rect
          x={box[0]}
          y={sy(band[1])}
          width={box[2] - box[0]}
          height={sy(band[0]) - sy(band[1])}
          className="sim-band"
        />
      )}
      <Axes
        box={box}
        x={sx}
        y={sy}
        xTicks={niceTicks(0, xMax, 5)}
        yTicks={[0, 2, 4, 6, 8, 10, 12, 14]}
        xLabel=""
        yLabel="pH"
        num={num}
        font={font}
      />
      <text
        x={(box[0] + box[2]) / 2}
        y={H - 10}
        textAnchor="middle"
        className="sim-axis-label sim-small"
      >
        {tr(language, 'Volume of NaOH added (cm³)', 'যোগ করা NaOH-এর আয়তন (cm³)')}
      </text>
      <polyline points={curve} className="stem-line" />
      {eq <= xMax ? (
        <>
          <path d={`M${sx(eq)} ${box[1]}V${box[3]}`} className="sim-guide" />
          <Label
            x={clamp(
              sx(eq),
              box[0] + textWidth(endLabel, font * 0.85) / 2,
              box[2] - textWidth(endLabel, font * 0.85) / 2,
            )}
            y={box[1] + 12}
            anchor="middle"
            small
          >
            {endLabel}
          </Label>
        </>
      ) : (
        <Label x={box[2]} y={box[1] + 12} anchor="end" small>
          {`${endLabel} →`}
        </Label>
      )}
      <circle
        cx={sx(p.baseAdded)}
        cy={sy(clamp(ph, 0, 14))}
        r="8"
        className="sim-sample"
        style={{ fill }}
      />
      <Label
        x={sx(p.baseAdded) + (sx(p.baseAdded) > 520 ? -12 : 12)}
        y={sy(clamp(ph, 0, 14))}
        anchor={sx(p.baseAdded) > 520 ? 'end' : 'start'}
        bold
      >
        {`pH ${num(ph, 2)}`}
      </Label>
    </Canvas>
  );
}

/* ---------------------------------------------------------------- Flame test */
/** Approximate the colour the eye sees at a wavelength (Bruton's piecewise fit). */
export function wavelengthColour(nm: number): string {
  let r = 0,
    g = 0,
    b = 0;
  if (nm < 440) [r, g, b] = [(440 - nm) / 60, 0, 1];
  else if (nm < 490) [r, g, b] = [0, (nm - 440) / 50, 1];
  else if (nm < 510) [r, g, b] = [0, 1, (510 - nm) / 20];
  else if (nm < 580) [r, g, b] = [(nm - 510) / 70, 1, 0];
  else if (nm < 645) [r, g, b] = [1, (645 - nm) / 65, 0];
  else [r, g, b] = [1, 0, 0];
  const edge =
    nm < 420
      ? 0.45 + (0.55 * (nm - 380)) / 40
      : nm > 700
        ? Math.max(0.55, 0.3 + (0.7 * (780 - nm)) / 80)
        : 1;
  const c = (v: number) => Math.round(255 * Math.pow(clamp(v * edge, 0, 1), 0.8));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}
export function FlameView({ params, o, language, num, font, name, reducedMotion }: RendererProps) {
  const ion = (params as { ion: keyof typeof FLAMES }).ion;
  const flame = FLAMES[ion];
  const colour = hexColour(o.colour) ?? '#ffb000';
  const lines = [o.line1, o.line2, o.line3].filter((v): v is number => typeof v === 'number');
  const sx = scale(380, 750, 300, 620);
  const ionLabel = {
    li: 'Li⁺',
    na: 'Na⁺',
    k: 'K⁺',
    ca: 'Ca²⁺',
    cu: 'Cu²⁺',
    sr: 'Sr²⁺',
    ba: 'Ba²⁺',
  }[ion];
  const sp = Math.max(26, font * 1.25);
  return (
    <Canvas name={name}>
      <defs>
        <linearGradient id={`flame-${ion}`} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor={colour} stopOpacity="0.95" />
          <stop offset="0.7" stopColor={colour} stopOpacity="0.8" />
          <stop offset="1" stopColor={colour} stopOpacity="0.05" />
        </linearGradient>
        <linearGradient id="visible-spectrum" x1="0" x2="1">
          {[380, 420, 460, 490, 510, 550, 580, 610, 645, 700, 750].map((nm) => (
            <stop key={nm} offset={(nm - 380) / 370} stopColor={wavelengthColour(nm)} />
          ))}
        </linearGradient>
      </defs>
      <g className={reducedMotion ? '' : 'sim-flicker'}>
        <path
          d="M150 282C104 238 112 160 150 52C188 160 196 238 150 282Z"
          fill={`url(#flame-${ion})`}
        />
        <path
          d="M150 282C132 262 134 226 150 196C166 226 168 262 150 282Z"
          className="sim-flame-core"
        />
      </g>
      <path d="M262 150L176 214" className="sim-wire" />
      <circle cx="170" cy="219" r="7" className="sim-wire-loop" />
      <rect x="136" y="282" width="28" height="86" rx="4" className="sim-burner" />
      <rect x="94" y="366" width="112" height="18" rx="6" className="sim-burner" />
      <Label x={150} y={30} anchor="middle" bold>
        {ionLabel}
      </Label>
      <rect x="300" y="26" width="320" height="104" rx="16" className="sim-inset" />
      <circle cx="342" cy="78" r="26" fill={colour} className="sim-swatch-ring" />
      <text x="382" y="62" dominantBaseline="central" className="sim-small">
        {tr(language, 'Flame colour', 'শিখার রং')}
      </text>
      <text x="382" y="94" dominantBaseline="central" className="sim-bold">
        {flame.name[language]}
      </text>
      <text x="300" y="160" dominantBaseline="central" className="sim-small sim-bold">
        {tr(language, 'Emission lines', 'নিঃসরণ রেখা')}
      </text>
      <rect x="300" y="180" width="320" height="64" rx="6" className="sim-spectroscope" />
      <rect
        x="300"
        y="180"
        width="320"
        height="64"
        rx="6"
        fill="url(#visible-spectrum)"
        opacity="0.22"
      />
      {lines.map((nm) => (
        <g key={nm}>
          <rect
            x={sx(nm) - 2}
            y="180"
            width="4"
            height="64"
            fill={wavelengthColour(nm)}
            className="sim-emission"
          />
        </g>
      ))}
      {[400, 500, 600, 700].map((nm) => (
        <g key={nm}>
          <path d={`M${sx(nm)} 244v6`} className="stem-axis" />
          <text
            x={sx(nm)}
            y="256"
            textAnchor="middle"
            dominantBaseline="hanging"
            className="stem-tick sim-small"
          >
            {num(nm)}
          </text>
        </g>
      ))}
      <text
        x="460"
        y={256 + font * 1.4}
        textAnchor="middle"
        dominantBaseline="hanging"
        className="sim-axis-label sim-small"
      >
        {tr(language, 'Wavelength (nm)', 'তরঙ্গদৈর্ঘ্য (nm)')}
      </text>
      {lines.map((nm, i) => (
        <g key={'row' + nm}>
          <rect
            x={300 + (i >= 2 ? 160 : 0)}
            y={316 + (i % 2) * sp + 10}
            width="14"
            height="14"
            rx="3"
            fill={wavelengthColour(nm)}
          />
          <text
            x={322 + (i >= 2 ? 160 : 0)}
            y={316 + (i % 2) * sp + 17}
            dominantBaseline="central"
            className="sim-small"
          >
            {`${num(nm, 1)} nm`}
          </text>
        </g>
      ))}
    </Canvas>
  );
}

/* ---------------------------------------------------------------- Reaction rate */
export function RateView({ params, o, time, horizon, language, num, font, name }: RendererProps) {
  const p = params as {
    temperature: number;
    concentration: number;
    catalyst: boolean;
    surface: 'lumps' | 'chips' | 'powder';
  };
  const product = n(o.product);
  const halfLife = n(o.halfLife);
  const real = time / Math.max(horizon / 10, 1e-9);
  const count = Math.round(10 + 12 * p.concentration);
  const speed = 34 * Math.sqrt((p.temperature + 273.15) / 298.15);
  const left = 40,
    top = 70,
    right = 300,
    bottom = 322;
  const remaining = Math.round(count * (1 - product));
  const pieces = p.surface === 'lumps' ? 3 : p.surface === 'chips' ? 8 : 26;
  const size =
    (p.surface === 'lumps' ? 34 : p.surface === 'chips' ? 16 : 6) *
    Math.sqrt(Math.max(0.12, 1 - 0.85 * product));
  const bubbles = Math.round(16 * product);
  const box: [number, number, number, number] = [380, 30, 622, 320];
  const sx = scale(0, horizon, box[0], box[2]),
    sy = scale(0, 100, box[3], box[1]);
  const curve = (h: number, end: number) =>
    Array.from({ length: 121 }, (_, i) => {
      const t = (end * i) / 120;
      return `${sx(t)},${sy(100 * (1 - Math.pow(0.5, t / h)))}`;
    }).join(' ');
  return (
    <Canvas name={name}>
      <path d={`M${left} ${top - 20}V${bottom}H${right}V${top - 20}`} className="sim-glass" />
      <rect x={left} y={top} width={right - left} height={bottom - top} className="sim-solution" />
      {Array.from({ length: pieces }, (_, i) => (
        <rect
          key={'m' + i}
          x={left + 14 + ((right - left - 28) * (i + 0.5)) / pieces - size / 2}
          y={bottom - size - 4 - hash(i, 3) * 6}
          width={size}
          height={size}
          rx={size / 3}
          className="sim-marble"
        />
      ))}
      {p.catalyst &&
        [0, 1, 2].map((i) => (
          <polygon
            key={'c' + i}
            points={Array.from({ length: 6 }, (_, j) => {
              const a = (j * Math.PI) / 3;
              return `${80 + i * 90 + 8 * Math.cos(a)},${bottom - 60 + 8 * Math.sin(a)}`;
            }).join(' ')}
            className="sim-catalyst"
          />
        ))}
      {Array.from({ length: remaining }, (_, i) => {
        const a = hash(i, 1) * Math.PI * 2;
        const x =
          left + 8 + bounce(hash(i, 2) * 240 + Math.cos(a) * speed * real, right - left - 16);
        const y =
          top + 8 + bounce(hash(i, 4) * 200 + Math.sin(a) * speed * real, bottom - top - 50);
        return <circle key={'h' + i} cx={x} cy={y} r="6" className="sim-particle" />;
      })}
      {Array.from({ length: bubbles }, (_, i) => {
        const x = left + 20 + hash(i, 7) * (right - left - 40);
        const y = bottom - 20 - ((hash(i, 8) * 200 + real * 60) % (bottom - top - 30));
        return <circle key={'b' + i} cx={x} cy={y} r={4 + hash(i, 9) * 4} className="sim-bubble" />;
      })}
      <Label x={left} y={top - 34} baseline="auto" small>
        {`${num(p.temperature)} °C · ${num(p.concentration, 1)} mol/dm³`}
      </Label>
      <circle cx={left + 8} cy={H - 44} r="6" className="sim-particle" />
      <Label x={left + 20} y={H - 44} small>
        {tr(language, 'Acid particles (H⁺)', 'এসিড কণা (H⁺)')}
      </Label>
      <circle cx={left + 8} cy={H - 18} r="6" className="sim-bubble" />
      <Label x={left + 20} y={H - 18} small>
        {tr(language, 'CO₂ bubbles', 'CO₂ বুদবুদ')}
      </Label>
      {p.catalyst && (
        <Label x={right} y={top - 34} anchor="end" baseline="auto" small bold>
          {tr(language, 'Catalyst', 'প্রভাবক')}
        </Label>
      )}
      <Axes
        box={box}
        x={sx}
        y={sy}
        xTicks={niceTicks(0, horizon, 4)}
        yTicks={[0, 25, 50, 75, 100]}
        xLabel="t (s)"
        yLabel={tr(language, 'Product (%)', 'উৎপাদ (%)')}
        num={num}
        font={font}
      />
      <polyline points={curve(REFERENCE_HALF_LIFE_S, horizon)} className="sim-reference" />
      <Label
        x={box[2]}
        y={sy(100 * (1 - Math.pow(0.5, horizon / REFERENCE_HALF_LIFE_S))) + 16}
        anchor="end"
        small
      >
        {tr(language, 'Reference', 'তুলনার অবস্থা')}
      </Label>
      <polyline points={curve(halfLife, horizon)} className="sim-path" />
      <polyline points={curve(halfLife, Math.min(time, horizon))} className="stem-line" />
      <circle
        cx={sx(Math.min(time, horizon))}
        cy={sy(100 * product)}
        r="6"
        className="stem-handle"
      />
      {halfLife <= horizon && (
        <>
          <path
            d={`M${sx(halfLife)} ${sy(50)}V${box[3]}M${box[0]} ${sy(50)}H${sx(halfLife)}`}
            className="sim-guide"
          />
          <Label x={sx(halfLife) + 6} y={box[3] - 16} small>
            {`t½ = ${num(halfLife, 1)} s`}
          </Label>
        </>
      )}
    </Canvas>
  );
}

/* ---------------------------------------------------------------- Gas laws */
export function GasView({ params, o, language, num, font, name, reducedMotion }: RendererProps) {
  const p = params as { amount: number; temperature: number; volume: number };
  const t = useAmbientClock(!reducedMotion);
  const pressure = n(o.pressure);
  const left = 30,
    top = 146,
    bottom = 330;
  const piston = left + 40 + 360 * (p.volume / 50);
  const count = Math.round(8 + 10 * p.amount);
  const speed = 80 * n(o.relativeSpeed);
  const g = { x: 80, y: 66, r: 44 };
  const logP = clamp(Math.log10(Math.max(pressure, 1)), 0, 5);
  const needle = (-135 + (270 * logP) / 5) * (Math.PI / 180);
  const thermo = scale(100, 800, 316, 150);
  return (
    <Canvas name={name}>
      <circle cx={g.x} cy={g.y} r={g.r} className="sim-meter" />
      {[0, 1, 2, 3, 4, 5].map((d) => {
        const a = (-135 + 54 * d) * (Math.PI / 180);
        return (
          <g key={d}>
            <path
              d={`M${g.x + Math.sin(a) * (g.r - 4)} ${g.y - Math.cos(a) * (g.r - 4)}L${g.x + Math.sin(a) * (g.r - 11)} ${g.y - Math.cos(a) * (g.r - 11)}`}
              className="sim-gauge-tick"
            />
            {d % 2 === 0 && (
              <text
                x={g.x + Math.sin(a) * (g.r + 12)}
                y={g.y - Math.cos(a) * (g.r + 12)}
                textAnchor="middle"
                dominantBaseline="central"
                className="stem-tick sim-tiny"
              >
                {['1', '', '10²', '', '10⁴', ''][d]}
              </text>
            )}
          </g>
        );
      })}
      <path
        d={`M${g.x} ${g.y}L${g.x + Math.sin(needle) * (g.r - 12)} ${g.y - Math.cos(needle) * (g.r - 12)}`}
        className="sim-needle"
      />
      <circle cx={g.x} cy={g.y} r="4" className="sim-pivot" />
      <text
        x={g.x}
        y={g.y + 22}
        textAnchor="middle"
        dominantBaseline="central"
        className="sim-tiny sim-gauge-unit"
      >
        kPa
      </text>
      <path d={`M${g.x} ${g.y + g.r}V${top}`} className="sim-pipe" />
      <Chip
        x={150}
        y={14}
        font={font}
        lines={[
          'PV = nRT  →  P = nRT ÷ V',
          `${tr(language, 'Pressure', 'চাপ')} P = ${num(pressure, 1)} kPa`,
        ]}
      />
      <rect x={left} y={top} width={piston - left} height={bottom - top} className="sim-gas" />
      <path d={`M470 ${top}H${left}V${bottom}H470`} className="sim-glass" />
      <rect
        x={piston}
        y={top + 2}
        width="14"
        height={bottom - top - 4}
        rx="3"
        className="sim-piston"
      />
      <path
        d={`M${piston + 14} ${(top + bottom) / 2}H${Math.max(piston + 40, 490)}`}
        className="sim-rod"
      />
      {Array.from({ length: count }, (_, i) => {
        const a = hash(i, 1) * Math.PI * 2;
        const x = left + 7 + bounce(hash(i, 2) * 400 + Math.cos(a) * speed * t, piston - left - 14);
        const y = top + 7 + bounce(hash(i, 3) * 200 + Math.sin(a) * speed * t, bottom - top - 14);
        return <circle key={i} cx={x} cy={y} r="5" className="sim-particle" />;
      })}
      <Label x={(left + piston) / 2} y={bottom + 24} anchor="middle" small>
        {`n = ${num(p.amount, 2)} mol · V = ${num(p.volume, 1)} dm³`}
      </Label>
      <rect x="532" y="140" width="16" height="182" rx="8" className="sim-glass-fill" />
      <rect
        x="535"
        y={thermo(p.temperature)}
        width="10"
        height={326 - thermo(p.temperature)}
        className="sim-mercury"
      />
      <circle cx="540" cy="336" r="14" className="sim-mercury" />
      {[200, 400, 600, 800].map((k) => (
        <g key={k}>
          <path d={`M548 ${thermo(k)}h8`} className="stem-axis" />
          <text x="560" y={thermo(k)} dominantBaseline="middle" className="stem-tick sim-small">
            {num(k)}
          </text>
        </g>
      ))}
      <Label x={540} y={374} anchor="middle" small bold>
        {`T = ${num(p.temperature)} K`}
      </Label>
    </Canvas>
  );
}

export const CHEM_FORMULA = FORMULA;
