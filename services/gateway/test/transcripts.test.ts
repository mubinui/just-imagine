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
