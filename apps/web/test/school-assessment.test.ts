import { describe, expect, it } from 'vitest';
import { numericAnswer, assessmentAnswer, assessmentRequests } from '../lib/school/answers';
const item = {
  id: 'sim',
  kind: 'simTask' as const,
  prompt: { en: 'Push', bn: 'ধাক্কা' },
  simId: 'newton-cart',
  startParams: { mass: 2, force: 0, muS: 0.4, muK: 0.2 },
  editableParams: ['force'],
  points: 2,
};
describe('student assessment input and asynchronous feedback', () => {
  it('uses the server decimal grammar and refuses incomplete/invalid simulation edits', () => {
    expect(numericAnswer('−১.২৫e২')).toBe(-125);
    for (const value of ['0x10', '0b10', '']) expect(() => numericAnswer(value)).toThrow();
    expect(() => assessmentAnswer(item, { force: undefined })).toThrow();
    expect(() => assessmentAnswer(item, { force: 999 })).toThrow();
    expect(assessmentAnswer(item, { force: 5, mass: 999 })).toEqual({ force: 5 });
    expect(assessmentAnswer(item, undefined)).toEqual({});
  });
  it('discards delayed feedback after edits, step changes, lesson revisions and unmount', async () => {
    const requests = assessmentRequests();
    for (const event of ['answer edit', 'step change', 'lesson revision', 'unmount']) {
      let resolve!: (value: string) => void;
      const response = new Promise<string>((done) => {
        resolve = done;
      });
      const isCurrent = requests.capture();
      let displayed = '';
      const apply = response.then((value) => {
        if (isCurrent()) displayed = value;
      });
      requests.invalidate();
      resolve(event);
      await apply;
      expect(displayed).toBe('');
    }
    const current = requests.capture();
    expect(current()).toBe(true);
  });
});
