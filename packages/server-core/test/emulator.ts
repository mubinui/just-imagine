process.env['FIRESTORE_EMULATOR_HOST'] ??= '127.0.0.1:8080';
process.env['FIREBASE_AUTH_EMULATOR_HOST'] ??= '127.0.0.1:9099';
process.env['GOOGLE_CLOUD_PROJECT'] ??= 'demo-just-imagine';

export const PROJECT = process.env['GOOGLE_CLOUD_PROJECT'];

export async function clearFirestore(): Promise<void> {
  const res = await fetch(
    `http://${process.env['FIRESTORE_EMULATOR_HOST']}/emulator/v1/projects/${PROJECT}/databases/(default)/documents`,
    { method: 'DELETE' },
  );
  if (!res.ok) throw new Error(`clearFirestore failed: ${res.status}`);
}

// Exchanges an Admin custom token for a real ID token through the Auth emulator.
export async function idTokenFor(uid: string): Promise<string> {
  const { adminAuth } = await import('../src/firebase');
  const custom = await adminAuth().createCustomToken(uid);
  const res = await fetch(
    `http://${process.env['FIREBASE_AUTH_EMULATOR_HOST']}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: custom, returnSecureToken: true }),
    },
  );
  const body = (await res.json()) as { idToken?: string };
  if (!body.idToken) throw new Error('no idToken from auth emulator');
  return body.idToken;
}
