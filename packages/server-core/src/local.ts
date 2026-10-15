/** Explicitly opt in to local adapters; never activate them in a cloud deployment. */
export function localDevelopment(env: NodeJS.ProcessEnv = process.env): boolean {
  if (env['LOCAL_DEV'] !== '1') return false;
  if (
    env['K_SERVICE'] ||
    !env['GOOGLE_CLOUD_PROJECT']?.startsWith('demo-') ||
    !env['FIRESTORE_EMULATOR_HOST'] ||
    !env['FIREBASE_AUTH_EMULATOR_HOST']
  )
    throw new Error(
      'LOCAL_DEV requires a demo project and both Firebase emulators, outside Cloud Run',
    );
  return true;
}
