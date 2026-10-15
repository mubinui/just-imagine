import next from 'eslint-config-next/core-web-vitals';
const config = [
  ...next,
  { ignores: ['.next/**', 'next-env.d.ts', 'playwright-report/**', 'test-results/**'] },
];

export default config;
