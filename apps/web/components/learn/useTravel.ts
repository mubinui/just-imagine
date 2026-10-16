'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  advanceMotion,
  followRoute,
  initialMotion,
  type MotionKind,
  type MotionPoint,
} from '@just-imagine/engine/motion';

/** Each valid input visits its destination; completion is committed only on arrival. */
export function useTravel(start: MotionPoint, kind: MotionKind, stride: number, speed: number) {
  const [frame, setFrame] = useState(() => initialMotion(start));
  const current = useRef(frame),
    queue = useRef<{ at: MotionPoint; arrive: () => void }[]>([]);
  const running = useRef(false),
    launch = useRef<() => void>(() => {});
  useEffect(() => {
    let request = 0,
      last = 0,
      velocity = 0;
    const tick = (now: number) => {
      const dt = last ? (now - last) / 1000 : 0;
      last = now;
      if (document.hidden || dt > 0.15) {
        current.current = { ...current.current, moving: false };
        velocity = 0;
      } else if (queue.current.length && dt > 0) {
        const target = queue.current[0]!.at;
        const distance = Math.hypot(target.x - current.current.x, target.y - current.current.y);
        const acceleration = speed * 5;
        const brakingSpeed = Math.sqrt(2 * acceleration * distance);
        velocity = Math.min(speed, velocity + acceleration * dt, brakingSpeed);
        const next = followRoute(
          current.current,
          [target],
          distance < 0.4 ? distance : velocity * dt,
        );
        current.current = advanceMotion(current.current, next.point, dt, {
          kind,
          stride,
          maxSpeed: speed * 1.1,
          planar: true,
        });
        if (!next.pending.length) {
          queue.current.shift()!.arrive();
          velocity = 0;
        }
      } else current.current = { ...current.current, moving: false };
      setFrame({ ...current.current });
      if (queue.current.length) request = requestAnimationFrame(tick);
      else {
        running.current = false;
        current.current = { ...current.current, moving: false };
        setFrame({ ...current.current });
      }
    };
    launch.current = () => {
      if (!running.current) {
        running.current = true;
        last = 0;
        request = requestAnimationFrame(tick);
      }
    };
    return () => {
      cancelAnimationFrame(request);
      queue.current = [];
      running.current = false;
    };
  }, [kind, stride, speed]);
  const enqueue = useCallback((at: MotionPoint, arrive: () => void, replace = false) => {
    if (replace) queue.current = [];
    if (queue.current.length >= 6) return false;
    queue.current.push({ at, arrive });
    launch.current();
    return true;
  }, []);
  return { frame, enqueue };
}
