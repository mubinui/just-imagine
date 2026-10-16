import { Worker } from 'node:worker_threads';
import type { WorkerFactory } from './host';

/** Runs the shimmed script in a Node `worker_threads` worker (for tests and the smoke runner). */
export const nodeWorkerFactory: WorkerFactory = (source) => {
  const worker = new Worker(source, { eval: true });
  return {
    postMessage: (message) => worker.postMessage(message),
    terminate: () => {
      void worker.terminate();
    },
    onMessage: (cb) => {
      worker.on('message', cb);
    },
    onError: (cb) => {
      worker.on('error', cb);
    },
  };
};

export { smokeRun, createEngineStage } from './smoke';
export type { SmokeOptions, SmokeResult, SmokeFailure, SmokeLanguage } from './smoke';
