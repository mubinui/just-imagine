import type { NextConfig } from 'next';
const config: NextConfig = {
  // Lets a second build (for example an isolated end-to-end run) use its own output directory.
  distDir: process.env['NEXT_DIST_DIR'] || '.next',
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  transpilePackages: [
    '@just-imagine/protocol',
    '@just-imagine/scene-schema',
    '@just-imagine/fixtures',
    '@just-imagine/engine',
    '@just-imagine/game-runtime',
    '@just-imagine/characters',
    '@just-imagine/learning-content',
    '@just-imagine/server-core',
  ],
  serverExternalPackages: ['firebase-admin'],
};
export default config;
