import type { NextConfig } from 'next';
const config: NextConfig = {
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  transpilePackages: [
    '@just-imagine/protocol',
    '@just-imagine/scene-schema',
    '@just-imagine/fixtures',
    '@just-imagine/engine',
    '@just-imagine/characters',
    '@just-imagine/server-core',
  ],
  serverExternalPackages: ['firebase-admin'],
};
export default config;
