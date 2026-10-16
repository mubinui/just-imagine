import {
  LEARN_ROUTES,
  LearnSummaryResponseSchema,
  type LearnSummaryResponse,
  type ServerMessage,
} from '@just-imagine/protocol';

/** The child's Learning Worlds standing as the browser shows it. The gateway owns the totals. */
export interface LearnState {
  points: number;
  pets: string[];
  progress: Record<string, string[]>;
}

/**
 * The local preview's sample explorer has already answered three Space challenges (6 points),
 * so one more right answer from Saturn reaches the first pet's 10-point threshold. The fake
 * gateway starts from the same 6 points (packages/fixtures/scenarios/jelly-dragon.json).
 */
export const DEMO_LEARN: LearnState = Object.freeze({
  points: 6,
  pets: [],
  progress: { space: ['ch_planet_count', 'ch_red_planet', 'ch_rings'] },
}) as LearnState;

type Points = Omit<Extract<ServerMessage, { type: 'points' }>, 'type'>;

export function applyPoints(state: LearnState, packId: string, points: Points): LearnState {
  const done = state.progress[packId] ?? [];
  return {
    ...state,
    points: points.total,
    progress: {
      ...state.progress,
      [packId]: done.includes(points.reason) ? done : [...done, points.reason],
    },
  };
}

export function applyPet(state: LearnState, petId: string): LearnState {
  return state.pets.includes(petId) ? state : { ...state, pets: [...state.pets, petId] };
}

export function doneIn(state: LearnState, challengeIds: readonly string[]): number {
  const done = new Set(Object.values(state.progress).flat());
  return challengeIds.filter((id) => done.has(id)).length;
}

/** The pet that walks with the child: their choice if they own it, else the newest pet. */
export function buddyFor(state: LearnState, chosen: string | undefined): string | undefined {
  if (chosen && state.pets.includes(chosen)) return chosen;
  return state.pets.at(-1);
}

export function fromSummary(summary: LearnSummaryResponse): LearnState {
  return {
    points: summary.points,
    pets: summary.pets,
    progress: Object.fromEntries(summary.progress.map((p) => [p.packId, p.challengesDone])),
  };
}

function storage(): Storage | undefined {
  try {
    return typeof localStorage === 'undefined' ? undefined : localStorage;
  } catch {
    return undefined;
  }
}

export function readDemoLearn(childId: string): LearnState {
  try {
    const raw = storage()?.getItem(`ji-learn:${childId}`);
    if (!raw) return structuredClone(DEMO_LEARN);
    const parsed = JSON.parse(raw) as LearnState;
    if (typeof parsed.points !== 'number' || !Array.isArray(parsed.pets)) throw new Error();
    return { points: parsed.points, pets: parsed.pets, progress: parsed.progress ?? {} };
  } catch {
    return structuredClone(DEMO_LEARN);
  }
}

export function writeDemoLearn(childId: string, state: LearnState) {
  try {
    storage()?.setItem(`ji-learn:${childId}`, JSON.stringify(state));
  } catch {
    /* Storage can be full or blocked; the preview simply forgets. */
  }
}

export function readBuddy(childId: string): string | undefined {
  try {
    return storage()?.getItem(`ji-pet:${childId}`) ?? undefined;
  } catch {
    return undefined;
  }
}

export function writeBuddy(childId: string, petId: string) {
  try {
    storage()?.setItem(`ji-pet:${childId}`, petId);
    window.dispatchEvent(new Event('ji-pet'));
  } catch {
    /* A per-device convenience; nothing to recover. */
  }
}

/** Reads points, pets and progress: from the api, or from the preview's browser storage. */
export async function fetchLearn(childId: string): Promise<LearnState> {
  const [{ env }, { currentIdToken }, { fillPath }] = await Promise.all([
    import('../../lib/env'),
    import('../../lib/firebase'),
    import('../../lib/helpers'),
  ]);
  if (env.fake) return readDemoLearn(childId);
  const response = await fetch(env.apiUrl + fillPath(LEARN_ROUTES.summary.path, { childId }), {
    headers: { Authorization: `Bearer ${await currentIdToken()}` },
  });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);
  return fromSummary(LearnSummaryResponseSchema.parse(await response.json()));
}
