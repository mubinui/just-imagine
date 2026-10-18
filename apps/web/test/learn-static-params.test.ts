import { describe, expect, it } from 'vitest';
import { generateStaticParams } from '../app/(child)/learn/[pack]/page';
import { learnIslands } from '../components/learn/content';

describe('Learn section pages', () => {
  it('are built ahead of time for every island the map opens', () => {
    const open = learnIslands()
      .filter((island) => island.open)
      .map((island) => island.section);
    expect(open.length).toBeGreaterThan(2);
    expect(
      generateStaticParams()
        .map((p) => p.pack)
        .sort(),
    ).toEqual([...open].sort());
  });
});
