import type { GameFailureDiagnostic } from './game-diagnostics';

/** One candidate's verdict: a validated value, or why it failed and the programme it tried. */
export type Candidate<T> =
  | { ok: true; value: T }
  | { ok: false; failure: string; diagnostic: GameFailureDiagnostic; source?: string };

/**
 * Starts `count` candidates at once, each with its own abort signal. Validation belongs
 * inside `make`, so the first candidate that resolves `ok` wins: the race resolves with it
 * and aborts every other candidate. When none passes, it resolves with every failure in
 * index order. A candidate that rejects counts as a failure; the race itself never rejects.
 */
export async function raceCandidates<T>(
  count: number,
  make: (signal: AbortSignal, index: number) => Promise<Candidate<T>>,
): Promise<Candidate<T> | Candidate<T>[]> {
  if (count <= 0) return [];
  const controllers = Array.from({ length: count }, () => new AbortController());
  return new Promise((resolve) => {
    const failures: Candidate<T>[] = [];
    let pending = count;
    let settled = false;
    const finish = (index: number, candidate: Candidate<T>) => {
      if (settled) return;
      if (candidate.ok) {
        settled = true;
        controllers.forEach((controller, other) => {
          if (other !== index) controller.abort();
        });
        resolve({ ok: true, value: candidate.value });
        return;
      }
      failures[index] = candidate;
      if (--pending === 0) {
        settled = true;
        resolve(failures);
      }
    };
    controllers.forEach((controller, index) => {
      Promise.resolve()
        .then(() => make(controller.signal, index))
        .then(
          (candidate) => finish(index, candidate),
          (error: unknown) =>
            finish(index, {
              ok: false,
              failure: error instanceof Error ? error.message : String(error),
              diagnostic: { code: 'SCRIPT_OUTPUT' },
            }),
        );
    });
  });
}
