import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Header } from '../components/Shell';

const route = vi.hoisted(() => ({ path: '/play' }));
vi.mock('next/navigation', () => ({ usePathname: () => route.path }));

describe('reachable theme controls', () => {
  it('removes the obscured shared header and its keyboard stops from fullscreen stages', () => {
    for (const path of ['/studio', '/learn', '/learn/space', '/stories', '/stories/book']) {
      route.path = path;
      expect(renderToStaticMarkup(<Header />)).toBe('');
    }
  });

  it('keeps the shared navigation and theme chooser available before entering a stage', () => {
    for (const path of ['/play', '/gallery']) {
      route.path = path;
      const html = renderToStaticMarkup(<Header />);
      expect(html).toContain('href="/parent/dashboard"');
      expect(html).toContain('aria-label="App theme"');
      expect(html).toContain('popover="auto"');
      expect(html).toContain('type="radio"');
      expect(html).toContain('value="default"');
      expect(html).toContain('value="forest"');
      expect(html).toContain('value="ocean"');
      expect(html).toContain('value="terracotta"');
    }
  });
});
