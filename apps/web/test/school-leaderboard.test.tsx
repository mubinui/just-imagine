import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { Leaderboard } from '../components/study/Leaderboard';
import { ClassResults, SchoolConsole } from '../components/school/SchoolConsole';
import type { QuizItem } from '@just-imagine/protocol';
import type { Lesson } from '../lib/school/types';

const mocks = vi.hoisted(() => ({ resource: vi.fn(), session: vi.fn() }));
vi.mock('../lib/school/api', () => ({
  useSchoolResource: mocks.resource,
  schoolRequest: vi.fn(),
}));
vi.mock('../components/school/SchoolShell', () => ({ useSchoolSession: mocks.session }));

function loaded(data: unknown) {
  return { data, error: '', loading: false, reload: vi.fn() };
}
const board = {
  board: { entries: [{ studentId: 'student-1', firstName: 'Rafi', points: 12 }] },
  own: { points: 12, rank: 1 },
};
const results = {
  lesson: { id: 'lesson-1', title: { en: 'Forces', bn: 'বল' }, revision: 1, quizItemIds: [] },
  students: [{ student: { id: 'student-1', firstName: 'Rafi' }, attempt: null }],
};
const question = (id: string, prompt: string): QuizItem => ({
  id,
  kind: 'numeric',
  prompt: { en: prompt, bn: 'প্রশ্ন' },
  unit: 'N',
  points: 2,
});
const publicLesson = {
  id: 'lesson-1',
  revision: 1,
  steps: [
    { kind: 'check', item: question('check1', 'Try pushing the cart.') },
    {
      kind: 'quiz',
      items: [
        question('q1', 'First question'),
        question('q2', 'Second question'),
        question('q3', 'What force moves the cart?'),
      ],
    },
  ],
} satisfies Pick<Lesson, 'id' | 'revision' | 'steps'>;
const attemptedResults = {
  ...results,
  lesson: { ...results.lesson, quizItemIds: ['q1', 'q2', 'q3'] },
  students: [
    {
      student: results.students[0]!.student,
      attempt: {
        pointsAwarded: 2,
        completedAt: null,
        items: {
          check1: { correct: false, tries: 3, firstCorrectAt: null },
          q3: { correct: true, tries: 2, firstCorrectAt: 100, firstCorrectTry: 1 },
        },
      },
    },
  ],
};

beforeEach(() => {
  mocks.resource.mockReset();
  mocks.session.mockReturnValue({ studentId: 'student-1' });
  mocks.resource.mockReturnValue(loaded(board));
});

describe('leaderboard filters and request scope', () => {
  it('uses the teacher’s selected class as the sole request scope', () => {
    const html = renderToStaticMarkup(
      <Leaderboard
        teacher
        classId="class-9-a"
        scopeLabel="9 A"
        scopeControl={<select aria-label="Class or school" />}
      />,
    );
    expect(mocks.resource).toHaveBeenCalledWith(
      'school/boards?scope=class&period=week&classId=class-9-a',
    );
    expect(html).toContain('9 A · This week');
    expect(html).not.toContain('Your class');
    expect(html).not.toContain('Your school');
    expect(html).not.toContain('disabled');
    expect((html.match(/<fieldset/g) ?? []).length).toBe(1);
    expect(html).toContain('Time period');
  });

  it('requests school scope without a class ID for the whole-school choice', () => {
    renderToStaticMarkup(<Leaderboard teacher scopeLabel="Whole school" />);
    expect(mocks.resource).toHaveBeenCalledWith('school/boards?scope=school&period=week');
  });

  it('retains both student scope choices and both periods with the own-score summary', () => {
    const html = renderToStaticMarkup(<Leaderboard />);
    expect(mocks.resource).toHaveBeenCalledWith('study/boards?scope=class&period=week');
    for (const label of ['Your class', 'Your school', 'This week', 'All time', 'Your points'])
      expect(html).toContain(label);
    expect((html.match(/aria-pressed="true"/g) ?? []).length).toBe(2);
    expect(html).toContain('scope="row">Rafi');
  });

  it('groups the teacher’s school/class selector with the period control', () => {
    mocks.session.mockReturnValue({ school: { seats: 20 } });
    mocks.resource.mockImplementation((path: string | null) =>
      loaded(
        path === 'school/classes'
          ? { classes: [{ id: 'class-9-a', name: '9 A' }] }
          : path?.startsWith('school/boards')
            ? board
            : { students: [], lessons: [] },
      ),
    );
    const html = renderToStaticMarkup(<SchoolConsole view="leaderboard" />);
    expect((html.match(/<select/g) ?? []).length).toBe(1);
    expect(html).toContain('Class or school');
    expect(html).toContain('Whole school');
    expect(html).toContain('<optgroup label="Classes">');
    expect(html).not.toContain('Your class');
  });
});

describe('result lifecycle', () => {
  it('uses lesson question labels and prompts while retaining correctness, tries and quiz totals', () => {
    mocks.resource.mockReturnValue(loaded(attemptedResults));
    const html = renderToStaticMarkup(
      <ClassResults classId="class-9-a" lessonId="lesson-1" lesson={publicLesson} />,
    );
    expect(html).toContain('Practice question 1');
    expect(html).toContain('Try pushing the cart.');
    expect(html).toContain('Quiz question 3');
    expect(html).toContain('What force moves the cart?');
    expect(html).toContain('Keep exploring · Attempts: 3');
    expect(html).toContain('Correct · Attempts: 2');
    expect((html.match(/>1\/3</g) ?? []).length).toBe(2);
    expect(html).not.toContain('check1');
    expect(html).not.toContain('q3');
  });

  it('uses a human fallback for missing metadata without exposing internal IDs', () => {
    mocks.resource.mockReturnValue(
      loaded({
        ...attemptedResults,
        students: [
          {
            student: results.students[0]!.student,
            attempt: {
              items: { retired_internal_item: { correct: true, tries: 1 } },
            },
          },
        ],
      }),
    );
    const html = renderToStaticMarkup(<ClassResults classId="class-9-a" lessonId="lesson-1" />);
    expect(html).toContain('Question 1');
    expect(html).toContain('Correct · Attempts: 1');
    expect(html).not.toContain('retired_internal_item');
  });

  it('does not attach a different lesson revision’s prompt to recorded results', () => {
    mocks.resource.mockReturnValue(loaded(attemptedResults));
    const html = renderToStaticMarkup(
      <ClassResults
        classId="class-9-a"
        lessonId="lesson-1"
        lesson={{ ...publicLesson, revision: 2 }}
      />,
    );
    expect(html).toContain('Quiz question 3');
    expect(html).not.toContain('What force moves the cart?');
    expect(html).not.toContain('check1');
  });

  it('does not show old leaderboard scores while a new filter is loading', () => {
    mocks.resource.mockReturnValue({ ...loaded(board), loading: true });
    const html = renderToStaticMarkup(<Leaderboard />);
    expect(html).toContain('Opening…');
    expect(html).not.toContain('Rafi');
    expect(html).not.toContain('Your points');
  });

  it('shows a retryable error instead of stale scores or an empty-board claim', () => {
    mocks.resource.mockReturnValue({ ...loaded(board), error: 'Could not load.' });
    const html = renderToStaticMarkup(<Leaderboard />);
    expect(html).toContain('role="alert"');
    expect(html).toContain('Try again');
    expect(html).not.toContain('Rafi');
    expect(html).not.toContain('No leaderboard is available yet.');
  });

  it('shows filter guidance before a class and lesson are selected', () => {
    mocks.session.mockReturnValue({ school: { seats: 20 } });
    mocks.resource.mockReturnValue(loaded({ classes: [], lessons: [], students: [] }));
    const html = renderToStaticMarkup(<SchoolConsole view="results" />);
    expect(html).toContain('Choose a class and lesson to view student results.');
    expect(html).toContain('Choose lesson');
    expect(
      mocks.resource.mock.calls.some(([path]) => String(path).startsWith('school/results?')),
    ).toBe(false);
  });

  it('hides prior lesson data during loading and failure', () => {
    mocks.resource.mockReturnValue({ ...loaded(results), loading: true });
    let html = renderToStaticMarkup(<ClassResults classId="class-9-a" lessonId="lesson-2" />);
    expect(html).toContain('Opening…');
    expect(html).not.toContain('Forces');
    expect(html).not.toContain('Rafi');
    mocks.resource.mockReturnValue({ ...loaded(results), error: 'Could not load.' });
    html = renderToStaticMarkup(<ClassResults classId="class-9-a" lessonId="lesson-2" />);
    expect(html).toContain('Try again');
    expect(html).not.toContain('Rafi');
  });

  it('renders a named results table or a specific empty-class state', () => {
    mocks.resource.mockReturnValue(loaded(results));
    const html = renderToStaticMarkup(<ClassResults classId="class-9-a" lessonId="lesson-1" />);
    expect(html).toContain('<caption>Forces</caption>');
    expect(html).toContain('scope="row">Rafi');
    expect(html).toContain('Not started');
    mocks.resource.mockReturnValue(loaded({ ...results, students: [] }));
    expect(
      renderToStaticMarkup(<ClassResults classId="class-9-a" lessonId="lesson-1" />),
    ).toContain('No students are enrolled in this class yet.');
  });
});
