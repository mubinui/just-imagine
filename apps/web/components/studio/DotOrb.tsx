'use client';
import { useEffect, useRef } from 'react';
import { fibonacciSphere, projectPoint, type OrbMode } from './dot-orb';

const POINTS = fibonacciSphere(520);

/** A dotted 3D sphere that turns, breathes while listening and ripples while the friend speaks. */
export function DotOrb({ mode, className }: { mode: OrbMode; className?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);
  useEffect(() => {
    const el = canvas.current;
    const ctx = el?.getContext('2d');
    if (!el || !ctx) return;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    let frame = 0;
    let start = performance.now();
    const draw = (now: number) => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (el.width !== Math.round(w * dpr) || el.height !== Math.round(h * dpr)) {
        el.width = Math.round(w * dpr);
        el.height = Math.round(h * dpr);
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const t = reduce ? 0.8 : (now - start) / 1000;
      const radius = Math.min(w, h) * 0.42;
      const cx = w / 2;
      const cy = h / 2;
      const projected = POINTS.map((p) => projectPoint(p, t, radius, modeRef.current)).sort(
        (a, b) => a.depth - b.depth,
      );
      for (const q of projected) {
        const warm = q.depth > 0.62;
        ctx.globalAlpha = q.alpha;
        ctx.fillStyle = warm ? '#f7d76e' : '#fff9ee';
        ctx.beginPath();
        ctx.arc(cx + q.sx, cy + q.sy, q.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!reduce) frame = requestAnimationFrame(draw);
    };
    start = performance.now();
    frame = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(frame);
  }, []);
  return <canvas ref={canvas} className={className ?? 'dot-orb'} aria-hidden="true" />;
}
