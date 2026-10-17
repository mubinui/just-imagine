'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  advanceMotion,
  advanceTravel,
  initialMotion,
  type MotionKind,
  type MotionPoint,
  type MotionState,
} from '@just-imagine/engine/motion';

export type MotionSubscription = (listener: (frame: MotionState) => void) => () => void;

/** Each valid input visits its destination; completion is committed only on arrival. */
export function useTravel(start: MotionPoint, kind: MotionKind, stride: number, speed: number) {
  const [frame, setFrame] = useState(() => initialMotion(start));
  const [arrival, setArrival] = useState(0);
  const listeners = useRef(new Set<(frame: MotionState) => void>());
  const current = useRef({ ...frame }),
    queue = useRef<{ at: MotionPoint; arrive: () => void }[]>([]);
  const running = useRef(false),
    launch = useRef<() => void>(() => {});
  useEffect(() => {
    let request = 0,
      last = 0,
      velocity = 0;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const publish = (next: MotionState) => {
      current.current = next;
      for (const listener of listeners.current) listener(current.current);
    };
    const completeReduced = () => {
      const pending = queue.current.splice(0);
      const destination = pending.at(-1)?.at;
      if (destination) publish({ ...current.current, ...destination, moving: false, tilt: 0 });
      for (const item of pending) item.arrive();
      if (pending.length) {
        setFrame({ ...current.current });
        setArrival((count) => count + 1);
      }
      velocity = 0;
      running.current = false;
    };
    const tick = (now: number) => {
      const dt = last ? (now - last) / 1000 : 0;
      last = now;
      if (preference.matches) {
        completeReduced();
        return;
      }
      if (document.hidden || dt > 0.15) {
        publish({ ...current.current, moving: false });
        velocity = 0;
      } else if (queue.current.length && dt > 0) {
        const next = advanceTravel(
          current.current,
          queue.current.map((item) => item.at),
          velocity,
          dt,
          speed,
        );
        velocity = next.velocity;
        const arrived = queue.current.length - next.pending.length;
        const pose = advanceMotion(current.current, next.point, dt, {
          kind,
          stride,
          maxSpeed: speed * 1.1,
          planar: true,
        });
        if (!next.pending.length) pose.moving = false;
        publish(pose);
        for (const item of queue.current.splice(0, arrived)) item.arrive();
        if (arrived) {
          setFrame({ ...current.current });
          setArrival((count) => count + 1);
        }
      } else if (dt > 0)
        publish(advanceMotion(current.current, current.current, dt, { kind, stride }));
      if (queue.current.length || (!document.hidden && Math.abs(current.current.tilt) > 0.001))
        request = requestAnimationFrame(tick);
      else {
        running.current = false;
        publish({ ...current.current, moving: false, tilt: 0 });
      }
    };
    launch.current = () => {
      if (preference.matches) {
        completeReduced();
        return;
      }
      if (!running.current) {
        running.current = true;
        last = 0;
        request = requestAnimationFrame(tick);
      }
    };
    const changed = () => {
      if (!preference.matches) return;
      cancelAnimationFrame(request);
      completeReduced();
    };
    preference.addEventListener('change', changed);
    return () => {
      cancelAnimationFrame(request);
      preference.removeEventListener('change', changed);
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
  const subscribe = useCallback<MotionSubscription>((listener) => {
    listeners.current.add(listener);
    listener(current.current);
    return () => {
      listeners.current.delete(listener);
    };
  }, []);
  const getFrame = useCallback(() => current.current, []);
  return { frame, enqueue, subscribe, arrival, getFrame };
}
