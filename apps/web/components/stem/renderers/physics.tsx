'use client';
import { useMemo, useRef, useState, type PointerEvent } from 'react';
import { collision, orbit, projectile, spring, CART_WIDTH_M } from '@just-imagine/stem-sims';
import { simulationPoint } from '../../../lib/school/simulation-geometry';
import {
  Arrow,
  Axes,
  Chip,
  EnergyPanel,
  H,
  Label,
  W,
  clamp,
  niceCeil,
  niceStep,
  niceTicks,
  scale,
  textWidth,
  tr,
  ViewToggle,
  type RendererProps,
} from './kit';

const RAD = Math.PI / 180;
const n = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : 0);

function Canvas({
  name,
  children,
  ...rest
}: { name: string; children: React.ReactNode } & React.SVGProps<SVGSVGElement>) {
  return (
    <svg className="stem-canvas" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={name} {...rest}>
      {children}
    </svg>
  );
}

/* ---------------------------------------------------------------- Projectile */
export function ProjectileView({
  params,
  o,
  solved,
  time,
  language,
  num,
  font,
  name,
}: RendererProps) {
  const p = params as { speed: number; angle: number; height: number; gravity: number };
  const range = n(solved.range),
    apex = n(solved.apex),
    flight = n(solved.flightTime),
    apexX = n(solved.apexX);
  const box: [number, number, number, number] = [74, 22, 620, 326];
  const k = Math.min(
    (box[2] - box[0]) / Math.max(range * 1.08, 1),
    (box[3] - box[1]) / Math.max(apex * 1.15, 1),
  );
  const sx = (m: number) => box[0] + m * k,
    sy = (m: number) => box[3] - m * k;
  const xTicks = niceTicks(0, (box[2] - box[0]) / k, 6);
  const yTicks = niceTicks(0, (box[3] - box[1]) / k, 4);
  const path = Array.from({ length: 81 }, (_, i) => {
    const s = projectile.at(p, (flight * i) / 80);
    return `${sx(n(s.x))},${sy(n(s.y))}`;
  }).join(' ');
  const travelled = Array.from({ length: 41 }, (_, i) => {
    const s = projectile.at(p, (Math.min(time, flight) * i) / 40);
    return `${sx(n(s.x))},${sy(n(s.y))}`;
  }).join(' ');
  const dotStep = niceStep(flight, 10);
  const dots: number[] = [];
  for (let t = dotStep; t < flight - 1e-9; t += dotStep) dots.push(t);
  const bx = sx(n(o.x)),
    by = sy(n(o.y));
  const vk = 85 / Math.max(p.speed, n(solved.impactSpeed), 1);
  const vx = n(o.vx) * vk,
    vy = -n(o.vy) * vk;
  const speed = Math.hypot(n(o.vx), n(o.vy));
  const landed = o.landed === true;
  return (
    <Canvas name={name}>
      <Axes
        box={box}
        x={sx}
        y={sy}
        xTicks={xTicks}
        yTicks={yTicks}
        xLabel="x (m)"
        yLabel="y (m)"
        num={num}
        font={font}
      />
      {p.height > 0 && (
        <rect
          x={sx(0) - 9}
          y={sy(p.height)}
          width="9"
          height={sy(0) - sy(p.height)}
          className="sim-ground"
        />
      )}
      <g transform={`translate(${sx(0)},${sy(p.height)}) rotate(${-p.angle})`}>
        <rect x="-6" y="-7" width="34" height="14" rx="4" className="sim-launcher" />
      </g>
      <polyline points={path} className="sim-path" />
      <polyline points={travelled} className="stem-line" />
      {dots.map((t) => {
        const s = projectile.at(p, t);
        return (
          <circle
            key={t}
            cx={sx(n(s.x))}
            cy={sy(n(s.y))}
            r="4"
            className={t <= time ? 'sim-dot is-past' : 'sim-dot'}
          />
        );
      })}
      <path d={`M${sx(0)} ${sy(apex)}H${sx(apexX)}`} className="sim-guide" />
      <circle cx={sx(apexX)} cy={sy(apex)} r="5" className="sim-marker" />
      <Label x={sx(0) + 14} y={sy(apex) - 12} baseline="auto" small>
        {`${tr(language, 'highest', 'সর্বোচ্চ')} ${num(apex, 2)} m`}
      </Label>
      <path d={`M${sx(range)} ${sy(0)}v-16`} className="sim-flag" />
      {!landed && (
        <>
          <Arrow x1={bx} y1={by} x2={bx + vx} y2={by} tone="velocity" width={2.5} head={9} dashed />
          <Arrow x1={bx} y1={by} x2={bx} y2={by + vy} tone="velocity" width={2.5} head={9} dashed />
          <Arrow x1={bx} y1={by} x2={bx + vx} y2={by + vy} tone="velocity" />
          <Label
            x={clamp(bx + vx + (vx >= 0 ? 10 : -10), 10, W - 10)}
            y={by + vy}
            anchor={vx >= 0 ? 'start' : 'end'}
            tone="velocity"
            small
          >
            {`v = ${num(speed, 2)} m/s`}
          </Label>
        </>
      )}
      <circle cx={bx} cy={by} r="9" className="sim-ball" />
      <Chip
        x={W - 10}
        y={10}
        align="right"
        font={font}
        lines={[
          `t = ${num(time, 2)} s`,
          `${tr(language, 'In the air', 'বাতাসে')} ${num(flight, 2)} s`,
          `${tr(language, 'Range', 'পাল্লা')} R = ${num(range, 2)} m`,
        ]}
      />
    </Canvas>
  );
}

/* ---------------------------------------------------------------- Vector addition */
export function VectorsView({
  params,
  solved,
  language,
  num,
  font,
  name,
  update,
  locked,
}: RendererProps) {
  const p = params as { aMagnitude: number; aAngle: number; bMagnitude: number; bAngle: number };
  const [view, setView] = useState<'tail' | 'parallelogram'>('tail');
  const A = [n(solved.ax), n(solved.ay)] as const,
    B = [n(solved.bx), n(solved.by)] as const,
    R = [n(solved.rx), n(solved.ry)] as const;
  const pts = [[0, 0], A, B, R];
  // While dragging, the view keeps the scale it had when the drag began, so the tip tracks the finger.
  const drag = useRef<'a' | 'b' | null>(null);
  const [frozen, setFrozen] = useState<{ k: number; ox: number; oy: number } | null>(null);
  const minX = Math.min(...pts.map((q) => q[0])),
    maxX = Math.max(...pts.map((q) => q[0])),
    minY = Math.min(...pts.map((q) => q[1])),
    maxY = Math.max(...pts.map((q) => q[1]));
  const fitK = Math.min(34, 520 / Math.max(maxX - minX, 2), 300 / Math.max(maxY - minY, 2));
  const fitOx = 320 - ((minX + maxX) / 2) * fitK,
    fitOy = 205 + ((minY + maxY) / 2) * fitK;
  const k = frozen?.k ?? fitK,
    ox = frozen?.ox ?? fitOx,
    oy = frozen?.oy ?? fitOy;
  const X = (v: number) => ox + v * k,
    Y = (v: number) => oy - v * k;
  const grid = niceStep(Math.max(W / k, 1), 12);
  const lines: number[] = [];
  for (let g = Math.ceil(-ox / k / grid) * grid; X(g) <= W; g += grid) lines.push(g);
  const rows: number[] = [];
  for (let g = Math.ceil((oy - H) / k / grid) * grid; Y(g) >= 0; g += grid) rows.push(g);
  const unit = tr(language, 'units', 'একক');
  const bStart = view === 'tail' ? A : ([0, 0] as const);
  const mid = (a: readonly number[], b: readonly number[], off: number) => {
    const dx = X(b[0]!) - X(a[0]!),
      dy = Y(b[1]!) - Y(a[1]!),
      len = Math.hypot(dx, dy) || 1;
    return {
      x: (X(a[0]!) + X(b[0]!)) / 2 - (dy / len) * off,
      y: (Y(a[1]!) + Y(b[1]!)) / 2 + (dx / len) * off,
    };
  };
  const la = mid([0, 0], A, 18),
    lb = mid(bStart, [bStart[0] + B[0], bStart[1] + B[1]], 18),
    lr = mid([0, 0], R, -20);
  const rAngle = n(solved.angle);
  const arcR = 38;
  const arc =
    n(solved.magnitude) > 0.05
      ? `M${X(0) + arcR} ${Y(0)}A${arcR} ${arcR} 0 ${Math.abs(rAngle) > 180 ? 1 : 0} ${rAngle >= 0 ? 0 : 1} ${X(0) + arcR * Math.cos(rAngle * RAD)} ${Y(0) - arcR * Math.sin(rAngle * RAD)}`
      : '';
  function onPointer(e: PointerEvent<SVGSVGElement>, start = false) {
    const point = simulationPoint([e.clientX, e.clientY], e.currentTarget.getScreenCTM());
    if (!point) return;
    const wx = (point[0] - ox) / k,
      wy = (oy - point[1]) / k;
    if (start) {
      const tipB = view === 'tail' ? R : B;
      const dA = Math.hypot(wx - A[0], wy - A[1]),
        dB = Math.hypot(wx - tipB[0], wy - tipB[1]);
      const which = dB < dA ? 'b' : 'a';
      if (Math.min(dA, dB) * k > 40) return;
      if (locked.includes(which + 'Magnitude') && locked.includes(which + 'Angle')) return;
      drag.current = which;
      setFrozen({ k, ox, oy });
      e.currentTarget.setPointerCapture(e.pointerId);
    }
    const which = drag.current;
    if (!which || !e.buttons) return;
    const vx = which === 'b' && view === 'tail' ? wx - A[0] : wx,
      vy = which === 'b' && view === 'tail' ? wy - A[1] : wy;
    const magnitude = Math.round(clamp(Math.hypot(vx, vy), 0, 10) * 10) / 10;
    const angle = Math.round(Math.atan2(vy, vx) / RAD);
    update({
      [which + 'Magnitude']: magnitude,
      [which + 'Angle']: angle === -180 ? 180 : angle,
    });
  }
  return (
    <>
      <ViewToggle
        label={tr(language, 'How to add', 'যোগের পদ্ধতি')}
        value={view}
        onChange={setView}
        options={[
          { value: 'tail', label: tr(language, 'Tip to tail', 'মাথা-লেজ পদ্ধতি') },
          { value: 'parallelogram', label: tr(language, 'Parallelogram', 'সামান্তরিক সূত্র') },
        ]}
      />
      <Canvas
        name={name}
        onPointerDown={(e) => onPointer(e, true)}
        onPointerMove={(e) => onPointer(e)}
        onPointerUp={() => {
          drag.current = null;
          setFrozen(null);
        }}
        onPointerCancel={() => {
          drag.current = null;
          setFrozen(null);
        }}
      >
        {lines.map((g) => (
          <line key={'v' + g} x1={X(g)} x2={X(g)} y1={0} y2={H} className="sim-grid" />
        ))}
        {rows.map((g) => (
          <line key={'h' + g} x1={0} x2={W} y1={Y(g)} y2={Y(g)} className="sim-grid" />
        ))}
        <path d={`M0 ${Y(0)}H${W}M${X(0)} 0V${H}`} className="stem-axis" />
        <Label x={W - 8} y={Y(0) - 14} anchor="end" small>{`x (${unit})`}</Label>
        <Label x={X(0) + 8} y={14} small>{`y (${unit})`}</Label>
        <Label x={X(grid)} y={Y(0) + 16} anchor="middle" small>
          {num(grid)}
        </Label>
        {view === 'parallelogram' && (
          <>
            <Arrow
              x1={X(A[0])}
              y1={Y(A[1])}
              x2={X(R[0])}
              y2={Y(R[1])}
              tone="vector-b"
              width={2}
              head={9}
              dashed
            />
            <Arrow
              x1={X(B[0])}
              y1={Y(B[1])}
              x2={X(R[0])}
              y2={Y(R[1])}
              tone="vector-a"
              width={2}
              head={9}
              dashed
            />
          </>
        )}
        <path d={`M${X(0)} ${Y(0)}H${X(R[0])}V${Y(R[1])}`} className="sim-component" />
        <Label x={X(R[0] / 2)} y={Y(0) + (R[1] >= 0 ? 16 : -16)} anchor="middle" tone="net" small>
          {`Rx = ${num(R[0], 2)}`}
        </Label>
        <Label
          x={X(R[0]) + (R[0] >= 0 ? 8 : -8)}
          y={Y(R[1] / 2)}
          anchor={R[0] >= 0 ? 'start' : 'end'}
          tone="net"
          small
        >
          {`Ry = ${num(R[1], 2)}`}
        </Label>
        {arc && <path d={arc} className="sim-angle" />}
        <Arrow x1={X(0)} y1={Y(0)} x2={X(A[0])} y2={Y(A[1])} tone="vector-a" />
        <Arrow
          x1={X(bStart[0])}
          y1={Y(bStart[1])}
          x2={X(bStart[0] + B[0])}
          y2={Y(bStart[1] + B[1])}
          tone="vector-b"
        />
        <Arrow x1={X(0)} y1={Y(0)} x2={X(R[0])} y2={Y(R[1])} tone="net" width={5} head={15} />
        <circle cx={X(A[0])} cy={Y(A[1])} r="10" className="sim-grip" />
        <circle cx={X(bStart[0] + B[0])} cy={Y(bStart[1] + B[1])} r="10" className="sim-grip" />
        <Label
          x={la.x}
          y={la.y}
          anchor="middle"
          tone="vector-a"
          bold
        >{`A = ${num(p.aMagnitude, 2)}`}</Label>
        <Label
          x={lb.x}
          y={lb.y}
          anchor="middle"
          tone="vector-b"
          bold
        >{`B = ${num(p.bMagnitude, 2)}`}</Label>
        <Label
          x={lr.x}
          y={lr.y}
          anchor="middle"
          tone="net"
          bold
        >{`R = ${num(solved.magnitude, 2)}`}</Label>
        <Chip
          x={10}
          y={10}
          font={font}
          tone="net"
          lines={[
            `${tr(language, 'Resultant', 'লব্ধি')} R = ${num(solved.magnitude, 2)} ${unit}`,
            `θ = ${num(rAngle, 1)}°`,
          ]}
        />
      </Canvas>
    </>
  );
}

/* ---------------------------------------------------------------- Incline */
export function InclineView({
  params,
  o,
  solved,
  time,
  horizon,
  language,
  num,
  font,
  name,
}: RendererProps) {
  const p = params as { mass: number; angle: number };
  const th = p.angle * RAD;
  const L = Math.min(370 / Math.cos(th), th > 0 ? 300 / Math.sin(th) : Infinity);
  const Wd = L * Math.cos(th),
    Hh = L * Math.sin(th);
  const x0 = 30,
    ground = 362;
  const T = [x0, ground - Hh] as const,
    V = [x0 + Wd, ground] as const;
  const d = [Math.cos(th), Math.sin(th)] as const,
    nrm = [Math.sin(th), -Math.cos(th)] as const;
  const slides = o.slides === true;
  const total = Math.max(n(solved.distance), 0.5);
  const s0 = 56,
    s1 = L - 56;
  const s = slides ? s0 + (n(o.distance) / total) * (s1 - s0) : (s0 + s1) / 2;
  const cx = T[0] + d[0] * s + nrm[0] * 23,
    cy = T[1] + d[1] * s + nrm[1] * 23;
  const vEnd = Math.max(n(solved.v), 0.1);
  const vLen = (n(o.v) / vEnd) * 70;
  // Free-body diagram, one force scale.
  const c = [528, 138] as const;
  const kF = 88 / Math.max(n(o.weight), 1e-9);
  const forces: { sym: string; value: number; dx: number; dy: number; tone: 'force' | 'net' }[] = [
    { sym: 'W', value: n(o.weight), dx: 0, dy: 1, tone: 'force' },
    { sym: 'N', value: n(o.normal), dx: nrm[0], dy: nrm[1], tone: 'force' },
    { sym: 'f', value: n(o.friction), dx: -d[0], dy: -d[1], tone: 'force' },
    { sym: 'ΣF', value: n(o.net), dx: d[0], dy: d[1], tone: 'net' },
  ];
  const sp = Math.max(28, font * 1.3);
  return (
    <Canvas name={name}>
      <polygon points={`${x0},${ground} ${T[0]},${T[1]} ${V[0]},${V[1]}`} className="sim-ground" />
      <path d={`M10 ${ground}H${V[0] + 10}`} className="stem-axis" />
      {th > 0 && (
        <>
          <path
            d={`M${V[0] - 44} ${ground}A44 44 0 0 1 ${V[0] - 44 * Math.cos(th)} ${ground - 44 * Math.sin(th)}`}
            className="sim-angle"
          />
          <Label x={V[0] - 54} y={ground - 14} anchor="end" small>{`θ = ${num(p.angle)}°`}</Label>
        </>
      )}
      <g transform={`translate(${cx},${cy}) rotate(${p.angle})`}>
        <rect x="-38" y="-22" width="76" height="44" rx="6" className="stem-body" />
        <text x="0" y="1" textAnchor="middle" dominantBaseline="central" className="sim-small">
          {num(p.mass, 2)} kg
        </text>
      </g>
      {slides && vLen > 2 && (
        <>
          <Arrow
            x1={cx + nrm[0] * 38}
            y1={cy + nrm[1] * 38}
            x2={cx + nrm[0] * 38 + d[0] * vLen}
            y2={cy + nrm[1] * 38 + d[1] * vLen}
            tone="velocity"
          />
          <Label
            x={cx + nrm[0] * 56 + d[0] * vLen}
            y={cy + nrm[1] * 56 + d[1] * vLen}
            tone="velocity"
            small
          >
            {`v = ${num(o.v, 2)} m/s`}
          </Label>
        </>
      )}
      <Chip
        x={10}
        y={10}
        font={font}
        tone={slides ? 'net' : undefined}
        lines={[
          slides ? tr(language, 'Slides', 'পিছলে নামে') : tr(language, 'Holds', 'স্থির থাকে'),
          `a = ${num(o.a, 2)} m/s²`,
          `t = ${num(time, 1)} / ${num(horizon)} s`,
        ]}
      />
      <rect x="420" y="10" width="212" height="380" rx="14" className="sim-inset" />
      <text
        x="526"
        y="30"
        textAnchor="middle"
        dominantBaseline="central"
        className="sim-small sim-bold"
      >
        {tr(language, 'Free-body diagram', 'বলচিত্র')}
      </text>
      <g transform={`translate(${c[0]},${c[1]}) rotate(${p.angle})`}>
        <rect x="-15" y="-11" width="30" height="22" rx="3" className="stem-body" />
      </g>
      {forces.map((f) => {
        const len = f.value * kF;
        if (len < 2) return null;
        const tx = c[0] + f.dx * len,
          ty = c[1] + f.dy * len;
        return (
          <g key={f.sym}>
            <Arrow
              x1={c[0]}
              y1={c[1]}
              x2={tx}
              y2={ty}
              tone={f.tone}
              width={f.tone === 'net' ? 5 : 4}
            />
            <Label x={tx + f.dx * 16} y={ty + f.dy * 16} anchor="middle" tone={f.tone} bold>
              {f.sym}
            </Label>
          </g>
        );
      })}
      {forces.map((f, i) => (
        <g key={'legend' + f.sym} className={`sim-tone-${f.tone}`}>
          <rect
            x="436"
            y={388 - (forces.length - i) * sp + sp * 0.3}
            width="14"
            height="14"
            rx="3"
            className="sim-swatch"
          />
          <text
            x="458"
            y={388 - (forces.length - i) * sp + sp * 0.3 + 7}
            dominantBaseline="central"
            className="sim-small"
          >
            {`${f.sym} = ${num(f.value, 2)} N`}
          </text>
        </g>
      ))}
    </Canvas>
  );
}

/* ---------------------------------------------------------------- Pendulum */
export function PendulumView({ params, o, solved, language, num, font, name }: RendererProps) {
  const p = params as { length: number; mass: number; angle: number };
  // One honest scale, so a longer rod looks longer; it shrinks only if a wide swing would not fit.
  const px = Math.min(110, 290 / (p.length * Math.sin(p.angle * RAD))),
    // Centre the swing vertically on the canvas.
    pivot = [
      320,
      Math.max(
        36,
        (H - (p.length * Math.min(110, 290 / (p.length * Math.sin(p.angle * RAD))) + 50)) / 2,
      ),
    ] as const;
  const theta = n(o.angle) * RAD;
  const bob = [pivot[0] + n(o.x) * px, pivot[1] - n(o.y) * px] as const;
  const r = 10 + 10 * Math.cbrt(p.mass / 5);
  const Lp = p.length * px;
  const a0 = p.angle * RAD;
  const lowest = pivot[1] + Lp;
  const bracketX = Math.min(W - 130, pivot[0] + Math.max(Lp * Math.sin(a0), 40) + 36);
  const h = p.length + n(o.y);
  const v = p.length * n(o.omega);
  const vk = 70 / Math.max(n(solved.maxSpeed), 1e-6);
  const vx = Math.cos(theta) * v * vk,
    vy = -Math.sin(theta) * v * vk;
  return (
    <>
      <Canvas name={name}>
        <path d={`M${pivot[0] - 80} ${pivot[1]}H${pivot[0] + 80}`} className="sim-ceiling" />
        <path d={`M${pivot[0]} ${pivot[1]}V${lowest + 20}`} className="sim-guide" />
        <path
          d={`M${pivot[0] - Lp * Math.sin(a0)} ${pivot[1] + Lp * Math.cos(a0)}A${Lp} ${Lp} 0 0 0 ${pivot[0] + Lp * Math.sin(a0)} ${pivot[1] + Lp * Math.cos(a0)}`}
          className="sim-path"
        />
        <circle
          cx={pivot[0] + Lp * Math.sin(a0)}
          cy={pivot[1] + Lp * Math.cos(a0)}
          r={r}
          className="sim-ghost"
        />
        <path d={`M${pivot[0] - 40} ${lowest}H${bracketX + 6}`} className="sim-guide" />
        {h > 0.005 && (
          <>
            <path
              d={`M${bracketX - 6} ${bob[1]}h12M${bracketX} ${bob[1]}V${lowest}M${bracketX - 6} ${lowest}h12`}
              className="sim-bracket sim-tone-potential"
            />
            <Label x={bracketX + 10} y={(bob[1] + lowest) / 2} tone="potential" small>
              {`h = ${num(h, 2)} m`}
            </Label>
          </>
        )}
        <line x1={pivot[0]} y1={pivot[1]} x2={bob[0]} y2={bob[1]} className="sim-rod" />
        <Label
          x={(pivot[0] + bob[0]) / 2 + (bob[0] >= pivot[0] ? -10 : 10)}
          y={(pivot[1] + bob[1]) / 2}
          anchor={bob[0] >= pivot[0] ? 'end' : 'start'}
          small
        >
          {`L = ${num(p.length, 2)} m`}
        </Label>
        <circle cx={pivot[0]} cy={pivot[1]} r="5" className="sim-pivot" />
        <Arrow x1={bob[0]} y1={bob[1]} x2={bob[0] + vx} y2={bob[1] + vy} tone="velocity" />
        <circle cx={bob[0]} cy={bob[1]} r={r} className="sim-ball" />
        <Chip
          x={10}
          y={10}
          font={font}
          lines={[
            `${tr(language, 'Period', 'দোলনকাল')} T = ${num(solved.period, 2)} s`,
            `θ = ${num(o.angle, 1)}°`,
            `v = ${num(Math.abs(v), 2)} m/s`,
          ]}
        />
      </Canvas>
      <EnergyPanel
        label={tr(language, 'Energy bars', 'শক্তির দণ্ড')}
        font={font}
        num={num}
        total={n(o.total)}
        totalLabel={tr(language, 'Total', 'মোট')}
        rows={[
          { label: tr(language, 'Kinetic', 'গতিশক্তি'), value: n(o.kinetic), tone: 'kinetic' },
          {
            label: tr(language, 'Potential', 'বিভবশক্তি'),
            value: n(o.potential),
            tone: 'potential',
          },
          { label: tr(language, 'Thermal', 'তাপশক্তি'), value: n(o.thermal), tone: 'thermal' },
        ]}
      />
    </>
  );
}

/* ---------------------------------------------------------------- Spring */
export function SpringView({
  params,
  o,
  solved,
  time,
  horizon,
  language,
  num,
  font,
  name,
}: RendererProps) {
  const p = params as { mass: number; k: number; amplitude: number; damping: number };
  const px = 380,
    eq = 300,
    floor = 172,
    wall = 40;
  const x = n(o.x);
  const block = eq + x * px;
  const left = block - 35;
  const coils = 14,
    yMid = 141;
  const zig = Array.from({ length: coils * 2 + 1 }, (_, i) => {
    const t = i / (coils * 2);
    const zx = wall + 12 + t * (left - wall - 24);
    return `${zx},${i === 0 || i === coils * 2 ? yMid : yMid + (i % 2 ? -13 : 13)}`;
  });
  const springPath = `M${wall} ${yMid}H${wall + 12}L${zig.join('L')}L${left} ${yMid}`;
  const force = -p.k * x;
  const kF = 80 / Math.max(p.k * p.amplitude, 1e-9);
  const kv = 80 / Math.max(n(solved.maxSpeed), 1e-9);
  const box: [number, number, number, number] = [70, 214, 622, 384];
  const yMax = niceCeil(p.amplitude);
  const sx = scale(0, horizon, box[0], box[2]),
    sy = scale(-yMax, yMax, box[3], box[1]);
  const curve = (end: number, count: number) =>
    Array.from({ length: count + 1 }, (_, i) => {
      const t = (end * i) / count;
      return `${sx(t)},${sy(n(spring.at(p, t).x))}`;
    }).join(' ');
  return (
    <>
      <Canvas name={name}>
        <rect x={wall - 18} y="88" width="18" height={floor - 88} className="sim-ceiling-fill" />
        <path d={`M${wall} 88V${floor}M${wall - 18} ${floor}H${W - 12}`} className="stem-axis" />
        <path d={`M${eq} 70V${floor + 8}`} className="sim-guide" />
        <Label x={eq} y={floor + 18} anchor="middle" baseline="hanging" small>
          x = {num(0)}
        </Label>
        <path d={springPath} className="sim-spring" />
        <rect x={left} y={floor - 62} width="70" height="62" rx="8" className="stem-body" />
        <text
          x={block}
          y={floor - 31}
          textAnchor="middle"
          dominantBaseline="central"
          className="sim-small"
        >
          {num(p.mass, 2)} kg
        </text>
        <Arrow x1={block} y1={92} x2={block + force * kF} y2={92} tone="force" />
        <Arrow x1={block} y1={62} x2={block + n(o.v) * kv} y2={62} tone="velocity" />
        <Label
          x={block + force * kF + (force >= 0 ? 10 : -10)}
          y={92}
          anchor={force >= 0 ? 'start' : 'end'}
          tone="force"
          small
        >
          {`F = ${num(force, 2)} N`}
        </Label>
        <Label
          x={block + n(o.v) * kv + (n(o.v) >= 0 ? 10 : -10)}
          y={62}
          anchor={n(o.v) >= 0 ? 'start' : 'end'}
          tone="velocity"
          small
        >
          {`v = ${num(o.v, 2)} m/s`}
        </Label>
        <Chip
          x={W - 10}
          y={10}
          align="right"
          font={font}
          lines={[
            `${tr(language, 'Period', 'দোলনকাল')} T = ${num(solved.period, 2)} s`,
            `k = ${num(p.k)} N/m`,
          ]}
        />
        <Axes
          box={box}
          x={sx}
          y={sy}
          xTicks={niceTicks(0, horizon, 6)}
          yTicks={[-yMax, 0, yMax]}
          xLabel="t (s)"
          yLabel="x (m)"
          num={num}
          xAt={0}
          font={font}
        />
        <polyline points={curve(horizon, 240)} className="sim-path" />
        <polyline points={curve(Math.min(time, horizon), 160)} className="stem-line" />
        <circle cx={sx(time)} cy={sy(x)} r="6" className="stem-handle" />
      </Canvas>
      <EnergyPanel
        label={tr(language, 'Energy bars', 'শক্তির দণ্ড')}
        font={font}
        num={num}
        total={n(solved.energy)}
        totalLabel={tr(language, 'Total', 'মোট')}
        rows={[
          { label: tr(language, 'Kinetic', 'গতিশক্তি'), value: n(o.kinetic), tone: 'kinetic' },
          {
            label: tr(language, 'Elastic', 'স্থিতিস্থাপক'),
            value: n(o.potential),
            tone: 'potential',
          },
          { label: tr(language, 'Thermal', 'তাপশক্তি'), value: n(o.thermal), tone: 'thermal' },
        ]}
      />
    </>
  );
}

/* ---------------------------------------------------------------- Collision */
export function CollisionView({ params, o, solved, language, num, font, name }: RendererProps) {
  const p = params as { m1: number; m2: number; u1: number; u2: number };
  const view = 4.5;
  const sx = scale(-view, view, 20, 620);
  const cart = CART_WIDTH_M * ((620 - 20) / (2 * view));
  const track = 150;
  const vMax = Math.max(
    Math.abs(p.u1),
    Math.abs(p.u2),
    Math.abs(n(solved.v1)),
    Math.abs(n(solved.v2)),
    0.1,
  );
  const kv = 70 / vMax;
  const collided = o.collided === true;
  const carts = [
    { x: n(o.x1), v: n(o.v1), m: p.m1, cls: 'sim-cart-1', name: '1' },
    { x: n(o.x2), v: n(o.v2), m: p.m2, cls: 'sim-cart-2', name: '2' },
  ];
  const col = (x: number, before: boolean) => {
    const sub = before ? 'u' : 'v';
    const v1 = before ? p.u1 : n(solved.v1),
      v2 = before ? p.u2 : n(solved.v2);
    const momentum = before ? solved.momentumBefore : solved.momentumAfter;
    const ke = before ? solved.keBefore : solved.keAfter;
    const sp = Math.max(28, font * 1.32);
    return (
      <g className={!before && !collided ? 'sim-dim' : ''}>
        <rect x={x} y="214" width="296" height="178" rx="14" className="sim-inset" />
        <text x={x + 14} y={214 + sp * 0.75} dominantBaseline="central" className="sim-bold">
          {before
            ? tr(language, 'Before the collision', 'সংঘর্ষের আগে')
            : tr(language, 'After the collision', 'সংঘর্ষের পরে')}
        </text>
        {[
          `${sub}₁ = ${num(v1, 2)} m/s`,
          `${sub}₂ = ${num(v2, 2)} m/s`,
          `p = ${num(momentum, 2)} kg·m/s`,
          `KE = ${num(ke, 2)} J`,
        ].map((line, i) => (
          <text
            key={i}
            x={x + 14}
            y={214 + sp * (1.85 + i)}
            dominantBaseline="central"
            className={
              i === 2
                ? 'sim-small sim-tone-momentum'
                : i === 3
                  ? 'sim-small sim-tone-kinetic'
                  : 'sim-small'
            }
          >
            {line}
          </text>
        ))}
      </g>
    );
  };
  return (
    <Canvas name={name}>
      <path d={`M20 ${track + 22}H620`} className="stem-axis" />
      {niceTicks(-4, 4, 8).map((t) => (
        <g key={t}>
          <path d={`M${sx(t)} ${track + 22}v6`} className="stem-axis" />
          <text
            x={sx(t)}
            y={track + 34}
            textAnchor="middle"
            dominantBaseline="hanging"
            className="stem-tick sim-small"
          >
            {num(t)}
          </text>
        </g>
      ))}
      <Label x={618} y={track + 72} anchor="end" small>
        x (m)
      </Label>
      {carts.map((c) => {
        const cx = sx(c.x);
        if (cx < -cart || cx > W + cart) return null;
        const h = 30 + 12 * Math.cbrt(c.m / 10);
        return (
          <g key={c.name}>
            <rect
              x={cx - cart / 2}
              y={track + 22 - h}
              width={cart}
              height={h - 6}
              rx="5"
              className={`stem-body ${c.cls}`}
            />
            <circle cx={cx - cart / 4} cy={track + 18} r="5" className="stem-wheel" />
            <circle cx={cx + cart / 4} cy={track + 18} r="5" className="stem-wheel" />
            <Label x={cx} y={track + 8 - h} anchor="middle" baseline="auto" small>
              {`${num(c.m, 2)} kg`}
            </Label>
            <Arrow
              x1={cx}
              y1={track - 40 - h}
              x2={cx + c.v * kv}
              y2={track - 40 - h}
              tone="velocity"
            />
            <Label x={cx} y={track - 58 - h} anchor="middle" baseline="auto" tone="velocity" small>
              {`${num(c.v, 2)} m/s`}
            </Label>
          </g>
        );
      })}
      {col(14, true)}
      {col(330, false)}
    </Canvas>
  );
}

/* ---------------------------------------------------------------- Orbit */
export function OrbitView({ params, o, solved, time, language, num, font, name }: RendererProps) {
  const p = params as { planetMass: number; radius: number; speed: number };
  const bound = n(solved.kind) !== 2;
  const path = useMemo(() => {
    const count = bound ? 180 : 60;
    return Array.from({ length: count + 1 }, (_, i) => {
      const s = orbit.at(p, (12 * i) / count);
      return [n(s.x), n(s.y), n(s.speed)] as const;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- recompute when a parameter changes
  }, [p.planetMass, p.radius, p.speed, bound]);
  const planetR = 6.371 * Math.cbrt(p.planetMass / 5.97);
  const xs = [...path.map((q) => q[0]), planetR, -planetR],
    ys = [...path.map((q) => q[1]), planetR, -planetR];
  const minX = Math.min(...xs),
    maxX = Math.max(...xs),
    minY = Math.min(...ys),
    maxY = Math.max(...ys);
  const k = Math.min(560 / (maxX - minX || 1), 330 / (maxY - minY || 1));
  const ox = 320 - ((minX + maxX) / 2) * k,
    oy = 205 + ((minY + maxY) / 2) * k;
  const X = (v: number) => ox + v * k,
    Y = (v: number) => oy - v * k;
  const done = Math.min(path.length - 1, Math.floor((time / 12) * (path.length - 1)));
  const trail = [
    ...path.slice(0, done + 1).map((q) => `${X(q[0])},${Y(q[1])}`),
    `${X(n(o.x))},${Y(n(o.y))}`,
  ].join(' ');
  const next = orbit.at(p, time + 0.02);
  const dx = n(next.x) - n(o.x),
    dy = n(next.y) - n(o.y),
    dl = Math.hypot(dx, dy) || 1;
  const vMax = Math.max(...path.map((q) => q[2]), 1e-6);
  const vLen = (n(o.speed) / vMax) * 70;
  const sat = [X(n(o.x)), Y(n(o.y))] as const;
  const rNow = Math.max(n(o.distance), 1e-6);
  const gLen = clamp(55 * (n(solved.periapsis) / rNow) ** 2, 22, 55);
  const crashes = bound && n(solved.periapsis) < planetR;
  const kindName = [
    tr(language, 'Circular orbit', 'বৃত্তাকার কক্ষপথ'),
    tr(language, 'Elliptical orbit', 'উপবৃত্তাকার কক্ষপথ'),
    tr(language, 'Escapes the planet', 'গ্রহ ছেড়ে চলে যায়'),
  ][n(solved.kind)]!;
  const bar = niceStep(200 / k, 1);
  return (
    <Canvas name={name}>
      <circle cx={X(0)} cy={Y(0)} r={Math.max(planetR * k, 4)} className="sim-planet" />
      <polyline points={path.map((q) => `${X(q[0])},${Y(q[1])}`).join(' ')} className="sim-path" />
      <polyline points={trail} className="stem-line" />
      <Arrow
        x1={sat[0]}
        y1={sat[1]}
        x2={sat[0] + ((X(0) - sat[0]) / Math.hypot(X(0) - sat[0], Y(0) - sat[1]) || 0) * gLen}
        y2={sat[1] + ((Y(0) - sat[1]) / Math.hypot(X(0) - sat[0], Y(0) - sat[1]) || 0) * gLen}
        tone="force"
        width={3}
        head={10}
      />
      <Arrow
        x1={sat[0]}
        y1={sat[1]}
        x2={sat[0] + (dx / dl) * vLen}
        y2={sat[1] - (dy / dl) * vLen}
        tone="velocity"
      />
      <circle cx={sat[0]} cy={sat[1]} r="7" className="sim-satellite" />
      <Chip
        x={10}
        y={10}
        font={font}
        tone={bound ? undefined : 'net'}
        lines={[
          kindName,
          `v = ${num(o.speed, 2)} km/s`,
          bound
            ? `T = ${num(solved.periodHours, 2)} h`
            : `${tr(language, 'Escape at', 'মুক্তিবেগ')} ${num(solved.escapeSpeed, 2)} km/s`,
          ...(crashes ? [tr(language, 'Would hit the surface', 'পৃষ্ঠে আঘাত করবে')] : []),
        ]}
      />
      <path d={`M${W - 20 - bar * k} ${H - 22}h${bar * k}`} className="sim-scale-bar" />
      <Label x={W - 20 - (bar * k) / 2} y={H - 38} anchor="middle" baseline="auto" small>
        {`${num(bar)} ×10⁶ m`}
      </Label>
    </Canvas>
  );
}
