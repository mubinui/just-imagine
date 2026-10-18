import { defineConfig } from 'vitest/config';
export default defineConfig({
  test: {
    include: process.env['FIRESTORE_EMULATOR_HOST']
      ? ['test/**/*.test.ts']
      : [
          'test/app.test.ts',
          'test/companion.test.ts',
          'test/editions.test.ts',
          'test/school-models.test.ts',
          'test/school-quality.test.ts',
          'test/demo-lesson-quality.test.ts',
          'test/school-grading.test.ts',
          'test/school-chemistry.test.ts',
          'test/transaction.test.ts',
        ],
    environment: 'node',
    fileParallelism: false,
    testTimeout: 60000,
    hookTimeout: 30000,
  },
});
