import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: ['test/**/*.test.ts'],
    exclude: process.env['FIRESTORE_EMULATOR_HOST'] ? [] : ['**/*.integration.test.ts'],
    environment: 'node',
  },
});
