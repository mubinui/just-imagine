import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: process.env['FIRESTORE_EMULATOR_HOST'] ? [] : ['test/*.integration.test.ts'],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 60000,
    hookTimeout: 30000,
  },
});
