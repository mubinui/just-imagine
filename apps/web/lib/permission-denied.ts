/**
 * True for Firestore's `permission-denied`: the rules refuse a read, which for a world also
 * happens when its document was never created. It is a developer condition, never child copy.
 */
export function isPermissionDenied(error: unknown): boolean {
  if (typeof error === 'string') return /missing or insufficient permissions/i.test(error);
  if (typeof error !== 'object' || error === null) return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  return (
    code === 'permission-denied' ||
    (typeof message === 'string' && /missing or insufficient permissions/i.test(message))
  );
}
