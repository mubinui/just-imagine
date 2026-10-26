import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import type { LabProposal } from '@just-imagine/protocol';
import {
  acceptLabProposal,
  freeLabItemId,
  labBlocker,
  labRequest,
  labProposalFits,
  labStartValues,
  labTaskValues,
} from '../lib/school/lab-generation';
import { LabGenerator, LabProposalView } from '../components/school/LabGenerator';
import type { Lesson, LessonKeys } from '../lib/school/types';

const text = (en: string, bn: string) => ({ en, bn });
const lesson = (steps: Lesson['steps'] = []): Lesson =>
  ({
    id: 'w1',
    scope: 'school',
    schoolId: 's1',
    classIds: [],
    subject: 'physics',
    grade: 9,
    chapterId: 'physics-2',
    title: text('Projectiles', 'প্রক্ষেপক'),
    steps,
    status: 'draft',
    sourceLanguage: 'en',
    approved: { en: true, bn: true },
    authorUid: 't1',
    revision: 3,
    updatedAt: 1,
  }) as Lesson;
const start = { speed: 20, angle: 30, height: 10, gravity: 9.8 };
const proposal: LabProposal = {
  step: {
    kind: 'explore',
    simId: 'projectile',
    params: start,
    lockedParams: ['gravity'],
    prompts: [
      text('Predict: which angle lands furthest?', 'আগে অনুমান: কোন কোণে বল সবচেয়ে দূরে পড়বে?'),
    ],
  },
  task: {
    item: {
      id: 'lab1',
      kind: 'simTask',
      prompt: text('Change the angle so the ball hits the target.', 'কোণ বদলে বলটি লক্ষ্যে ফেলো।'),
      simId: 'projectile',
      startParams: start,
      editableParams: ['angle'],
      points: 3,
    },
    key: {
      kind: 'simTask',
      predicate: 'hitsTarget',
      args: { x: 49.1, tol: 0.5 },
      exampleAnswer: { angle: 45 },
    },
    hints: [text('Compare two angles first.', 'আগে দুটি কোণ তুলনা করো।')],
  },
  summary: text('A ball launched from a cliff', 'খাড়া পাড় থেকে ছোড়া বল'),
};
const mcq = (id: string) => ({
  kind: 'check' as const,
  item: {
    id,
    kind: 'mcq' as const,
    prompt: text('Q', 'প্র'),
    options: [text('a', 'ক'), text('b', 'খ')],
    points: 1,
  },
});

describe('lab generation helpers', () => {
  it('picks the first free lab item id', () => {
    expect(freeLabItemId(lesson())).toBe('lab1');
    expect(freeLabItemId(lesson([mcq('lab1'), mcq('lab3')]))).toBe('lab2');
  });

  it('appends the explore step and a one-question quiz with its key and hints', () => {
    const keys: LessonKeys = {
      revision: 3,
      items: { lab1: { key: { kind: 'mcq', answer: 0 }, hints: [] } },
    };
    const next = acceptLabProposal(lesson([mcq('lab1')]), keys, proposal);
    expect(next.lesson.steps.map((s) => s.kind)).toEqual(['check', 'explore', 'quiz']);
    const quiz = next.lesson.steps[2]!;
    if (quiz.kind !== 'quiz') throw new Error('quiz');
    expect(quiz.items[0]!.id).toBe('lab2');
    expect(next.keys.items['lab2']).toEqual({
      key: proposal.task!.key,
      hints: proposal.task!.hints,
    });
    expect(next.keys.items['lab1']).toEqual(keys.items['lab1']);
    expect(next.keys.revision).toBe(3);
  });

  it('appends only the explore step when there is no task', () => {
    const next = acceptLabProposal(
      lesson(),
      { revision: 0, items: {} },
      { ...proposal, task: null },
    );
    expect(next.lesson.steps.map((s) => s.kind)).toEqual(['explore']);
    expect(next.keys.items).toEqual({});
  });

  it('sends the lesson context and the trimmed description', () => {
    expect(labRequest(lesson(), '  Find the best angle.  ', 'bn')).toEqual({
      subject: 'physics',
      grade: 9,
      chapterId: 'physics-2',
      title: text('Projectiles', 'প্রক্ষেপক'),
      description: 'Find the best angle.',
      language: 'bn',
    });
  });

  it('explains why generation cannot start', () => {
    const base = {
      chapterSims: 3,
      steps: 4,
      admin: false,
      reason: '',
      description: 'Find the best angle.',
    };
    expect(labBlocker(base)).toBe('');
    expect(labBlocker({ ...base, chapterSims: 0 })).toBe('noSims');
    expect(labBlocker({ ...base, steps: 19 })).toBe('full');
    expect(labBlocker({ ...base, admin: true, reason: 'ab' })).toBe('reason');
    expect(labBlocker({ ...base, description: ' short ' })).toBe('short');
  });

  it('lists the explore values with units and whether students may change them', () => {
    const rows = labStartValues(proposal.step, 'en');
    expect(rows).toContainEqual({ label: 'Gravity', value: '9.8 m/s²', role: 'locked' });
    expect(rows).toContainEqual({ label: 'Launch angle', value: '30 °', role: 'open' });
    expect(labStartValues(proposal.step, 'bn')).toContainEqual({
      label: 'অভিকর্ষজ ত্বরণ',
      value: '৯.৮ m/s²',
      role: 'locked',
    });
  });

  it('lists where the graded task starts and what students change in it', () => {
    const task = {
      ...proposal.task!,
      item: { ...proposal.task!.item, startParams: { ...start, angle: 15 } },
    };
    const rows = labTaskValues(task, 'en');
    expect(rows).toContainEqual({ label: 'Launch angle', value: '15 °', role: 'task' });
    expect(rows).toContainEqual({ label: 'Launch height', value: '10 m', role: 'fixed' });
  });

  it('only fits the lesson it was generated for, with room for its steps', () => {
    const asked = { subject: 'physics' as const, chapterId: 'physics-2' };
    expect(labProposalFits(lesson(), asked, proposal)).toBe('');
    expect(labProposalFits({ ...lesson(), chapterId: 'physics-3' }, asked, proposal)).toBe(
      'changed',
    );
    const full = lesson(Array.from({ length: 19 }, (_, i) => mcq(`c${i}`)));
    expect(labProposalFits(full, asked, proposal)).toBe('full');
    const almost = lesson(Array.from({ length: 19 }, (_, i) => mcq(`c${i}`)));
    expect(labProposalFits(almost, asked, { ...proposal, task: null })).toBe('');
  });
});

describe('LabProposalView', () => {
  it('shows the simulation, values, prompts, the graded task and the example solution', () => {
    const html = renderToStaticMarkup(
      <LabProposalView
        proposal={proposal}
        language="en"
        onAccept={() => {}}
        onDiscard={() => {}}
      />,
    );
    for (const expected of [
      'A ball launched from a cliff',
      'Projectile motion',
      'Launch angle',
      'Locked',
      'Task starts at',
      'Predict: which angle lands furthest?',
      'Change the angle so the ball hits the target.',
      'Hits a target on the ground',
      'Target distance (m)',
      'Compare two angles first.',
      'Add to lesson',
      'Discard',
    ])
      expect(html).toContain(expected);
  });

  it('reads in Bangla and says when there is no graded task', () => {
    const html = renderToStaticMarkup(
      <LabProposalView
        proposal={{ ...proposal, task: null }}
        language="bn"
        onAccept={() => {}}
        onDiscard={() => {}}
      />,
    );
    expect(html).toContain('খাড়া পাড় থেকে ছোড়া বল');
    expect(html).toContain('পাঠে যোগ করুন');
    expect(html).toContain('মূল্যায়িত কাজ নেই');
  });
});

describe('LabGenerator', () => {
  const render = (chapterSims: number) =>
    renderToStaticMarkup(
      <LabGenerator
        lesson={lesson()}
        chapterSims={chapterSims}
        admin={false}
        reason=""
        editLanguage="en"
        onAccept={() => {}}
      />,
    );
  it('explains up front when the chapter has no simulations', () => {
    const html = render(0);
    expect(html).toMatch(/<button[^>]*disabled[^>]*>.*Lab from a description/);
    expect(html).toContain('This chapter has no simulations yet.');
  });
  it('offers the panel when the chapter has simulations', () => {
    const html = render(3);
    expect(html).not.toContain('disabled');
    expect(html).not.toContain('This chapter has no simulations yet.');
  });
});
