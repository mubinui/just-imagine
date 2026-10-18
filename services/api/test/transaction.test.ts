import { describe, expect, it, vi } from 'vitest';
import { retryClosedTransaction } from '../src/transaction';

const closed = Object.assign(new Error('3 INVALID_ARGUMENT: Transaction is invalid or closed.'), {
  code: 3,
});

describe('retryClosedTransaction', () => {
  it('runs a transaction again when the emulator closed it under contention', async () => {
    const run = vi.fn().mockRejectedValueOnce(closed).mockResolvedValueOnce('done');
    await expect(retryClosedTransaction(run)).resolves.toBe('done');
    expect(run).toHaveBeenCalledTimes(2);
  });
  it('passes every other failure straight through', async () => {
    const other = Object.assign(new Error('3 INVALID_ARGUMENT: bad field'), { code: 3 });
    const run = vi.fn().mockRejectedValue(other);
    await expect(retryClosedTransaction(run)).rejects.toBe(other);
    expect(run).toHaveBeenCalledTimes(1);
  });
  it('gives up after a few attempts', async () => {
    const run = vi.fn().mockRejectedValue(closed);
    await expect(retryClosedTransaction(run)).rejects.toBe(closed);
    expect(run).toHaveBeenCalledTimes(3);
  });
});
