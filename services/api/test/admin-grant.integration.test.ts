import { describe, it, expect } from 'vitest';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { adminAuth, db } from '@just-imagine/server-core';
process.env['GOOGLE_CLOUD_PROJECT'] = 'demo-just-imagine';
const script = fileURLToPath(new URL('../../../scripts/grant-admin.mjs', import.meta.url));
const run = (args: string[], env: NodeJS.ProcessEnv = process.env) =>
  spawnSync(process.execPath, [script, ...args], { encoding: 'utf8', env });

describe('scripts/grant-admin.mjs', () => {
  it('grants and revokes the admin claim by email in the emulator', async () => {
    const user = await adminAuth().createUser({ email: 'grant-ops@example.test' });
    await adminAuth().setCustomUserClaims(user.uid, { beta: true });
    const granted = run(['grant-ops@example.test']);
    expect(granted.status, granted.stderr).toBe(0);
    expect(granted.stdout).toContain('granted');
    expect((await adminAuth().getUser(user.uid)).customClaims).toEqual({ beta: true, admin: true });
    const revoked = run(['grant-ops@example.test', '--revoke']);
    expect(revoked.status, revoked.stderr).toBe(0);
    expect(revoked.stdout).toContain('revoked');
    expect((await adminAuth().getUser(user.uid)).customClaims).toEqual({ beta: true });
  });
  it('creates a password account only in the emulator when asked', async () => {
    const created = run(['new-ops@example.test', '--create', '--password', 'Operate!2026']);
    expect(created.status, created.stderr).toBe(0);
    expect((await adminAuth().getUserByEmail('new-ops@example.test')).customClaims).toEqual({
      admin: true,
    });
  });
  it('reports an unknown email and a parent account clearly', async () => {
    const unknown = run(['nobody@example.test']);
    expect(unknown.status).not.toBe(0);
    expect(unknown.stderr).toContain('No account');
    const parent = await adminAuth().createUser({ email: 'grant-parent@example.test' });
    await db().doc(`users/${parent.uid}`).set({ email: 'grant-parent@example.test' });
    const warned = run(['grant-parent@example.test']);
    expect(warned.status).toBe(0);
    expect(warned.stderr).toContain('parent account');
  });
  it('refuses to touch a real project without --yes', () => {
    const env = { ...process.env };
    delete env['FIREBASE_AUTH_EMULATOR_HOST'];
    delete env['FIRESTORE_EMULATOR_HOST'];
    const refused = run(['ops@example.test'], { ...env, GOOGLE_CLOUD_PROJECT: 'real-project' });
    expect(refused.status).not.toBe(0);
    expect(refused.stderr).toContain('--yes');
    const create = run(['ops@example.test', '--create', '--password', 'x', '--yes'], {
      ...env,
      GOOGLE_CLOUD_PROJECT: 'real-project',
    });
    expect(create.status).not.toBe(0);
    expect(create.stderr).toContain('emulator');
  });
});
