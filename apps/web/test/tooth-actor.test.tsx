import { it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { ToothActor } from '../components/learn/ToothActor';

it('renders exactly one unchanged Tooth atlas image for every semantic state', () => {
  for (const pose of ['idle', 'brush', 'wave', 'cheer'] as const) {
    const html = renderToStaticMarkup(
      <svg>
        <ToothActor pose={pose} />
      </svg>,
    );
    expect(html.match(/<image\b/g)).toHaveLength(1);
    expect(html).toContain('href="/learn/cinematic/twinkle-acting-v1.webp"');
    expect(html).toContain('data-acting-id="tooth"');
    expect(html).not.toContain('opacity=');
    expect(html).not.toContain('tooth-pose');
  }
});
