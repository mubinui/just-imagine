export const env = {
  characterAssetBaseUrl: process.env.NEXT_PUBLIC_CHARACTER_ASSET_BASE_URL || '',
  fake: process.env.NEXT_PUBLIC_FAKE === '1',
  gatewayUrl: process.env.NEXT_PUBLIC_GATEWAY_URL || 'ws://127.0.0.1:8787',
  apiUrl: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8081',
  emulators: process.env.NEXT_PUBLIC_FIREBASE_EMULATOR === '1',
};
