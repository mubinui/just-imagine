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
  if (mouth > 0.06) return reduced ? 3 : mouth > 0.36 ? 4 : 3;
  if (!reduced && (time + offset) % 6200 >= 6000) return 1;
  return 0;
}
export const actorOffset = (id: string) =>
  [...id].reduce((n, c) => (n * 31 + c.charCodeAt(0)) % 5000, 0);

export type SpeechPose = { energy: number; frame: 0 | 3 | 4; silentFor: number; heldFor: number };
export const restingSpeech = (): SpeechPose => ({ energy: 0, frame: 0, silentFor: 0, heldFor: 0 });
export const SPEECH_POSE_DWELL_MS = 180;
export const SPEECH_PHRASE_RELEASE_MS = 180;
/** These atlas cells change the whole body, not just lips. Respond at onset, then hold
 * each gesture and bridge short syllable gaps instead of flickering at the audio rate. */
export function advanceSpeech(state: SpeechPose, input: number, milliseconds: number): SpeechPose {
  const target = Number.isFinite(input) ? Math.max(0, Math.min(1, input)) : 0;
  const dt = Math.max(0, Math.min(100, milliseconds));
  const silentFor = target < 0.035 ? Math.min(10000, state.silentFor + dt) : 0;
  const heldFor = Math.min(10000, state.heldFor + dt);
  const ended = silentFor >= SPEECH_PHRASE_RELEASE_MS;
  const energy = ended
    ? 0
    : state.energy +
      (target - state.energy) * (1 - Math.exp(-dt / (target > state.energy ? 20 : 55)));
  const candidate =
    state.frame === 4
      ? energy > 0.28
        ? 4
        : energy > 0.035
          ? 3
          : 0
      : energy > 0.4
        ? 4
        : energy > (state.frame === 3 ? 0.035 : 0.065)
          ? 3
          : 0;
  const frame = ended
    ? 0
    : state.frame !== 0 && (silentFor > 0 || heldFor < SPEECH_POSE_DWELL_MS)
      ? state.frame
      : candidate;
  return { energy, frame, silentFor, heldFor: frame === state.frame ? heldFor : 0 };
}

export type ToothPose = 'idle' | 'brush' | 'cheer' | 'wave';
/** Original Tooth Town cell indices. Exactly one complete cell is visible at any time. */
export function toothFrame({
  pose = 'idle',
  action = 'idle',
  elapsed,
  mouth = 0,
  reduced = false,
}: {
  pose?: ToothPose;
  action?: string;
  elapsed: number;
  mouth?: number;
  reduced?: boolean;
}): number {
  if (pose === 'cheer' || action === 'cheer') return 6;
  if (pose === 'brush') return reduced ? 4 : 4 + (Math.floor(Math.max(0, elapsed) / 400) % 2);
  if (mouth > 0.06) return 2;
  if (pose === 'wave' || (action === 'wave' && elapsed < 2400)) return 7;
  if (action === 'rest' && elapsed < 2400) return 1;
  if (!reduced && elapsed % 6400 >= 6200) return 1;
  return 0;
}
