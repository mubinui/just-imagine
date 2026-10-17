/** What the console says when the api cannot be reached at all. */
export const NETWORK_MESSAGE =
  'The console cannot reach the api right now. Check the connection, then retry.';

/** A fetch that never got an answer: browsers reject it with a TypeError and no status. */
export function isNetworkFailure(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return (
    error instanceof TypeError ||
    /failed to fetch|load failed|networkerror|network request failed/i.test(error.message)
  );
}
