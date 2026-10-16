import type { StoryGame } from '@just-imagine/learning-content/play';

/** The renderer never owns completion. Inputs are validated against this chapter's rules. */
export interface AdventureState {
  placed: number[];
  step: number;
  position: number;
  collected: number[];
  value: number;
  milliseconds: number;
  coverPhase: 'cover' | 'bin';
  complete: boolean;
  feedback: 'start' | 'try' | 'progress' | 'complete';
}
export type AdventureAction =
  | { type: 'blocked' }
  | { type: 'place'; piece: number; slot: number }
  | { type: 'route'; node: number }
  | { type: 'walk'; cell: number }
  | { type: 'adjust'; value: number }
  | { type: 'memory'; pad: number }
  | { type: 'tick'; milliseconds: number; holding: boolean; zone: number }
  | { type: 'cover'; target: 'cover' | 'bin' }
  | { type: 'reset' };
export function initialAdventure(game: StoryGame): AdventureState {
  return {
    placed: [],
    step: 0,
    position: game.kind === 'trail' ? game.start : 0,
    collected: [],
    value:
      game.kind === 'adjust' && game.mode !== 'distance' && game.mode !== 'blanket'
        ? -Math.PI
        : 0.5,
    milliseconds: 0,
    coverPhase: 'cover',
    complete: false,
    feedback: 'start',
  };
}
export function targetCount(game: StoryGame): number {
  switch (game.kind) {
    case 'classic':
      return 1;
    case 'assemble':
      return game.pieces;
    case 'route':
      return game.nodes.length - 1;
    case 'trail':
      return game.collect.length + 1;
    case 'adjust':
      return game.goals.length;
    case 'memory':
      return game.sequence.length;
    case 'hold':
      return game.milliseconds;
    case 'cover':
      return game.rounds * 2;
  }
}
export function adventureProgress(game: StoryGame, s: AdventureState): number {
  switch (game.kind) {
    case 'assemble':
      return s.placed.length;
    case 'trail':
      return s.collected.length + (s.complete ? 1 : 0);
    case 'hold':
      return s.milliseconds;
    case 'cover':
      return s.step * 2 + (s.coverPhase === 'bin' ? 1 : 0);
    default:
      return s.step;
  }
}
const angular = (a: number, b: number) => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));
export function adventureReducer(
  game: StoryGame,
  s: AdventureState,
  a: AdventureAction,
): AdventureState {
  if (a.type === 'reset') return initialAdventure(game);
  if (s.complete) return s;
  const retry = () => (s.feedback === 'try' ? s : { ...s, feedback: 'try' as const });
  if (a.type === 'blocked') return retry();
  const advance = (patch: Partial<AdventureState>, complete = false) => ({
    ...s,
    ...patch,
    complete,
    feedback: complete ? ('complete' as const) : ('progress' as const),
  });
  switch (a.type) {
    case 'place': {
      if (
        game.kind !== 'assemble' ||
        !Number.isInteger(a.piece) ||
        a.piece < 0 ||
        a.piece >= game.pieces ||
        s.placed.includes(a.piece)
      )
        return s;
      if (a.slot !== a.piece) return retry();
      const placed = [...s.placed, a.piece];
      return advance({ placed }, placed.length === game.pieces);
    }
    case 'route': {
      if (game.kind !== 'route') return s;
      if (a.node !== s.step + 1) return retry();
      const step = s.step + 1;
      return advance({ step }, step === game.nodes.length - 1);
    }
    case 'walk': {
      if (
        game.kind !== 'trail' ||
        !Number.isInteger(a.cell) ||
        a.cell < 0 ||
        a.cell >= game.columns * game.rows
      )
        return s;
      const distance =
        Math.abs((a.cell % game.columns) - (s.position % game.columns)) +
        Math.abs(Math.floor(a.cell / game.columns) - Math.floor(s.position / game.columns));
      if (distance !== 1 || game.blocked.includes(a.cell)) return retry();
      const collected =
        game.collect.includes(a.cell) && !s.collected.includes(a.cell)
          ? [...s.collected, a.cell]
          : s.collected;
      return advance(
        { position: a.cell, collected },
        a.cell === game.exit && collected.length === game.collect.length,
      );
    }
    case 'adjust': {
      if (game.kind !== 'adjust' || !Number.isFinite(a.value)) return s;
      const linear = game.mode === 'blanket' || game.mode === 'distance';
      const value = linear
        ? Math.max(0, Math.min(1, a.value))
        : Math.atan2(Math.sin(a.value), Math.cos(a.value));
      const goal = game.goals[s.step]!;
      const matched =
        (linear ? Math.abs(value - goal) : angular(value, goal)) <= (linear ? 0.045 : 0.11);
      const step = s.step + (matched ? 1 : 0);
      return {
        ...s,
        value,
        step,
        complete: step === game.goals.length,
        feedback: matched ? (step === game.goals.length ? 'complete' : 'progress') : s.feedback,
      };
    }
    case 'memory': {
      if (
        game.kind !== 'memory' ||
        !Number.isInteger(a.pad) ||
        a.pad < 0 ||
        a.pad >= game.choices.length
      )
        return s;
      // A wrong note restarts the phrase, so order actually matters.
      if (a.pad !== game.sequence[s.step]) return { ...s, step: 0, feedback: 'try' };
      const step = s.step + 1;
      return advance({ step }, step === game.sequence.length);
    }
    case 'tick': {
      if (game.kind !== 'hold' || !Number.isFinite(a.milliseconds) || a.milliseconds <= 0) return s;
      const duration = Math.min(250, a.milliseconds);
      const quarter = Math.min(3, Math.floor(s.milliseconds / (game.milliseconds / 4)));
      const active =
        game.mode === 'wash'
          ? a.holding && a.zone === quarter
          : game.mode === 'breathe'
            ? a.holding === (quarter % 2 === 0)
            : a.holding;
      if (!active) return s;
      const milliseconds = Math.min(game.milliseconds, s.milliseconds + duration);
      return advance({ milliseconds }, milliseconds === game.milliseconds);
    }
    case 'cover': {
      if (game.kind !== 'cover') return s;
      if (a.target !== s.coverPhase) return retry();
      if (a.target === 'cover') return advance({ coverPhase: 'bin' });
      const step = s.step + 1;
      return advance({ step, coverPhase: 'cover' }, step === game.rounds);
    }
  }
}
