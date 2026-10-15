import { it, expect, vi } from 'vitest';
import { readBoundedJson } from '../src/bounded-json';
it('stops streamed colliders at the byte limit without text buffering', async () => {
  const cancel = vi.fn();
  let pulls = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(c) {
      pulls++;
      c.enqueue(new Uint8Array(40_000));
    },
    cancel,
  });
  const response = new Response(stream);
  const text = vi.spyOn(response, 'text');
  const controller = new AbortController();
  await expect(readBoundedJson(response, controller)).rejects.toThrow('too large');
  expect(controller.signal.aborted).toBe(true);
  expect(cancel).toHaveBeenCalledOnce();
  expect(text).not.toHaveBeenCalled();
  expect(pulls).toBeLessThanOrEqual(3);
});
it('rejects excessive content-length before reading and accepts bounded JSON', async () => {
  const cancel = vi.fn();
  const response = new Response(new ReadableStream({ cancel }), {
    headers: { 'content-length': '100000' },
  });
  const controller = new AbortController();
  await expect(readBoundedJson(response, controller)).rejects.toThrow('too large');
  expect(cancel).toHaveBeenCalledOnce();
  expect(await readBoundedJson(new Response('{"parts":[]}'), new AbortController())).toEqual({
    parts: [],
  });
});
