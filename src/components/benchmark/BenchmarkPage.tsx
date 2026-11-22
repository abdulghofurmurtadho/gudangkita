import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpDown, Cpu, History, Search } from 'lucide-react';
import { collectEnvironmentInfo } from '../../benchmark/environment';
import { BenchmarkCancelledError, BenchmarkWorkerClient } from '../../workers/workerClient';
import type {
  BenchmarkProgress,
  BenchmarkResultRecord,
  SearchBenchmarkConfig,
  SortBenchmarkConfig,
} from '../../types';
import { BenchmarkHistoryTab } from './BenchmarkHistoryTab';
import { SearchingBenchmarkTab } from './SearchingBenchmarkTab';
import { SortingBenchmarkTab } from './SortingBenchmarkTab';

type BenchmarkSubTab = 'sorting' | 'searching' | 'history';

interface BenchmarkPageProps {
  history: readonly BenchmarkResultRecord[];
  onAppendHistory: (newResults: BenchmarkResultRecord[]) => void;
  onClearHistory: () => void;
}

export function BenchmarkPage({
  history,
  onAppendHistory,
  onClearHistory,
}: BenchmarkPageProps) {
  const [activeSubTab, setActiveSubTab] = useState<BenchmarkSubTab>('sorting');
  const [sortResults, setSortResults] = useState<BenchmarkResultRecord[]>([]);
  const [searchResults, setSearchResults] = useState<BenchmarkResultRecord[]>([]);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [runningMode, setRunningMode] = useState<'sorting' | 'searching' | null>(null);
  const [progress, setProgress] = useState<BenchmarkProgress | null>(null);
  const [sortError, setSortError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  const workerClientRef = useRef<BenchmarkWorkerClient | null>(null);
  const envInfo = useMemo(() => collectEnvironmentInfo(), []);

  useEffect(() => {
    const client = new BenchmarkWorkerClient();
    workerClientRef.current = client;
    return () => {
      client.cancel();
      workerClientRef.current = null;
    };
  }, []);

  const ensureClient = (): BenchmarkWorkerClient => {
    if (!workerClientRef.current) {
      workerClientRef.current = new BenchmarkWorkerClient();
    }
    return workerClientRef.current;
  };

  const handleRunSort = async (config: SortBenchmarkConfig) => {
    if (isRunning) return;
    setIsRunning(true);
    setRunningMode('sorting');
    setSortError(null);
    setProgress(null);

    try {
      const client = ensureClient();
      const results = await client.runSort(config, envInfo, (nextProgress) => {
        setProgress(nextProgress);
      });
      setSortResults(results);
      onAppendHistory(results);
    } catch (error) {
      if (error instanceof BenchmarkCancelledError) {
        setSortError('Pengujian pengurutan dibatalkan oleh pengguna.');
      } else {
        setSortError(
          error instanceof Error
            ? `Terjadi kesalahan saat menjalankan pengujian: ${error.message}`
            : 'Terjadi kesalahan yang tidak diketahui saat menjalankan pengujian.',
        );
      }
    } finally {
      setIsRunning(false);
      setRunningMode(null);
      setProgress(null);
    }
  };

  const handleRunSearch = async (config: SearchBenchmarkConfig) => {
    if (isRunning) return;
    setIsRunning(true);
    setRunningMode('searching');
    setSearchError(null);
    setProgress(null);

    try {
      const client = ensureClient();
      const results = await client.runSearch(config, envInfo, (nextProgress) => {
        setProgress(nextProgress);
      });
      setSearchResults(results);
      onAppendHistory(results);
    } catch (error) {
      if (error instanceof BenchmarkCancelledError) {
        setSearchError('Pengujian pencarian dibatalkan oleh pengguna.');
      } else {
        setSearchError(
          error instanceof Error
            ? `Terjadi kesalahan saat menjalankan pengujian: ${error.message}`
            : 'Terjadi kesalahan yang tidak diketahui saat menjalankan pengujian.',
        );
      }
    } finally {
      setIsRunning(false);
      setRunningMode(null);
      setProgress(null);
    }
  };

  const handleCancel = () => {
    workerClientRef.current?.cancel();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Perbandingan Performa Algoritma
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Pengukuran empiris di browser pada dataset snapshot ter-seed menggunakan Web Worker
            terpisah.
          </p>
        </div>

        <div className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600 shadow-sm">
          <Cpu className="h-4 w-4 text-blue-600" aria-hidden="true" />
          <span>
            Lingkungan: <strong>{envInfo.browser}</strong> • {envInfo.platform}
          </span>
        </div>
      </div>

      {/* Sub-navigation Tabs */}
      <div
        role="tablist"
        aria-label="Sub-halaman Perbandingan Performa"
        className="flex flex-wrap gap-2 border-b border-slate-200 pb-3"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'sorting'}
          onClick={() => setActiveSubTab('sorting')}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
            activeSubTab === 'sorting'
              ? 'border-blue-200 bg-blue-600 text-white shadow-sm'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <ArrowUpDown className="h-4 w-4" aria-hidden="true" />
          <span>Sorting</span>
          {runningMode === 'sorting' ? (
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-300" />
          ) : null}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'searching'}
          onClick={() => setActiveSubTab('searching')}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
            activeSubTab === 'searching'
              ? 'border-blue-200 bg-blue-600 text-white shadow-sm'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          <span>Searching</span>
          {runningMode === 'searching' ? (
            <span className="h-2 w-2 animate-pulse rounded-full bg-amber-300" />
          ) : null}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'history'}
          onClick={() => setActiveSubTab('history')}
          className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-semibold transition-all ${
            activeSubTab === 'history'
              ? 'border-blue-200 bg-blue-600 text-white shadow-sm'
              : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
          }`}
        >
          <History className="h-4 w-4" aria-hidden="true" />
          <span>Riwayat Sesi</span>
          <span
            className={`rounded-full px-2 py-0.5 font-mono text-xs ${
              activeSubTab === 'history'
                ? 'bg-blue-500 text-white'
                : 'bg-slate-100 text-slate-700'
            }`}
          >
            {history.length}
          </span>
        </button>
      </div>

      {/* Active Tab Content */}
      <div role="tabpanel">
        {activeSubTab === 'sorting' ? (
          <SortingBenchmarkTab
            results={sortResults}
            isRunning={isRunning}
            progress={runningMode === 'sorting' ? progress : null}
            errorMessage={sortError}
            envInfo={envInfo}
            onRun={handleRunSort}
            onCancel={handleCancel}
          />
        ) : activeSubTab === 'searching' ? (
          <SearchingBenchmarkTab
            results={searchResults}
            isRunning={isRunning}
            progress={runningMode === 'searching' ? progress : null}
            errorMessage={searchError}
            envInfo={envInfo}
            onRun={handleRunSearch}
            onCancel={handleCancel}
          />
        ) : (
          <BenchmarkHistoryTab
            history={history}
            envInfo={envInfo}
            onClearHistory={onClearHistory}
          />
        )}
      </div>
    </div>
  );
}
