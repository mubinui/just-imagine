import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChildNavigation } from '../components/companion/Companion';

const route = vi.hoisted(() => ({ pathname: '/studio' }));
const voice = vi.hoisted(() => ({ get: vi.fn(), ensure: vi.fn(), stop: vi.fn() }));
vi.mock('next/navigation', () => ({ usePathname: () => route.pathname, useRouter: () => ({}) }));
vi.mock('../lib/voice', () => ({
  getVoice: voice.get,
  ensureChildVoice: voice.ensure,
  stopChildVoice: voice.stop,
  releaseVoice: vi.fn(),
  unlockChildVoice: vi.fn(),
}));

function destinations() {
  const html = renderToStaticMarkup(<ChildNavigation />);
  return [...html.matchAll(/<a ([^>]+)>(.*?)<\/a>/g)].map(([, attributes = '', body = '']) => ({
    href: attributes.match(/href="([^"]+)"/)?.[1],
    active: attributes.includes('aria-current="page"'),
    label: body.match(/<span>(.*?)<\/span>/)?.[1],
  }));
}
describe('visible child navigation', () => {
  it('exposes all four real destinations without opening an assistant or voice session', () => {
    expect(destinations().map(({ href, label }) => [href, label])).toEqual([
      ['/studio', 'Studio'],
      ['/learn', 'Learn'],
      ['/stories', 'Stories'],
      ['/gallery', 'Worlds'],
    ]);
    expect(voice.get).not.toHaveBeenCalled();
    expect(voice.ensure).not.toHaveBeenCalled();
    expect(voice.stop).not.toHaveBeenCalled();
  });
  it.each(['/learn', '/learn/space', '/learn/space/chapter'])(
    'keeps Learn current inside %s',
    (pathname) => {
      route.pathname = pathname;
      expect(
        destinations()
          .filter(({ active }) => active)
          .map(({ href }) => href),
      ).toEqual(['/learn']);
    },
  );
  it('does not mark a similarly prefixed destination as current', () => {
    route.pathname = '/stories-extra';
    expect(destinations().some(({ active }) => active)).toBe(false);
  });
});
