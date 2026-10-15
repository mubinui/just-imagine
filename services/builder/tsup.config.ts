import { defineConfig } from 'tsup';
export default defineConfig({
  entry: ['src/main.ts'],
  format: ['esm'],
  platform: 'node',
  target: 'node22',
  splitting: false,
  external: [
    'firebase-admin',
    'ulid',
    /^@opentelemetry\//,
    '@google-cloud/opentelemetry-cloud-trace-exporter',
  ],
  noExternal: [/^@just-imagine\//],
  sourcemap: true,
});
