'use client';
import { useEffect, useState } from 'react';
import { buddyFor, fetchLearn, readBuddy, type LearnState } from '../learn/progress';

/**
 * The child's buddy pet (their choice, else their newest pet), kept current across screens.
 * Screens that already hold the child's Learning Worlds state pass it as `known`.
 */
export function usePetBuddy(childId: string | undefined, known?: LearnState) {
  const [fetched, setFetched] = useState<LearnState | undefined>();
  const [chosen, setChosen] = useState<string | undefined>();
  useEffect(() => {
    if (!childId) return;
    let active = true;
    const sync = () => setChosen(readBuddy(childId));
    const frame = requestAnimationFrame(sync);
    window.addEventListener('ji-pet', sync);
    if (!known)
      fetchLearn(childId)
        .then((next) => {
          if (active) setFetched(next);
        })
        .catch(() => {});
    return () => {
      active = false;
      cancelAnimationFrame(frame);
      window.removeEventListener('ji-pet', sync);
    };
  }, [childId, known]);
  const state = known ?? fetched;
  return state ? buddyFor(state, chosen) : undefined;
}
