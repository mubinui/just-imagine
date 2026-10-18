import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// The theme art is a fixed layer behind the page (body::before, z-index -1). A full-page
// container with a solid background would hide it, as the school area once did.
const rule = (css: string, selector: string) =>
  new RegExp(`(^|\\n)${selector.replace(/\./g, '\\.')} \\{([^}]*)\\}`).exec(css)?.[2] ?? '';

describe('theme art behind the school and student pages', () => {
  it('is not covered by the school page container', () => {
    const css = readFileSync(new URL('../app/school.css', import.meta.url), 'utf8');
    const background = /background(?:-color)?:\s*([^;]+);/.exec(rule(css, '.sch'))?.[1]?.trim();
    expect(background ?? 'transparent').toBe('transparent');
  });
});
