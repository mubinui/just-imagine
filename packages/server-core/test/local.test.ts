import { expect, it } from 'vitest';
import { localDevelopment } from '../src/local';
it('requires explicit demo project and both emulators for local adapters', () => {
  expect(localDevelopment({})).toBe(false);
  const env = {
    LOCAL_DEV: '1',
    GOOGLE_CLOUD_PROJECT: 'demo-local',
    FIRESTORE_EMULATOR_HOST: 'localhost:8080',
    FIREBASE_AUTH_EMULATOR_HOST: 'localhost:9099',
  };
  expect(localDevelopment(env)).toBe(true);
  for (const overrides of [
    { K_SERVICE: 'production' },
    { GOOGLE_CLOUD_PROJECT: 'real-project' },
    { FIRESTORE_EMULATOR_HOST: '' },
    { FIREBASE_AUTH_EMULATOR_HOST: '' },
  ])
    expect(() => localDevelopment({ ...env, ...overrides })).toThrow('LOCAL_DEV');
});
