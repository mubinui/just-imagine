import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
const css = readFileSync(join(root, 'lib/i18n/fonts.css'), 'utf8');
const block = (family: string) =>
  new RegExp(`@font-face\\s*\\{[^}]*font-family:\\s*'${family}'[^}]*\\}`, 'g');

describe('Bangla fonts', () => {
  it('self-hosts every woff2 file the stylesheet references', () => {
    const urls = [...css.matchAll(/url\('(\/fonts\/[^']+\.woff2)'\)/g)].map((m) => m[1]!);
    expect(urls.length).toBeGreaterThanOrEqual(4);
    for (const url of urls) {
      const file = join(root, 'public', url);
      expect(existsSync(file), url).toBe(true);
      expect(readFileSync(file).subarray(0, 4).toString('latin1'), url).toBe('wOF2');
    }
  });
  it('declares Baloo Da 2 for 400-800 and Noto Sans Bengali for 400-700 with unicode ranges', () => {
    const baloo = css.match(block('Baloo Da 2')) ?? [];
    const noto = css.match(block('Noto Sans Bengali')) ?? [];
    expect(baloo.length).toBeGreaterThanOrEqual(2);
    expect(noto.length).toBeGreaterThanOrEqual(2);
    for (const face of baloo) {
      expect(face).toMatch(/font-weight:\s*400 800/);
      expect(face).toMatch(/unicode-range:/);
    }
    for (const face of noto) {
      expect(face).toMatch(/font-weight:\s*400 700/);
      expect(face).toMatch(/unicode-range:/);
    }
  });
  it('switches the stacks under lang=bn: Noto Sans Bengali for body, Baloo Da 2 for headings and .brand', () => {
    expect(css).toMatch(/\[lang\|='bn'\][^{]*\{[^}]*font-family:\s*'Noto Sans Bengali'/);
    expect(css).toMatch(/\[lang\|='bn'\]\s+\.brand[^{]*\{[^}]*font-family:\s*'Baloo Da 2'/);
    expect(css).toMatch(/\[lang\|='bn'\]\s+h1[^{]*\{[^}]*font-family:\s*'Baloo Da 2'/);
  });
  it('records both licences beside the files', () => {
    const notice = readFileSync(join(root, 'public/fonts/NOTICE.md'), 'utf8');
    expect(notice).toContain('Baloo Da 2');
    expect(notice).toContain('Noto Sans Bengali');
    expect(existsSync(join(root, 'public/fonts/BalooDa2-OFL.txt'))).toBe(true);
    expect(existsSync(join(root, 'public/fonts/NotoSansBengali-OFL.txt'))).toBe(true);
  });
});
