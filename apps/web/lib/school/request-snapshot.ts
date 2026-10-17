/** Each input edit or new request invalidates every older result, including after unmount. */
export function requestSnapshot() {
  let generation = 0;
  return {
    invalidate() {
      generation++;
    },
    begin() {
      const current = ++generation;
      return { isCurrent: () => current === generation };
    },
  };
}

/** A late failure belongs to its old inputs just as a late success does. */
export async function runCurrentRequest<T>(
  snapshot: { isCurrent: () => boolean },
  request: Promise<T>,
  publish: (value: T) => void,
): Promise<void> {
  try {
    const value = await request;
    if (snapshot.isCurrent()) publish(value);
  } catch (error) {
    if (snapshot.isCurrent()) throw error;
  }
}
