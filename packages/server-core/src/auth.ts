import { adminAuth } from './firebase';

export class AuthError extends Error {
  readonly code = 'UNAUTHENTICATED' as const;
  constructor(message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export async function verifyIdToken(idToken: string): Promise<{ uid: string }> {
  try {
    const decoded = await adminAuth().verifyIdToken(idToken, true);
    return { uid: decoded.uid };
  } catch (e) {
    throw new AuthError(e instanceof Error ? e.message : 'invalid token');
  }
}
