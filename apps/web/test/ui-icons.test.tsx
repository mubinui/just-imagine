import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { UiIcon, UI_PATHS } from '../components/UiIcon';
import { LearnIcon, StarIcon } from '../components/learn/parts';

describe('shared interface icons', () => {
  it('keeps decorative icons outside accessible control names and keyboard focus', () => {
    const html = renderToStaticMarkup(
      <button aria-pressed="true">
        <UiIcon name="captions" />
        Captions
      </button>,
    );
    expect(html).toContain('aria-pressed="true"');
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('focusable="false"');
    expect(html).toContain('opacity="0.2"');
    expect(html).toContain('Captions</button>');
  });

  it('retains caller dimensions and named status icons while overriding legacy stroke styles', () => {
    const html = renderToStaticMarkup(
      <UiIcon
        name="check"
        width="20"
        height="20"
        className="completion"
        aria-hidden={false}
        role="img"
        aria-label="Played"
        style={{ fill: 'none', stroke: 'red', color: 'green' }}
      />,
    );
    expect(html).toContain('width="20" height="20"');
    expect(html).toContain('class="ui-icon completion"');
    expect(html).toContain('aria-hidden="false"');
    expect(html).toContain('aria-label="Played"');
    expect(html).toContain('style="fill:currentColor;stroke:none;color:green"');
  });

  it('shares real map, phone and star shapes without the old book and game fallbacks', () => {
    expect(renderToStaticMarkup(<LearnIcon name="map" />)).toContain(UI_PATHS.map);
    expect(renderToStaticMarkup(<LearnIcon name="phone" filled />)).toContain(UI_PATHS.phone);
    expect(renderToStaticMarkup(<StarIcon />)).toContain(UI_PATHS.star);
    expect(UI_PATHS.map).not.toBe(UI_PATHS.book);
    expect(UI_PATHS.studio).not.toBe(UI_PATHS.game);
    expect(UI_PATHS.heartEmpty).not.toBe(UI_PATHS.heart);
  });

  it('vendors only self-contained SVG geometry without executable or external content', () => {
    for (const markup of Object.values(UI_PATHS)) {
      expect(markup).toMatch(/^<(path|circle|ellipse|rect|polygon|line|polyline|g)\b/);
      expect(markup).not.toMatch(
        /<\/?(?:script|foreignObject|image|use|style)\b|\bon\w+=|\bhref=/i,
      );
    }
  });
});
