import type { WorkerLike } from '../../src/host';

/** A WorkerLike the test drives by hand: records host messages, injects worker messages. */
export class FakeWorker implements WorkerLike {
  readonly sent: Record<string, unknown>[] = [];
  terminated = false;
  source = '';
  private listeners: ((m: unknown) => void)[] = [];
  private errorListeners: ((e: Error) => void)[] = [];

  postMessage(message: unknown): void {
    this.sent.push(message as Record<string, unknown>);
  }
  terminate(): void {
    this.terminated = true;
  }
  onMessage(cb: (message: unknown) => void): void {
    this.listeners.push(cb);
  }
  onError(cb: (error: Error) => void): void {
    this.errorListeners.push(cb);
  }
  emit(message: unknown): void {
    for (const cb of this.listeners) cb(message);
  }
  crash(error: Error): void {
    for (const cb of this.errorListeners) cb(error);
  }
  ready(): void {
    this.emit({ type: 'ready' });
  }
  ack(seq: number, ms = 0.1): void {
    this.emit({ type: 'ack', seq, ms });
  }
  commands(...commands: unknown[]): void {
    this.emit({ type: 'commands', commands });
  }
  sentOfType(type: string): Record<string, unknown>[] {
    return this.sent.filter((m) => m.type === type);
  }
}

export function fakeWorkerFactory(): {
  factory: (source: string) => FakeWorker;
  created: FakeWorker[];
} {
  const created: FakeWorker[] = [];
  return {
    created,
    factory: (source) => {
      const worker = new FakeWorker();
      worker.source = source;
      created.push(worker);
      return worker;
    },
  };
}
