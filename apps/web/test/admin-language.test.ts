import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { hasUiCopy } from '../lib/i18n/ui';

const DIR = join(__dirname, '../components/admin');
// Interface literals passed to uiText('...'), including the first argument of a templated call.
const LITERAL = /uiText\(\s*(['"])((?:\\.|(?!\1).)*)\1/g;

function literals(): { file: string; text: string }[] {
  return readdirSync(DIR)
    .filter((f) => f.endsWith('.tsx') || f.endsWith('.ts'))
    .flatMap((file) =>
      [...readFileSync(join(DIR, file), 'utf8').matchAll(LITERAL)].map((m) => ({
        file,
        text: (m[2] ?? '').replace(/\\(['"])/g, '$1'),
      })),
    )
    .filter(({ text }) => /[A-Za-z]/.test(text));
}

describe('operator console language', () => {
  it('has Bangla copy for every interface literal in the console', () => {
    const missing = literals()
      .filter(({ text }) => !hasUiCopy(text))
      .map(({ file, text }) => `${file}: ${text}`);
    expect([...new Set(missing)]).toEqual([]);
  });
});
