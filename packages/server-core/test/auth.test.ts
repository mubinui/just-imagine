import { describe, it, expect } from 'vitest';
import { idTokenFor } from './emulator';
import { verifyIdToken, AuthError } from '../src/auth';

describe('verifyIdToken', () => {
  it('returns the uid for a valid emulator token', async () => {
    const token = await idTokenFor('u_test');
    await expect(verifyIdToken(token)).resolves.toEqual({ uid: 'u_test' });
  });
  it('throws AuthError for garbage', async () => {
    await expect(verifyIdToken('not-a-token')).rejects.toBeInstanceOf(AuthError);
  });
});
