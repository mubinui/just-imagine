import { expect, it } from 'vitest';
import { ClientMessageSchema, ServerMessageSchema } from '../src/ws';

it('keeps student tutor authorization distinct from a family hello', () => {
  expect(
    ClientMessageSchema.parse({
      type: 'tutorHello',
      idToken: 'test',
      lessonId: 'lesson',
      stepIndex: 0,
    }).type,
  ).toBe('tutorHello');
  expect(
    ClientMessageSchema.safeParse({
      type: 'hello',
      idToken: 'test',
      lessonId: 'lesson',
      stepIndex: 0,
    }).success,
  ).toBe(false);
  expect(
    ClientMessageSchema.safeParse({
      type: 'tutorHello',
      idToken: 'test',
      childId: 'child',
      lessonId: 'lesson',
      stepIndex: 0,
    }).success,
  ).toBe(false);
});
it('bounds untrusted observations and rejects invalid suggestion values', () => {
  expect(
    ClientMessageSchema.safeParse({
      type: 'tutorState',
      simId: 'newton-cart',
      observable: { data: 'x'.repeat(2050) },
    }).success,
  ).toBe(false);
  expect(
    ClientMessageSchema.safeParse({
      type: 'tutorEvent',
      kind: 'stepChanged',
      data: { stepIndex: 2 },
    }).success,
  ).toBe(true);
  expect(
    ServerMessageSchema.safeParse({
      type: 'tutorAction',
      kind: 'suggestParam',
      paramId: 'force',
      value: Infinity,
    }).success,
  ).toBe(false);
});
