/**
 * The Firestore emulator ends the losing side of two contending transactions by answering its next
 * request with INVALID_ARGUMENT "Transaction is invalid or closed", which the SDK does not retry.
 * Production Firestore reports ABORTED instead, which the SDK already retries. A closed transaction
 * committed nothing, so running it again from the start is safe.
 */
const ATTEMPTS = 3;

function isClosedTransaction(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const code = (error as { code?: unknown }).code;
  return code === 3 && /Transaction is invalid or closed/i.test(error.message);
}

export async function retryClosedTransaction<T>(run: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await run();
    } catch (error) {
      if (attempt >= ATTEMPTS || !isClosedTransaction(error)) throw error;
    }
  }
}
