import { runSearchBenchmark, runSortBenchmark } from '../benchmark/runner';
import type { WorkerRequest, WorkerResponse } from '../types';

const workerScope = self as unknown as DedicatedWorkerGlobalScope;

function postWorkerMessage(message: WorkerResponse): void {
  workerScope.postMessage(message);
}

workerScope.onmessage = (event: MessageEvent<WorkerRequest>) => {
  const request = event.data;

  try {
    if (request.type === 'START_SORT_BENCHMARK') {
      const results = runSortBenchmark(
        request.config,
        request.envInfo,
        (progress) => {
          postWorkerMessage({
            type: 'PROGRESS',
            requestId: request.requestId,
            progress,
          });
        },
      );

      postWorkerMessage({
        type: 'RESULT',
        requestId: request.requestId,
        results,
      });
      return;
    }

    if (request.type === 'START_SEARCH_BENCHMARK') {
      const results = runSearchBenchmark(
        request.config,
        request.envInfo,
        (progress) => {
          postWorkerMessage({
            type: 'PROGRESS',
            requestId: request.requestId,
            progress,
          });
        },
      );

      postWorkerMessage({
        type: 'RESULT',
        requestId: request.requestId,
        results,
      });
      return;
    }

    const exhaustiveCheck: never = request;
    postWorkerMessage({
      type: 'ERROR',
      requestId: (exhaustiveCheck as { requestId?: string }).requestId ?? '',
      error: 'Jenis permintaan benchmark Web Worker tidak dikenali.',
    });
  } catch (err) {
    postWorkerMessage({
      type: 'ERROR',
      requestId: request.requestId,
      error:
        err instanceof Error
          ? err.message
          : 'Terjadi kesalahan saat mengeksekusi benchmark di Web Worker.',
    });
  }
};
