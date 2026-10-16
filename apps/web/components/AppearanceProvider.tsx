'use client';
import { useEffect } from 'react';
import { AppearanceSchema } from '@just-imagine/protocol';
import { applyAppearance } from '../lib/appearance';
import { env } from '../lib/env';

/** Public palette only. Configuration errors never block play or replace character art. */
export function AppearanceProvider() {
  useEffect(() => {
    let active = true,
      request: AbortController | undefined;
    try {
      const cached = AppearanceSchema.safeParse(
        JSON.parse(localStorage.getItem('ji-appearance') ?? 'null'),
      );
      if (cached.success) applyAppearance(cached.data);
    } catch {
      /* Use default forest. */
    }
    async function refresh() {
      request?.abort();
      request = new AbortController();
      try {
        const response = await fetch(`${env.apiUrl}/v1/appearance`, {
          cache: 'no-store',
          signal: request.signal,
        });
        if (!response.ok) return;
        const result = AppearanceSchema.safeParse(await response.json());
        if (active && result.success) applyAppearance(result.data);
      } catch {
        /* Retain the last valid palette while offline. */
      }
    }
    const published = (event: Event) => {
      const result = AppearanceSchema.safeParse((event as CustomEvent).detail);
      if (result.success) {
        request?.abort();
        applyAppearance(result.data);
      }
    };
    const visible = () => {
      if (!document.hidden) void refresh();
    };
    void refresh();
    const timer = setInterval(visible, 30000);
    window.addEventListener('ji:appearance', published);
    window.addEventListener('focus', visible);
    document.addEventListener('visibilitychange', visible);
    return () => {
      active = false;
      request?.abort();
      clearInterval(timer);
      window.removeEventListener('ji:appearance', published);
      window.removeEventListener('focus', visible);
      document.removeEventListener('visibilitychange', visible);
    };
  }, []);
  return null;
}
