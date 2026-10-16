import type { Section } from './types';

/** Saveable play state. Rendering, voice and DOM measurements stay outside these rules. */
export interface LearningPlayState {
  section: Section;
  cleaned: number[];
  oxygen: number;
  angle: number;
  phaseGoal: number;
  rescued: string[];
  foods: string[];
  dance: number;
  feedback: string;
  complete: boolean;
}
export const OXYGEN_ROUTE = ['heart', 'body', 'heart', 'lungs'] as const;
export const DANCE_SEQUENCE = [0, 2, 1, 3, 2, 0, 3, 1] as const;
export const FOOD_TEAM = ['carrot', 'milk', 'bean', 'rice', 'fruit'] as const;
export const ANIMAL_HOMES: Record<string, string> = {
  cow: 'farm',
  parrot: 'jungle',
  dolphin: 'ocean',
};
export const PLAQUE = Array.from({ length: 24 }, (_, i) => ({
  x: 300 + (i % 6) * 50,
  y: 250 + Math.floor(i / 6) * 22,
}));
export function initialPlay(section: Section): LearningPlayState {
  return {
    section,
    cleaned: [],
    oxygen: 0,
    angle: Math.PI / 2,
    phaseGoal: 0,
    rescued: [],
    foods: [],
    dance: 0,
    feedback: 'start',
    complete: false,
  };
}
export type PlayAction =
  | { type: 'brush'; x: number; y: number }
  | { type: 'oxygen'; target: string }
  | { type: 'moon'; angle: number }
  | { type: 'animal'; animal: string; home: string }
  | { type: 'food'; food: string }
  | { type: 'dance'; pad: number }
  | { type: 'reset' };
const near = (a: number, b: number) =>
  Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b))) < 0.25;
export function moonLight(angle: number): number {
  return (1 + Math.cos(angle)) / 2;
}
export function playReducer(s: LearningPlayState, a: PlayAction): LearningPlayState {
  if (a.type === 'reset') return initialPlay(s.section);
  if (s.complete) return s;
  switch (a.type) {
    case 'brush': {
      if (s.section !== 'hygiene') return s;
      const hit = PLAQUE.flatMap((p, i) => (Math.hypot(p.x - a.x, p.y - a.y) < 27 ? [i] : []));
      const cleaned = [...new Set([...s.cleaned, ...hit])];
      if (cleaned.length === s.cleaned.length) return s;
      return {
        ...s,
        cleaned,
        feedback: cleaned.length === 24 ? 'brush_complete' : 'brush_clean',
        complete: cleaned.length === 24,
      };
    }
    case 'oxygen': {
      if (s.section !== 'body') return s;
      if (a.target !== OXYGEN_ROUTE[s.oxygen]) return { ...s, feedback: 'oxygen_try' };
      const oxygen = s.oxygen + 1;
      return {
        ...s,
        oxygen,
        feedback: ['oxygen_heart', 'oxygen_cells', 'oxygen_return', 'oxygen_lungs'][s.oxygen]!,
        complete: oxygen === 4,
      };
    }
    case 'moon': {
      if (s.section !== 'space') return s;
      const goals = [0, Math.PI, Math.PI / 2];
      const matched = near(a.angle, goals[s.phaseGoal]!);
      return {
        ...s,
        angle: a.angle,
        phaseGoal: s.phaseGoal + (matched ? 1 : 0),
        feedback: matched ? ['moon_full', 'moon_new', 'moon_quarter'][s.phaseGoal]! : s.feedback,
        complete: matched && s.phaseGoal === 2,
      };
    }
    case 'animal': {
      if (s.section !== 'animals' || s.rescued.includes(a.animal)) return s;
      if (ANIMAL_HOMES[a.animal] !== a.home) return { ...s, feedback: 'animal_try_' + a.animal };
      const rescued = [...s.rescued, a.animal];
      return { ...s, rescued, feedback: 'animal_home_' + a.animal, complete: rescued.length === 3 };
    }
    case 'food': {
      if (s.section !== 'food' || s.foods.includes(a.food)) return s;
      const wanted = FOOD_TEAM[s.foods.length];
      if (a.food !== wanted) return { ...s, feedback: 'food_try' };
      const foods = [...s.foods, a.food];
      return { ...s, foods, feedback: 'food_' + a.food, complete: foods.length === 5 };
    }
    case 'dance': {
      if (s.section !== 'exercise') return s;
      if (a.pad !== DANCE_SEQUENCE[s.dance]) return { ...s, feedback: 'dance_try' };
      const dance = s.dance + 1;
      return { ...s, dance, feedback: 'dance_match', complete: dance === DANCE_SEQUENCE.length };
    }
  }
}
