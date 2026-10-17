export const env = {
  characterAssetBaseUrl: process.env.NEXT_PUBLIC_CHARACTER_ASSET_BASE_URL || '',
  fake: process.env.NEXT_PUBLIC_FAKE === '1',
  gatewayUrl: process.env.NEXT_PUBLIC_GATEWAY_URL || 'ws://127.0.0.1:8787',
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081',
  emulators: process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === '1',
  /** Local emulator ports; an isolated test stack can run beside the persistent demo one. */
  authEmulatorPort: Number(process.env.NEXT_PUBLIC_FIREBASE_AUTH_EMULATOR_PORT) || 9099,
  firestoreEmulatorPort: Number(process.env.NEXT_PUBLIC_FIRESTORE_EMULATOR_PORT) || 8080,
};
