'use client';
import '../../app/learn.css';
import { useEffect, useRef } from 'react';
import type { Engine } from '@just-imagine/engine';
import { PetArt } from './PetArt';
import { usePetBuddy } from './usePetBuddy';
import { STAGE } from '../learn/geometry';

/**
 * The buddy pet trotting after the hero in an imagined world. It lives in the DOM over the
 * engine canvas and reads the hero's pose each frame, easing a pet-length behind it, so it needs
 * no engine change and never touches the physics. Mount it inside `.stage-world`.
 *
 * TODO(engine owner): when the engine can draw companion sprites, replace this overlay with a
 * non-colliding engine entity so the pet is lit and layered with the world.
 */
export function PetFollower({
  engine,
  childId,
  heroId,
}: {
  engine: React.RefObject<Engine | undefined>;
  childId?: string;
  heroId?: string;
}) {
  const buddy = usePetBuddy(childId);
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!buddy || !heroId) return;
    let frame = 0;
    const at = { x: STAGE.width / 2, y: STAGE.height - 1, facing: 1 };
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const tick = () => {
      const hero = engine.current
        ?.frame()
        .entities.find((p) => p.id === heroId || p.templateId === heroId);
      const el = host.current;
      if (hero && el) {
        const side = hero.vx < -0.2 ? 1 : hero.vx > 0.2 ? -1 : Math.sign(at.x - hero.x) || -1;
        const goal = {
          x: hero.x + side * (hero.width / 2 + 0.6),
          y: hero.y + hero.height / 2 - 0.4,
        };
        const ease = reduce ? 1 : 0.08;
        at.x += (goal.x - at.x) * ease;
        at.y += (goal.y - at.y) * ease;
        at.facing = hero.x < at.x ? -1 : 1;
        el.style.left = `${(at.x / STAGE.width) * 100}%`;
        el.style.top = `${(at.y / STAGE.height) * 100}%`;
        el.style.setProperty('--facing', String(at.facing));
        el.hidden = false;
      } else if (el) el.hidden = true;
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [buddy, heroId, engine]);
  if (!buddy || !heroId) return null;
  return (
    <div ref={host} className="pet-follower" aria-hidden="true" hidden>
      <PetArt id={buddy} />
    </div>
  );
}
