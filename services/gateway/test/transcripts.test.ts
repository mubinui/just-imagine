import { it, expect, vi } from 'vitest';
import { TranscriptBuffer } from '../src/transcripts';
it('retains fragmented turns and handles a text-free final marker once', () => {
  const emit = vi.fn(),
    buffer = new TranscriptBuffer(emit);
  buffer.push('child', { text: 'A bouncy ' });
  buffer.push('child', { text: 'dragon' });
  buffer.push('child', { finished: true });
  buffer.finish();
  expect(emit.mock.calls.filter((call) => call[2] === true)).toEqual([
    ['child', 'A bouncy dragon', true],
  ]);
  buffer.push('character', { text: 'x'.repeat(10000) });
  expect(emit.mock.calls.at(-1)?.[1]).toHaveLength(6000);
  buffer.clear();
  buffer.finish();
  expect(emit.mock.calls.filter((call) => call[2] === true)).toHaveLength(1);
});
it('closes the other speaker’s turn before a new speaker starts, so a barge-in never repeats a reply', () => {
  const emit = vi.fn(),
    buffer = new TranscriptBuffer(emit);
  buffer.push('character', { text: 'Velocity is speed' });
  buffer.push('child', { text: 'No, why is the graph straight?' });
  buffer.finish();
  expect(emit.mock.calls).toEqual([
    ['character', 'Velocity is speed', false],
    ['character', 'Velocity is speed', true],
    ['child', 'No, why is the graph straight?', false],
    ['child', 'No, why is the graph straight?', true],
  ]);
});
