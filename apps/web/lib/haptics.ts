/**
 * Haptic feedback through the Vibration API (Android Chrome). Every call is a
 * no-op where `navigator.vibrate` is missing (iOS, desktop, server) and while
 * the parent or the child has switched haptics off.
 */
export interface VibrationNavigator {
  vibrate?: (pattern: number | number[]) => boolean;
}

export interface Haptics {
  /** One short pulse for a tap or a UI press. Returns whether a pulse was requested. */
  tap(): boolean;
  /** A pulse whose length follows the impact strength, clamped to 0..1. */
  impact(strength: number): boolean;
  /** A short celebratory pattern for discoveries and completed challenges. */
  success(): boolean;
  setEnabled(enabled: boolean): void;
  isEnabled(): boolean;
}

const TAP_MS = 10;
const IMPACT_MIN_MS = 8;
const IMPACT_MAX_MS = 40;
const SUCCESS_PATTERN = [15, 40, 15, 40, 30];

function clamp01(value: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 0;
}

export function createHaptics(
  source: VibrationNavigator | undefined | (() => VibrationNavigator | undefined),
): Haptics {
  let enabled = true;
  const navigatorOf = () => (typeof source === 'function' ? source() : source);
  const vibrate = (pattern: number | number[]) => {
    if (!enabled) return false;
    const nav = navigatorOf();
    if (!nav || typeof nav.vibrate !== 'function') return false;
    try {
      return nav.vibrate(pattern) === true;
    } catch {
      return false;
    }
  };
  return {
    tap: () => vibrate(TAP_MS),
    impact: (strength) =>
      vibrate(Math.round(IMPACT_MIN_MS + clamp01(strength) * (IMPACT_MAX_MS - IMPACT_MIN_MS))),
    success: () => vibrate(SUCCESS_PATTERN),
    setEnabled: (value) => {
      enabled = value;
    },
    isEnabled: () => enabled,
  };
}

/** The app-wide instance; it reads `globalThis.navigator` at call time. */
export const haptics = createHaptics(
  () => (globalThis as { navigator?: VibrationNavigator }).navigator,
);

export const tap = haptics.tap;
export const impact = haptics.impact;
export const success = haptics.success;
export const setEnabled = haptics.setEnabled;
