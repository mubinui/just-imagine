export interface AvatarPresence {
  energy: number;
  scaleX: number;
  scaleY: number;
  lift: number;
}
const unit = (value: number) => (Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0);

/** A single image can breathe and settle; it cannot invent facial articulation. */
export function avatarPresence(
  previousEnergy: number,
  input: number,
  elapsed: number,
  milliseconds: number,
  reduced = false,
): AvatarPresence {
  if (reduced) return { energy: 0, scaleX: 1, scaleY: 1, lift: 0 };
  const target = unit(input),
    before = unit(previousEnergy);
  // A suspended clock preserves its pose instead of catching up through a gap.
  const dt =
    Number.isFinite(milliseconds) && milliseconds >= 0 && milliseconds <= 150 ? milliseconds : 0;
  const energy = before + (target - before) * (1 - Math.exp(-dt / (target > before ? 30 : 150)));
  const time = Number.isFinite(elapsed) ? Math.max(0, elapsed) : 0;
  const breath = (1 - Math.cos((time * Math.PI * 2) / 4800)) / 2;
  return {
    energy,
    scaleX: 1 - breath * 0.0015,
    scaleY: 1 + breath * 0.004 + energy * 0.002,
    lift: energy * 0.18,
  };
}
