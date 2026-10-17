'use client';
import { useEffect, useRef } from 'react';
import { advanceOrb, fibonacciSphere, projectMotion, restingOrb, type OrbMode } from './dot-orb';

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
    let motion = restingOrb(modeRef.current);
    let last = 0;
    let warmColour = '#f7d76e',
      lightColour = '#fff9ee';
    const paletteChanged = () => {
      const style = getComputedStyle(el);
      warmColour = style.getPropertyValue('--yellow').trim() || warmColour;
      lightColour = style.getPropertyValue('--ground').trim() || lightColour;
      if (reduce) frame = requestAnimationFrame(draw);
    };
    const observer = new MutationObserver(paletteChanged);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] });
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
      // Motion eases between modes, so speech flickering in and out never jolts the orb.
      motion = reduce
        ? { ...restingOrb(modeRef.current), time: 0.8 }
        : advanceOrb(motion, modeRef.current, last ? now - last : 0);
      last = now;
      const radius = Math.min(w, h) * 0.42;
      const cx = w / 2;
      const cy = h / 2;
      const projected = POINTS.map((p) => projectMotion(p, motion, radius)).sort(
        (a, b) => a.depth - b.depth,
      );
      for (const q of projected) {
        const warm = q.depth > 0.62;
        ctx.globalAlpha = q.alpha;
        ctx.fillStyle = warm ? warmColour : lightColour;
        ctx.beginPath();
        ctx.arc(cx + q.sx, cy + q.sy, q.size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      if (!reduce) frame = requestAnimationFrame(draw);
    };
    paletteChanged();
    frame = requestAnimationFrame(draw);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, []);
  return <canvas ref={canvas} className={className ?? 'dot-orb'} aria-hidden="true" />;
}
