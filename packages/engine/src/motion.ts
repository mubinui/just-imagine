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
  const turnBlend = 1 - Math.exp(-seconds / 0.09);
  if (!moving) return { ...state, ...at, moving: false, tilt: state.tilt * (1 - turnBlend) };
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
      ? state.tilt +
        (Math.max(-0.55, Math.min(0.55, Math.atan2(dy, Math.abs(dx) || 0.0001))) * facing -
          state.tilt) *
          turnBlend
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

/** Accelerate along legal route legs, braking for a stop or a sharp corner. */
export function advanceTravel(
  at: MotionPoint,
  route: MotionPoint[],
  velocity: number,
  seconds: number,
  speed: number,
) {
  const unchanged = {
    point: { ...at },
    pending: route.map((point) => ({ ...point })),
    velocity: 0,
  };
  if (
    !Number.isFinite(seconds) ||
    seconds <= 0 ||
    seconds > 0.15 ||
    !Number.isFinite(speed) ||
    speed <= 0
  )
    return unchanged;
  // An aligned queue is one continuous journey. A sharp corner is a real stop,
  // rather than a diagonal shortcut or an instantaneous full-speed direction change.
  let stopDistance = 0,
    previous = at,
    heading: MotionPoint | undefined;
  for (const target of route) {
    const dx = target.x - previous.x,
      dy = target.y - previous.y,
      length = Math.hypot(dx, dy);
    if (length > 0.00001) {
      const direction = { x: dx / length, y: dy / length };
      if (heading && heading.x * direction.x + heading.y * direction.y < 0.98) break;
      heading = direction;
      stopDistance += length;
    }
    previous = target;
  }
  const acceleration = speed * 5,
    before = Math.max(0, Math.min(speed, Number.isFinite(velocity) ? velocity : 0)),
    nextVelocity = Math.min(
      speed,
      before + acceleration * seconds,
      Math.sqrt(2 * acceleration * stopDistance),
    ),
    distance = Math.min(stopDistance, (before + nextVelocity) * 0.5 * seconds),
    next = followRoute(at, route, distance);
  return { ...next, velocity: distance >= stopDistance - 0.00001 ? 0 : nextVelocity };
}
