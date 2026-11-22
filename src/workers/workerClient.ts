import type { ProgressCallback } from '../benchmark/runner';
import type {
  BenchmarkResultRecord,
  EnvironmentInfo,
  SearchBenchmarkConfig,
  SortBenchmarkConfig,
  WorkerRequest,
  WorkerResponse,
} from '../types';

/**
 * Kesalahan yang dilempar saat pengguna membatalkan eksekusi benchmark aktif.
 */
export class BenchmarkCancelledError extends Error {
  constructor(
    message = 'Eksekusi benchmark dibatalkan oleh pengguna.',
  ) {
    super(message);
    this.name = 'BenchmarkCancelledError';
  }
}

interface ActiveExecution {
  requestId: string;
  worker: Worker;
  reject: (reason?: unknown) => void;
}

/**
 * Klien pembungkus Web Worker untuk menjalankan benchmark sorting dan searching
 * di thread terpisah agar UI tetap responsif serta mendukung pembatalan instan.
 */
export class BenchmarkWorkerClient {
  private activeExecution: ActiveExecution | null = null;
  private requestCounter = 0;

  /**
   * Menunjukkan apakah ada proses benchmark yang sedang berjalan di Web Worker.
   */
  public isRunning(): boolean {
    return this.activeExecution !== null;
  }

  /**
   * Memulai pengujian benchmark algoritma pengurutan di Web Worker.
   */
  public runSort(
    config: SortBenchmarkConfig,
    envInfo: EnvironmentInfo,
    onProgress?: ProgressCallback,
  ): Promise<BenchmarkResultRecord[]> {
    return this.executeRequest(
      (requestId) => ({
        type: 'START_SORT_BENCHMARK',
        requestId,
        config,
        envInfo,
      }),
      onProgress,
    );
  }

  /**
   * Memulai pengujian benchmark algoritma pencarian di Web Worker.
   */
  public runSearch(
    config: SearchBenchmarkConfig,
    envInfo: EnvironmentInfo,
    onProgress?: ProgressCallback,
  ): Promise<BenchmarkResultRecord[]> {
    return this.executeRequest(
      (requestId) => ({
        type: 'START_SEARCH_BENCHMARK',
        requestId,
        config,
        envInfo,
      }),
      onProgress,
    );
  }

  /**
   * Menghentikan paksa Web Worker aktif dan menolak promise berjalan
   * dengan BenchmarkCancelledError.
   */
  public cancel(): void {
    const active = this.activeExecution;
    if (!active) {
      return;
    }

    this.activeExecution = null;
    active.worker.terminate();
    active.reject(new BenchmarkCancelledError());
  }

  private cleanupActive(expectedRequestId: string): ActiveExecution | null {
    const active = this.activeExecution;
    if (!active || active.requestId !== expectedRequestId) {
      return null;
    }
    this.activeExecution = null;
    active.worker.terminate();
    return active;
  }

  private executeRequest(
    buildRequest: (requestId: string) => WorkerRequest,
    onProgress?: ProgressCallback,
  ): Promise<BenchmarkResultRecord[]> {
    if (this.activeExecution !== null) {
      return Promise.reject(
        new Error(
          'Benchmark lain masih berjalan. Batalkan terlebih dahulu sebelum memulai pengujian baru.',
        ),
      );
    }

    if (typeof Worker === 'undefined') {
      return Promise.reject(
        new Error(
          'Lingkungan eksekusi ini tidak mendukung Web Worker modul.',
        ),
      );
    }

    this.requestCounter += 1;
    const requestId = `gk-worker-${Date.now()}-${this.requestCounter}`;

    return new Promise<BenchmarkResultRecord[]>((resolve, reject) => {
      let worker: Worker;
      try {
        worker = new Worker(new URL('./benchmark.worker.ts', import.meta.url), {
          type: 'module',
        });
      } catch (err) {
        reject(
          err instanceof Error
            ? err
            : new Error('Gagal membuat Web Worker benchmark.'),
        );
        return;
      }

      this.activeExecution = {
        requestId,
        worker,
        reject,
      };

      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const message = event.data;
        if (!message || message.requestId !== requestId) {
          return;
        }

        if (message.type === 'PROGRESS') {
          onProgress?.(message.progress);
          return;
        }

        if (message.type === 'RESULT') {
          const finished = this.cleanupActive(requestId);
          if (finished) {
            resolve(message.results);
          }
          return;
        }

        if (message.type === 'ERROR') {
          const failed = this.cleanupActive(requestId);
          if (failed) {
            reject(new Error(message.error));
          }
        }
      };

      worker.onerror = (event: ErrorEvent) => {
        const failed = this.cleanupActive(requestId);
        if (failed) {
          reject(
            new Error(
              event.message ||
                'Terjadi kesalahan tak terduga pada Web Worker benchmark.',
            ),
          );
        }
      };

      worker.onmessageerror = () => {
        const failed = this.cleanupActive(requestId);
        if (failed) {
          reject(
            new Error(
              'Gagal mendeserialisasi pesan respons dari Web Worker benchmark.',
            ),
          );
        }
      };

      worker.postMessage(buildRequest(requestId));
    });
  }
}
