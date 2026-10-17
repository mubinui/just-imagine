import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Leaderboard } from '../components/study/Leaderboard';
import { STUDY_COPY } from '../components/study/copy';

const mocks = vi.hoisted(() => ({ resource: vi.fn(), session: vi.fn() }));
vi.mock('../lib/school/api', () => ({ useSchoolResource: mocks.resource, schoolRequest: vi.fn() }));
vi.mock('../components/school/SchoolShell', () => ({ useSchoolSession: mocks.session }));
const loaded = (data: unknown) => ({ data, error: '', loading: false, reload: vi.fn() });
const entry = (studentId: string, firstName: string, points: number) => ({
  studentId,
  firstName,
  points,
});

beforeEach(() => {
  mocks.resource.mockReset();
  mocks.session.mockReturnValue({ studentId: 's3' });
});

describe('student leaderboard ranks', () => {
  it('gives tied students the same rank and the next student the skipped place', () => {
    mocks.resource.mockReturnValue(
      loaded({
        board: { entries: [entry('s1', 'Rafi', 9), entry('s2', 'Mina', 9), entry('s3', 'Ari', 4)] },
        own: { points: 4, rank: 3 },
      }),
    );
    const ranks = [
      ...renderToStaticMarkup(<Leaderboard />).matchAll(/<td class="sch-rank">([^<]*)</g),
    ].map((m) => m[1]);
    expect(ranks).toEqual(['1', '1', '3']);
  });
  it('says "Not ranked yet" instead of "Rank 1" while the student has no points', () => {
    mocks.resource.mockReturnValue(loaded({ board: { entries: [] }, own: { points: 0, rank: 1 } }));
    const html = renderToStaticMarkup(<Leaderboard />);
    expect(html).toContain('Not ranked yet');
    expect(html).not.toMatch(/Rank: 1/);
  });
});

describe('study copy', () => {
  it('ships every string in both languages with matching placeholders', () => {
    const slots = (text: string) => [...text.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
    for (const [key, [en, bn]] of Object.entries(STUDY_COPY)) {
      expect(en.trim(), key).not.toBe('');
      expect(bn, key).toMatch(/[ঀ-৿]/);
      expect(slots(bn), key).toEqual(slots(en));
    }
  });
});
