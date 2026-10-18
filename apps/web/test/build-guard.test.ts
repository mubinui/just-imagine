import { afterEach, describe, expect, it, vi } from 'vitest';
import { PHASE_DEVELOPMENT_SERVER, PHASE_PRODUCTION_BUILD } from 'next/constants';
import nextConfig from '../next.config';

afterEach(() => vi.unstubAllEnvs());

describe('production build guard', () => {
  it('refuses a production build in sample mode unless the build opts in', () => {
    vi.stubEnv('NEXT_PUBLIC_FAKE', '1');
    vi.stubEnv('JUST_IMAGINE_SAMPLE_BUILD', '');
    expect(() => nextConfig(PHASE_PRODUCTION_BUILD)).toThrow(/sample mode/);
  });
  it('allows an explicit sample build for CI and the UI demo', () => {
    vi.stubEnv('NEXT_PUBLIC_FAKE', '1');
    vi.stubEnv('JUST_IMAGINE_SAMPLE_BUILD', '1');
    expect(nextConfig(PHASE_PRODUCTION_BUILD).distDir).toBeDefined();
  });
  it('allows a real production build and sample mode in development', () => {
    vi.stubEnv('NEXT_PUBLIC_FAKE', '0');
    expect(() => nextConfig(PHASE_PRODUCTION_BUILD)).not.toThrow();
    vi.stubEnv('NEXT_PUBLIC_FAKE', '1');
    expect(() => nextConfig(PHASE_DEVELOPMENT_SERVER)).not.toThrow();
  });
});
