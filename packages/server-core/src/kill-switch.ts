import { logEvent } from './telemetry';
import { RuntimeConfigDocSchema, paths } from '@just-imagine/protocol';
import { db } from './firebase';

let lastObserved = false;
function observed(on: boolean) {
  if (on && !lastObserved) logEvent('kill_switch_on', {}, 'WARNING');
  lastObserved = on;
  return on;
}
export async function isKillSwitchOn(): Promise<boolean> {
  try {
    const snap = await db().doc(paths.runtimeConfig()).get();
    if (!snap.exists) return observed(false);
    const parsed = RuntimeConfigDocSchema.safeParse(snap.data());
    return observed(parsed.success ? parsed.data.killSwitch : true);
  } catch {
    return observed(true);
  }
}

export function watchKillSwitch(onChange: (on: boolean) => void): () => void {
  try {
    return db()
      .doc(paths.runtimeConfig())
      .onSnapshot(
        (snap) => {
          if (!snap.exists) {
            onChange(false);
            return;
          }
          const parsed = RuntimeConfigDocSchema.safeParse(snap.data());
          onChange(observed(parsed.success ? parsed.data.killSwitch : true));
        },
        () => onChange(observed(true)),
      );
  } catch {
    onChange(observed(true));
    return () => {};
  }
}
