import { Worker } from 'node:worker_threads';

export interface EvalWorker {
  send(message: unknown): void;
  /** Resolves with the next unread message matching the predicate, or rejects on timeout. */
  until<T = Record<string, unknown>>(
    predicate: (message: Record<string, unknown>) => boolean,
    timeoutMs?: number,
  ): Promise<T>;
  /** Every message received so far. */
  messages(): Record<string, unknown>[];
  errors(): Error[];
  terminate(): Promise<number>;
}

/** Runs a worker script string in Node `worker_threads` and exposes its messages. */
export function spawnEvalWorker(source: string): EvalWorker {
  const worker = new Worker(source, { eval: true });
  const inbox: Record<string, unknown>[] = [];
  const errors: Error[] = [];
  let cursor = 0;
  const waiters: {
    predicate: (m: Record<string, unknown>) => boolean;
    resolve: (m: Record<string, unknown>) => void;
  }[] = [];
  const drain = () => {
    while (waiters.length > 0 && cursor < inbox.length) {
      const waiter = waiters[0]!;
      let found = -1;
      for (let i = cursor; i < inbox.length; i++)
        if (waiter.predicate(inbox[i]!)) {
          found = i;
          break;
        }
      if (found < 0) return;
      cursor = found + 1;
      waiters.shift();
      waiter.resolve(inbox[found]!);
    }
  };
  worker.on('message', (m: Record<string, unknown>) => {
    inbox.push(m);
    drain();
  });
  worker.on('error', (e: Error) => errors.push(e));
  return {
    send: (message) => worker.postMessage(message),
    until: <T>(predicate: (m: Record<string, unknown>) => boolean, timeoutMs = 3000) =>
      new Promise<T>((resolve, reject) => {
        const timer = setTimeout(() => {
          const index = waiters.findIndex((w) => w.resolve === done);
          if (index >= 0) waiters.splice(index, 1);
          reject(
            new Error(
              `timed out waiting for a worker message; got ${JSON.stringify(inbox.slice(cursor))}`,
            ),
          );
        }, timeoutMs);
        const done = (m: Record<string, unknown>) => {
          clearTimeout(timer);
          resolve(m as T);
        };
        waiters.push({ predicate, resolve: done });
        drain();
      }),
    messages: () => [...inbox],
    errors: () => [...errors],
    terminate: () => worker.terminate(),
  };
}
