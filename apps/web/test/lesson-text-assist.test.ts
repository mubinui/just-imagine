import { describe, expect, it } from 'vitest';
import {
  applyTextAssist,
  canApplyTextAssist,
  captureTextAssist,
  invalidateTextApprovals,
  textAssistRequest,
  type TextAssistSource,
} from '../lib/school/text-assist';

const source: TextAssistSource = {
  base: {
    subject: 'physics',
    grade: 9,
    chapterId: 'physics-3',
    title: { en: 'Push the cart', bn: 'গাড়িতে ধাক্কা' },
  },
  field: 'instruction',
  language: 'en',
  text: 'Apply a 10 N force.',
  context: JSON.stringify({ simId: 'newton-cart', params: { force: 10, mass: 2 } }),
};

describe('lesson text assistance boundaries', () => {
  it('can generate an unsaved, empty field without an ID or persistence operation', () => {
    const capture = captureTextAssist({ ...source, field: 'title', text: '' });
    expect(textAssistRequest(capture, 'clear', '')).toMatchObject({
      field: 'title',
      text: '',
      subject: 'physics',
      grade: 9,
      chapterId: 'physics-3',
      title: source.base.title,
    });
    expect(textAssistRequest(capture, 'clear', '')).not.toHaveProperty('lessonId');
    expect(source.text).toBe('Apply a 10 N force.');
  });

  it('passes unsaved prose and scientific context with the requested style and custom instruction', () => {
    const request = textAssistRequest(captureTextAssist(source), 'short', 'Keep the force value.');
    expect(request.text).toBe(source.text);
    expect(request.context).toBe(source.context);
    expect(request.instruction).toContain('Make it concise');
    expect(request.instruction).toContain('Keep the force value.');
    expect(request.language).toBe('en');
    expect(() =>
      textAssistRequest(captureTextAssist(source), 'steps', 'a'.repeat(600)),
    ).not.toThrow();
  });

  it('blocks a proposal after manual edits, a language switch or lesson-context changes', () => {
    const capture = captureTextAssist(source);
    const changed: TextAssistSource[] = [
      { ...source, text: 'Apply a 12 N force.' },
      { ...source, language: 'bn' },
      { ...source, base: { ...source.base, grade: 10 } },
      { ...source, base: { ...source.base, chapterId: 'physics-4' } },
      { ...source, base: { ...source.base, title: { ...source.base.title, en: 'A new task' } } },
      {
        ...source,
        context: JSON.stringify({ simId: 'newton-cart', params: { force: 12, mass: 2 } }),
      },
    ];
    for (const current of changed) {
      expect(canApplyTextAssist(capture, current)).toBe(false);
      expect(
        applyTextAssist({ en: current.text, bn: 'নিজের অনুবাদ' }, capture, current, 'AI proposal'),
      ).toBeNull();
    }
  });

  it('keeps complete local context for stale detection beyond the outbound 4000-character boundary', () => {
    const long = { ...source, context: 'x'.repeat(4000) + ' force=10' };
    const capture = captureTextAssist(long);
    expect(textAssistRequest(capture, 'clear', '').context).toHaveLength(4000);
    expect(canApplyTextAssist(capture, { ...long, context: 'x'.repeat(4000) + ' force=12' })).toBe(
      false,
    );
  });

  it('applies only the requested language and keeps the latest opposite-language edit intact', () => {
    const value = Object.freeze({ en: source.text, bn: 'শিক্ষকের বর্তমান অনুবাদ' });
    const capture = captureTextAssist(source);
    expect(applyTextAssist(value, capture, source, 'Push with a force of 10 N.')).toEqual({
      en: 'Push with a force of 10 N.',
      bn: 'শিক্ষকের বর্তমান অনুবাদ',
    });
    expect(value.en).toBe(source.text);
    expect(
      applyTextAssist({ ...value, en: 'A later edit' }, capture, source, 'Proposal'),
    ).toBeNull();
    expect(applyTextAssist(value, capture, source, ' ')).toBeNull();
    expect(applyTextAssist(value, capture, source, 'x'.repeat(4001))).toBeNull();
  });

  it('invalidates both approvals while preserving science values, answer keys and other fields', () => {
    const lesson = {
      approved: { en: true, bn: true },
      title: source.base.title,
      steps: [{ simId: 'newton-cart', params: { force: 10, mass: 2 } }],
      keys: { question: { value: 5, unit: 'm/s²' } },
      revision: 3,
    };
    const next = invalidateTextApprovals(lesson);
    expect(next.approved).toEqual({ en: false, bn: false });
    expect(next.steps).toBe(lesson.steps);
    expect(next.keys).toBe(lesson.keys);
    expect(next.title).toBe(lesson.title);
    expect(next.revision).toBe(3);
    expect(lesson.approved).toEqual({ en: true, bn: true });
  });
});
