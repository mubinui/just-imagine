#!/usr/bin/env node
// Grants or revokes the Firebase custom claim `admin: true` that opens /admin and /v1/admin/*.
//
//   node scripts/grant-admin.mjs <email> [--revoke] [--yes] [--project <id>]
//   node scripts/grant-admin.mjs <email> --create --password <pw>   (emulator only)
//
// Uses the Admin SDK with Application Default Credentials, or the Auth emulator when
// FIREBASE_AUTH_EMULATOR_HOST is set. Against a real project it refuses to run without --yes.
// Revoking also revokes refresh tokens, so the api's revocation-checked verification rejects
// tokens minted while the claim was present.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require = createRequire(
  fileURLToPath(new URL('../services/api/package.json', import.meta.url)),
);
const { initializeApp } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');
const { getFirestore } = require('firebase-admin/firestore');

function fail(message) {
  console.error(message);
  process.exit(1);
}
const args = process.argv.slice(2);
const flag = (name) => args.includes(name);
const option = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};
const email = args.find(
  (a, i) => !a.startsWith('--') && !['--project', '--password'].includes(args[i - 1]),
);
if (!email || !email.includes('@'))
  fail(
    'Usage: node scripts/grant-admin.mjs <email> [--revoke] [--yes] [--project <id>] [--create --password <pw>]',
  );

const emulator = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
const projectId =
  option('--project') ??
  process.env.GOOGLE_CLOUD_PROJECT ??
  (emulator ? 'demo-just-imagine' : undefined);
const revoke = flag('--revoke');
if (flag('--create') && !emulator)
  fail('--create only works against the Auth emulator (set FIREBASE_AUTH_EMULATOR_HOST).');
if (!emulator && !flag('--yes'))
  fail(
    `Refusing to ${revoke ? 'revoke' : 'grant'} admin on project ${projectId ?? '(ADC default)'} without --yes. ` +
      'Set FIREBASE_AUTH_EMULATOR_HOST for local work.',
  );

const app = initializeApp(projectId ? { projectId } : {});
const auth = getAuth(app);
let user;
try {
  user = await auth.getUserByEmail(email.toLowerCase());
} catch (error) {
  if (error?.code !== 'auth/user-not-found') throw error;
  if (!flag('--create'))
    fail(`No account for ${email}. Sign up first, or pass --create in the emulator.`);
  const password = option('--password');
  if (!password) fail('--create needs --password <pw>.');
  user = await auth.createUser({ email: email.toLowerCase(), password, emailVerified: true });
  console.log(`created ${user.email} (${user.uid}) in the emulator`);
}

// Admin and parent accounts are kept apart; a parent profile on an admin is flagged loudly.
if (!revoke && (process.env.FIRESTORE_EMULATOR_HOST || !emulator)) {
  const parent = await getFirestore(app).doc(`users/${user.uid}`).get();
  if (parent.exists) {
    if (!emulator)
      fail(`${email} is a parent account. Use a separate operator account for admin access.`);
    console.error(`warning: ${email} is also a parent account; production refuses this.`);
  }
}

const claims = { ...(user.customClaims ?? {}) };
if (revoke) delete claims.admin;
else claims.admin = true;
await auth.setCustomUserClaims(user.uid, Object.keys(claims).length ? claims : null);
if (revoke) await auth.revokeRefreshTokens(user.uid);
console.log(
  `${revoke ? 'revoked' : 'granted'} admin for ${user.email} (${user.uid}) on ${projectId ?? 'default project'}${emulator ? ' [emulator]' : ''}. ` +
    'Sign in again for the change to reach new tokens.',
);
process.exit(0);
