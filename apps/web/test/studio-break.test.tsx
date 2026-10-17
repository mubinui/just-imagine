import { describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { StudioBreak } from '../components/studio/StudioBreak';
import type { Companion } from '@just-imagine/protocol';
const state = vi.hoisted(() => ({ language: 'en' as 'en' | 'bn' }));
vi.mock('../lib/i18n', () => ({ useLanguage: () => state }));
vi.mock('../components/companion/Companion', () => ({
  CompanionArt: ({ speaking }: { speaking: boolean }) => (
    <span data-personal-character data-speaking={String(speaking)} />
  ),
}));
vi.mock('../components/studio/CharacterArt', () => ({
  CharacterArt: ({ id, action }: { id: string; action: string }) => (
    <svg data-character={id} data-action={action} />
  ),
}));
function render(companion?: Companion, voiceActive = false) {
  return renderToStaticMarkup(
    <StudioBreak
      title="A lovely place to pause."
      character="bhombol"
      companion={companion}
      voiceActive={voiceActive}
      onReturn={vi.fn()}
      onLeave={vi.fn()}
    />,
  );
}
describe('Studio finish surface', () => {
  it('retains the selected character and provides an explicit quiet return and real destinations', () => {
    state.language = 'en';
    const html = render();
    expect(html).toContain('data-character="bhombol"');
    expect(html).toContain('data-action="still"');
    expect(html).toContain('Call ended · Microphone off');
    expect(html).toContain('Back to Studio');
    for (const href of ['/learn', '/stories', '/gallery', '/play'])
      expect(html).toContain(`href="${href}"`);
    expect(html).not.toMatch(/autosav|saved|minutes|points|discovered/i);
  });
  it('keeps a personal companion quiet and localizes the next actions', () => {
    state.language = 'bn';
    const html = render({
      kind: 'preset',
      characterId: 'bhombol',
      name: 'Pip',
      personality: 'Curious',
    } as Companion);
    expect(html).toContain('data-personal-character');
    expect(html).toContain('data-speaking="false"');
    expect(html).toContain('মাইক্রোফোন বন্ধ');
    expect(html).toContain('স্টুডিওতে ফিরি');
    expect(html).toContain('আমার জগৎ');
    state.language = 'en';
  });
  it.each([
    ['en', 'Live assistant is on', 'Microphone off'],
    ['bn', 'লাইভ সহকারী চালু আছে', 'মাইক্রোফোন বন্ধ'],
  ] as const)('reflects an explicitly active assistant in %s', (language, active, inactive) => {
    state.language = language;
    const html = render(undefined, true);
    expect(html).toContain(active);
    expect(html).not.toContain(inactive);
    expect(html).toContain('role="status"');
    state.language = 'en';
  });
});
