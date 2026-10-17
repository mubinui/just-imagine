'use client';
import { useLanguage } from '../lib/i18n';
import { copy as uiText } from '../lib/i18n/ui';

import { useEffect, useRef, useState } from 'react';

const gravity = { earth: 9.81, moon: 1.62 } as const;

/** A small gravity experiment: equal drop height and restitution, different acceleration. */
export function GravityPlayground() {
  useLanguage();
  const [planet, setPlanet] = useState<'earth' | 'moon'>('earth');
  const [drop, setDrop] = useState(0);
  const [moving, setMoving] = useState(false);
  const ball = useRef<SVGGElement>(null);
  const shadow = useRef<SVGEllipseElement>(null);
  const frame = useRef(0);

  useEffect(() => {
    let y = 110;
    let velocity = 0;
    let previous = 0;
    let elapsed = 0;
    const paint = () => {
      ball.current?.setAttribute('transform', `translate(270 ${y})`);
      shadow.current?.setAttribute('rx', String(15 + (y / 380) * 20));
      shadow.current?.setAttribute('opacity', String(0.08 + (y / 380) * 0.12));
    };
    paint();
    if (!drop) return;
    const animate = (time: number) => {
      const dt = previous ? Math.min((time - previous) / 1000, 1 / 30) : 0;
      previous = time;
      elapsed += dt;
      velocity += gravity[planet] * 48 * dt;
      y += velocity * dt;
      if (y > 356) {
        y = 356;
        velocity = -velocity * 0.72;
      }
      paint();
      if ((Math.abs(velocity) < 7 && y >= 355) || elapsed > 16) {
        setMoving(false);
        return;
      }
      frame.current = requestAnimationFrame(animate);
    };
    frame.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(frame.current);
  }, [drop, planet]);

  function release(next = planet) {
    setPlanet(next);
    setMoving(true);
    setDrop((value) => value + 1);
  }

  return (
    <section className="gravity-playground" aria-label={uiText('Try a gravity experiment')}>
      <div className="gravity-heading">
        <span>{uiText('What if gravity changed?')}</span>
        <span className="experiment-live">
          <i aria-hidden="true" /> {uiText('Try it here')}
        </span>
      </div>
      <div className="gravity-scene" data-planet={planet}>
        <svg
          viewBox="0 0 520 430"
          role="img"
          aria-label={uiText(
            planet === 'earth'
              ? 'A ball bouncing under Earth’s gravity'
              : 'A ball bouncing under the Moon’s gravity',
          )}
        >
          <circle className="gravity-orbit" cx="270" cy="230" r="185" />
          <circle className="gravity-orbit" cx="270" cy="230" r="145" />
          <circle className="gravity-sun" cx="416" cy="90" r="34" />
          <circle className="gravity-moon-detail" cx="408" cy="81" r="9" />
          <circle className="gravity-moon-detail" cx="431" cy="98" r="6" />
          <path className="gravity-guide" d="M270 110V378" />
          <path className="gravity-floor" d="M0 393 Q150 365 260 380 Q415 399 520 368 V430 H0Z" />
          <path className="gravity-ground-line" d="M205 379H335" />
          <ellipse
            ref={shadow}
            cx="270"
            cy="383"
            rx="24"
            ry="6"
            fill="currentColor"
            opacity=".15"
          />
          <g ref={ball} transform="translate(270 110)" className="gravity-ball">
            <circle r="23" fill="currentColor" />
            <path
              d="M-12 -12Q-3 -20 7 -15"
              fill="none"
              stroke="var(--surface)"
              strokeWidth="4"
              strokeLinecap="round"
            />
          </g>
          <g className="gravity-height" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M120 110V378M113 110H127M113 378H127" />
          </g>
          <text x="97" y="246" className="gravity-height-label" transform="rotate(-90 97 246)">
            {uiText('Same drop. Different gravity.')}
          </text>
        </svg>
        <div className="gravity-reading" aria-live="polite">
          <strong>{planet === 'earth' ? uiText('Earth') : uiText('The Moon')}</strong>
          <span>{gravity[planet]} m/s²</span>
        </div>
      </div>
      <div className="gravity-tools">
        <div className="planet-switch" role="group" aria-label={uiText('Choose gravity')}>
          <button aria-pressed={planet === 'earth'} onClick={() => release('earth')}>
            {uiText('Earth')}
          </button>
          <button aria-pressed={planet === 'moon'} onClick={() => release('moon')}>
            {uiText('Moon')}
          </button>
        </div>
        <button className="gravity-drop" onClick={() => release()}>
          {moving || drop ? uiText('Drop again') : uiText('Drop the ball')}
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            aria-hidden="true"
          >
            <path d="M12 4v16m-6-6 6 6 6-6" />
          </svg>
        </button>
      </div>
      <p className="gravity-note">{uiText('One small change. A whole new “what if?”')}</p>
    </section>
  );
}
