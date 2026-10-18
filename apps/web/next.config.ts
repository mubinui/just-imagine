import type { NextConfig } from 'next';
import { PHASE_PRODUCTION_BUILD } from 'next/constants';
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
  // Static art, sound and fonts: browsers keep them a day, a CDN a week, so repeat screens
  // stop revalidating every image. Names are mostly versioned (-v1, -v2); a changed file
  // reaches browsers within a day.
  async headers() {
    return ['characters', 'learn', 'worlds', 'sound', 'music', 'fonts', 'icons', 'patterns'].map(
      (folder) => ({
        source: `/${folder}/:path*`,
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=86400, s-maxage=604800, stale-while-revalidate=604800',
          },
        ],
      }),
    );
  },
};

/**
 * Sample mode (NEXT_PUBLIC_FAKE=1) serves authored sample worlds with no sign-in, voice or payments.
 * It exists for local development, CI browser tests and the UI demo, never for a deployment, so a
 * production build in sample mode fails unless the build opts in with JUST_IMAGINE_SAMPLE_BUILD=1.
 */
export default function nextConfig(phase: string): NextConfig {
  if (
    phase === PHASE_PRODUCTION_BUILD &&
    process.env['NEXT_PUBLIC_FAKE'] === '1' &&
    process.env['JUST_IMAGINE_SAMPLE_BUILD'] !== '1'
  )
    throw new Error(
      'Refusing a production build in sample mode (NEXT_PUBLIC_FAKE=1). Deployments must set ' +
        'NEXT_PUBLIC_FAKE=0. For CI or the UI demo, also set JUST_IMAGINE_SAMPLE_BUILD=1.',
    );
  return config;
}
