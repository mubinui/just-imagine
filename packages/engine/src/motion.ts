/** Presentation follows travelled distance. It never moves the physics body. */
export type MotionKind = 'walk' | 'run' | 'swim' | 'fly' | 'roll';
export type MotionPoint = { x: number; y: number };
export type MotionState = MotionPoint & {
  phase: number;
  distance: number;
  signedDistance: number;
  facing: 1 | -1;
  moving: boolean;
  tilt: number;
};
export function initialMotion(at: MotionPoint): MotionState {
  return { ...at, phase: 0, distance: 0, signedDistance: 0, facing: 1, moving: false, tilt: 0 };
}
export function advanceMotion(
  state: MotionState,
  at: MotionPoint,
  seconds: number,
  options: { kind: MotionKind; stride: number; maxSpeed?: number; planar?: boolean },
): MotionState {
  const dx = at.x - state.x,
    dy = at.y - state.y;
  const travel = Math.hypot(dx, dy);
  // Reset, teleport, hidden-tab gaps and drag jumps must not spin through many cycles.
  if (
    !Number.isFinite(travel) ||
    seconds <= 0 ||
    seconds > 0.15 ||
    travel > (options.maxSpeed ?? 30) * seconds + 0.01
  )
    return { ...state, ...at, moving: false, tilt: 0 };
  const moving = travel > Math.max(0.00001, seconds * 0.015);
  if (!moving) return { ...state, ...at, moving: false, tilt: 0 };
  const facing = Math.abs(dx) > 0.0001 ? (dx < 0 ? -1 : 1) : state.facing;
  // Runners retain contact during falls/jumps: vertical displacement isn't a footstep.
  const cycleTravel =
    !options.planar && (options.kind === 'walk' || options.kind === 'run') ? Math.abs(dx) : travel;
  const swimming = options.kind === 'swim' || options.kind === 'fly';
  return {
    ...at,
    distance: state.distance + cycleTravel,
    signedDistance: state.signedDistance + travel * facing,
    phase: (state.phase + cycleTravel / Math.max(0.01, options.stride)) % 1,
    facing,
    moving: cycleTravel > 0.00001,
    tilt: swimming
      ? Math.max(-0.55, Math.min(0.55, Math.atan2(dy, Math.abs(dx) || 0.0001))) * facing
      : 0,
  };
}
export function motionFrame(state: MotionState, frames: number): number {
  return state.moving ? Math.min(frames - 1, Math.floor(state.phase * frames)) : 0;
}
/** No-slip wheel rotation, in radians. Reversing travel reverses the wheels. */
export function wheelAngle(state: MotionState, radius: number): number {
  return state.signedDistance / Math.max(0.001, radius);
}

/** A constant-speed route follower; queued corners are visited, never cut diagonally. */
export function followRoute(at: MotionPoint, route: MotionPoint[], distance: number) {
  const pending = route.map((p) => ({ ...p }));
  let point = { ...at },
    remaining = Math.max(0, distance);
  while (
    pending.length &&
    (remaining > 0 || Math.hypot(pending[0]!.x - point.x, pending[0]!.y - point.y) < 0.00001)
  ) {
    const target = pending[0]!,
      dx = target.x - point.x,
      dy = target.y - point.y;
    const length = Math.hypot(dx, dy);
    if (length <= Math.max(remaining, 0.00001)) {
      point = pending.shift()!;
      remaining = Math.max(0, remaining - length);
    } else {
      point = { x: point.x + (dx / length) * remaining, y: point.y + (dy / length) * remaining };
      remaining = 0;
    }
  }
  return { point, pending };
}
