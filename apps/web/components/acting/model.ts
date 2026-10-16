export type ActingAction =
  'idle' | 'listen' | 'wave' | 'dance' | 'bounce' | 'rest' | 'cheer' | 'swim' | 'spin';
/** Discrete, single-pose acting: no superimposed faces and no unbounded action loops. */
export function actingFrame({
  elapsed,
  action = 'idle',
  mouth = 0,
  reduced = false,
  offset = 0,
}: {
  elapsed: number;
  action?: string;
  mouth?: number;
  reduced?: boolean;
  offset?: number;
}) {
  const time = Math.max(0, elapsed);
  if (action === 'still') return 0;
  if (action === 'cheer') return 7;
  if (action !== 'idle' && time < 2400) {
    if (action === 'listen') return 2;
    if (action === 'rest') return 1;
    if (reduced) return action === 'wave' ? 6 : 7;
    if (action === 'wave') return [0, 5, 6, 5, 6, 5, 0][Math.min(6, Math.floor(time / 220))]!;
    if (action === 'dance' || action === 'bounce')
      return [0, 5, 7, 6, 7, 5, 0][Math.min(6, Math.floor(time / 280))]!;
    if (action === 'swim') return 6; // Aquatic locomotion is rendered by its dedicated cycle.
  }
  if (mouth > 0.06) return mouth > 0.36 ? 4 : 3;
  if (!reduced && (time + offset) % 6200 >= 6000) return 1;
  return 0;
}
export const actorOffset = (id: string) =>
  [...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 5000, 0);
