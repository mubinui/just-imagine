'use client';
import { useEffect } from 'react';
import { startAppearanceUpdates } from '../lib/appearance';
import { env } from '../lib/env';

/** Public palette only. Configuration errors never block play or replace character art. */
export function AppearanceProvider() {
  useEffect(() => startAppearanceUpdates(env.apiUrl), []);
  return null;
}
