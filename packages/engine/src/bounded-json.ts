/** Read collider metadata without buffering an unbounded response body. */
export async function readBoundedJson(
  response: Response,
  controller: AbortController,
  maxBytes = 64_000,
): Promise<unknown> {
  const announced = Number(response.headers.get('content-length'));
  if (Number.isFinite(announced) && announced > maxBytes) {
    controller.abort();
    await response.body?.cancel();
    throw new Error('Collider too large');
  }
  const reader = response.body?.getReader();
  if (!reader) throw new Error('Collider response has no body');
  const bytes = new Uint8Array(maxBytes);
  let length = 0;
  try {
    for (;;) {
      const { value, done } = await reader.read();
      if (done) break;
      if (length + value.byteLength > maxBytes) {
        controller.abort();
        await reader.cancel();
        throw new Error('Collider too large');
      }
      bytes.set(value, length);
      length += value.byteLength;
    }
    return JSON.parse(
      new TextDecoder('utf-8', { fatal: true }).decode(bytes.subarray(0, length)),
    ) as unknown;
  } finally {
    reader.releaseLock();
  }
}
