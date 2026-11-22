import { useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  CheckSquare,
  FileJson,
  FileSpreadsheet,
  Play,
  RefreshCw,
  Square,
} from 'lucide-react';
import { SEARCHING_ALGORITHM_LIST } from '../../algorithms/searching';
import { downloadTextFile, exportResultsToCSV, exportResultsToJSON } from '../../benchmark/exporter';
import { formatDuration, formatNumberID } from '../../benchmark/metrics';
import {
  CUSTOM_DATASET_LIMITS,
  DATASET_PRESETS,
  generateSeedString,
} from '../../data/generator';
import type {
  BenchmarkProgress,
  BenchmarkResultRecord,
  EnvironmentInfo,
  SearchBenchmarkConfig,
  SearchingAlgorithmId,
  SortableField,
  TargetCase,
} from '../../types';
import { CorrectnessBadge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { SearchBenchmarkChart } from './BenchmarkCharts';

interface SearchingBenchmarkTabProps {
  results: readonly BenchmarkResultRecord[];
  isRunning: boolean;
  progress: BenchmarkProgress | null;
  errorMessage: string | null;
  envInfo: EnvironmentInfo;
  onRun: (config: SearchBenchmarkConfig) => void;
  onCancel: () => void;
}

const STANDARD_TARGET_CASES: readonly TargetCase[] = [
  'found-start',
  'found-middle',
  'found-end',
  'not-found',
];

const TARGET_CASE_LABELS: Record<TargetCase, { title: string; subtitle: string }> = {
  'found-start': {
    title: 'Target di Awal',
    subtitle: 'Menguji kasus terbaik Linear Search (indeks awal)',
  },
  'found-middle': {
    title: 'Target di Tengah',
    subtitle: 'Posisi tengah pada dataset terurut / acak',
  },
  'found-end': {
    title: 'Target di Akhir',
    subtitle: 'Menguji kondisi mendekati terburuk Linear Search',
  },
  'not-found': {
    title: 'Target Tidak Ditemukan',
    subtitle: 'Kasus terburuk penuh (memindai seluruh elemen)',
  },
  custom: {
    title: 'Target Kustom',
    subtitle: 'Cari nilai spesifik yang Anda tentukan',
  },
};

const FIELD_OPTIONS: readonly { value: SortableField; label: string }[] = [
  { value: 'kode', label: 'Kode SKU (kode)' },
  { value: 'nama', label: 'Nama Barang (nama)' },
  { value: 'kategori', label: 'Kategori (kategori)' },
  { value: 'stok', label: 'Stok Unit (stok)' },
  { value: 'harga', label: 'Harga Satuan (harga)' },
];

const PHASE_LABELS: Record<BenchmarkProgress['phase'], string> = {
  preparing: 'Menyiapkan dataset snapshot',
  warmup: 'Tahap pemanasan (warm-up)',
  measuring: 'Mengukur waktu pencarian inti',
  validating: 'Memvalidasi kecocokan target',
};

export function SearchingBenchmarkTab({
  results,
  isRunning,
  progress,
  errorMessage,
  envInfo,
  onRun,
  onCancel,
}: SearchingBenchmarkTabProps) {
  const [scenarioChoice, setScenarioChoice] = useState<'kecil' | 'menengah' | 'besar' | 'kustom'>('kecil');
  const [customSizeInput, setCustomSizeInput] = useState<string>('5000');
  const [seed, setSeed] = useState<string>(() => generateSeedString());
  const [field, setField] = useState<SortableField>('kode');
  const [selectedCases, setSelectedCases] = useState<TargetCase[]>([...STANDARD_TARGET_CASES]);
  const [customTarget, setCustomTarget] = useState<string>('');
  const [autoSortForBinary, setAutoSortForBinary] = useState<boolean>(true);
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<SearchingAlgorithmId[]>([
    'linear',
    'binary',
  ]);
  const [warmups, setWarmups] = useState<number>(2);
  const [repeats, setRepeats] = useState<number>(10);
  const [timeoutSec, setTimeoutSec] = useState<number>(15);
  const [validationError, setValidationError] = useState<string | null>(null);

  const resolvedDatasetSize = useMemo(() => {
    if (scenarioChoice === 'kecil') return DATASET_PRESETS.kecil.defaultSize;
    if (scenarioChoice === 'menengah') return DATASET_PRESETS.menengah.defaultSize;
    if (scenarioChoice === 'besar') return DATASET_PRESETS.besar.defaultSize;
    return Number(customSizeInput);
  }, [scenarioChoice, customSizeInput]);

  const toggleAlgorithm = (id: SearchingAlgorithmId) => {
    setSelectedAlgorithms((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
    if (validationError) setValidationError(null);
  };

  const toggleTargetCase = (targetCase: TargetCase) => {
    setSelectedCases((prev) =>
      prev.includes(targetCase)
        ? prev.filter((item) => item !== targetCase)
        : [...prev, targetCase],
    );
    if (validationError) setValidationError(null);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (selectedAlgorithms.length === 0) {
      setValidationError('Pilih minimal 1 algoritma pencarian (Linear atau Binary Search).');
      return;
    }

    if (selectedCases.length === 0) {
      setValidationError('Pilih minimal 1 kasus target pencarian.');
      return;
    }

    if (selectedCases.includes('custom')) {
      const trimmedCustom = customTarget.trim();
      if (trimmedCustom === '') {
        setValidationError('Masukkan nilai target kustom karena opsi Target Kustom dipilih.');
        return;
      }
      if ((field === 'stok' || field === 'harga') && !Number.isFinite(Number(trimmedCustom))) {
        setValidationError(
          `Field "${field}" bertipe numerik; nilai target kustom harus berupa angka yang valid.`,
        );
        return;
      }
    }

    if (
      !Number.isInteger(resolvedDatasetSize) ||
      resolvedDatasetSize < CUSTOM_DATASET_LIMITS.min ||
      resolvedDatasetSize > CUSTOM_DATASET_LIMITS.max
    ) {
      setValidationError(
        `Ukuran dataset harus berupa bilangan bulat antara ${formatNumberID(
          CUSTOM_DATASET_LIMITS.min,
        )} hingga ${formatNumberID(CUSTOM_DATASET_LIMITS.max)} baris.`,
      );
      return;
    }

    if (seed.trim() === '') {
      setValidationError('Seed dataset tidak boleh kosong.');
      return;
    }

    if (!Number.isInteger(warmups) || warmups < 0 || warmups > 5) {
      setValidationError('Jumlah warm-up harus berada di antara 0 hingga 5.');
      return;
    }

    if (!Number.isInteger(repeats) || repeats < 5 || repeats > 30) {
      setValidationError('Jumlah pengulangan pengukuran harus antara 5 hingga 30.');
      return;
    }

    if (!Number.isFinite(timeoutSec) || timeoutSec < 1 || timeoutSec > 120) {
      setValidationError('Batas waktu per pengujian harus antara 1 hingga 120 detik.');
      return;
    }

    setValidationError(null);

    onRun({
      algorithms: selectedAlgorithms,
      datasetSize: resolvedDatasetSize,
      seed: seed.trim(),
      field,
      targetCases: selectedCases,
      customTarget: selectedCases.includes('custom') ? customTarget.trim() : undefined,
      autoSortForBinary,
      warmups,
      repeats,
      timeoutMs: Math.round(timeoutSec * 1000),
    });
  };

  const handleExportCSV = () => {
    if (results.length === 0) return;
    const csv = exportResultsToCSV(results);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    downloadTextFile(`gudangkita-searching-${stamp}.csv`, csv, 'text/csv;charset=utf-8');
  };

  const handleExportJSON = () => {
    if (results.length === 0) return;
    const json = exportResultsToJSON(results, envInfo);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    downloadTextFile(
      `gudangkita-searching-${stamp}.json`,
      json,
      'application/json;charset=utf-8',
    );
  };

  const progressPercent =
    progress && progress.totalSteps > 0
      ? Math.min(100, Math.round((progress.currentStep / progress.totalSteps) * 100))
      : 0;

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-base font-semibold text-slate-900">
            Konfigurasi Pengujian Pencarian (Searching)
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Membandingkan Linear Search O(n) dan Binary Search O(log n) termasuk transparansi biaya
            pengurutan awal (<code className="font-mono">setupMs</code>).
          </p>
        </div>

        {/* Dataset Scenario */}
        <div className="space-y-2.5">
          <span className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
            1. Skenario &amp; Ukuran Dataset (N)
          </span>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
            <button
              type="button"
              disabled={isRunning}
              onClick={() => {
                setScenarioChoice('kecil');
                setValidationError(null);
              }}
              className={`rounded-xl border p-3 text-left transition-all ${
                scenarioChoice === 'kecil'
                  ? 'border-blue-500 bg-blue-50/70 ring-1 ring-blue-500'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <span className="block text-xs font-semibold text-slate-900">
                {DATASET_PRESETS.kecil.label}
              </span>
              <span className="mt-0.5 block font-mono text-sm font-bold text-blue-700">
                {formatNumberID(DATASET_PRESETS.kecil.defaultSize)} baris
              </span>
            </button>

            <button
              type="button"
              disabled={isRunning}
              onClick={() => {
                setScenarioChoice('menengah');
                setValidationError(null);
              }}
              className={`rounded-xl border p-3 text-left transition-all ${
                scenarioChoice === 'menengah'
                  ? 'border-blue-500 bg-blue-50/70 ring-1 ring-blue-500'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <span className="block text-xs font-semibold text-slate-900">
                {DATASET_PRESETS.menengah.label}
              </span>
              <span className="mt-0.5 block font-mono text-sm font-bold text-blue-700">
                {formatNumberID(DATASET_PRESETS.menengah.defaultSize)} baris
              </span>
            </button>

            <button
              type="button"
              disabled={isRunning}
              onClick={() => {
                setScenarioChoice('besar');
                setValidationError(null);
              }}
              className={`rounded-xl border p-3 text-left transition-all ${
                scenarioChoice === 'besar'
                  ? 'border-blue-500 bg-blue-50/70 ring-1 ring-blue-500'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <span className="block text-xs font-semibold text-slate-900">
                {DATASET_PRESETS.besar.label}
              </span>
              <span className="mt-0.5 block font-mono text-sm font-bold text-blue-700">
                {formatNumberID(DATASET_PRESETS.besar.defaultSize)} baris
              </span>
            </button>

            <button
              type="button"
              disabled={isRunning}
              onClick={() => {
                setScenarioChoice('kustom');
                setValidationError(null);
              }}
              className={`rounded-xl border p-3 text-left transition-all ${
                scenarioChoice === 'kustom'
                  ? 'border-blue-500 bg-blue-50/70 ring-1 ring-blue-500'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <span className="block text-xs font-semibold text-slate-900">Ukuran Kustom</span>
              <span className="mt-0.5 block font-mono text-xs font-medium text-slate-600">
                {formatNumberID(CUSTOM_DATASET_LIMITS.min)}–
                {formatNumberID(CUSTOM_DATASET_LIMITS.max)}
              </span>
            </button>
          </div>

          {scenarioChoice === 'kustom' ? (
            <div className="max-w-xs pt-1">
              <label
                htmlFor="search-custom-size"
                className="block text-xs font-medium text-slate-700"
              >
                Jumlah Baris Kustom ({formatNumberID(CUSTOM_DATASET_LIMITS.min)} –{' '}
                {formatNumberID(CUSTOM_DATASET_LIMITS.max)})
              </label>
              <input
                id="search-custom-size"
                type="number"
                min={CUSTOM_DATASET_LIMITS.min}
                max={CUSTOM_DATASET_LIMITS.max}
                step={1}
                disabled={isRunning}
                value={customSizeInput}
                onChange={(event) => {
                  setCustomSizeInput(event.target.value);
                  if (validationError) setValidationError(null);
                }}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          ) : null}
        </div>

        {/* Seed & Key Field */}
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="search-seed" className="block text-xs font-semibold text-slate-700">
              Seed Dataset Deterministik
            </label>
            <div className="mt-1 flex gap-1.5">
              <input
                id="search-seed"
                type="text"
                disabled={isRunning}
                value={seed}
                onChange={(event) => setSeed(event.target.value)}
                className="block min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-xs text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
              <button
                type="button"
                disabled={isRunning}
                onClick={() => setSeed(generateSeedString())}
                title="Buat seed acak baru"
                aria-label="Buat seed acak baru"
                className="inline-flex shrink-0 items-center justify-center rounded-lg border border-slate-300 bg-slate-50 px-2.5 text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                <RefreshCw className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="search-field" className="block text-xs font-semibold text-slate-700">
              Field Kunci Pencarian
            </label>
            <select
              id="search-field"
              disabled={isRunning}
              value={field}
              onChange={(event) => setField(event.target.value as SortableField)}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {FIELD_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Target Cases Selection */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              2. Kasus Target Pencarian ({selectedCases.length} dipilih)
            </span>
            <button
              type="button"
              disabled={isRunning}
              onClick={() => {
                setSelectedCases([...STANDARD_TARGET_CASES]);
                setValidationError(null);
              }}
              className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
            >
              <CheckSquare className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Pilih Semua 4 Kasus Standar</span>
            </button>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
            {(['found-start', 'found-middle', 'found-end', 'not-found', 'custom'] as const).map(
              (targetCase) => {
                const checked = selectedCases.includes(targetCase);
                const info = TARGET_CASE_LABELS[targetCase];
                return (
                  <label
                    key={targetCase}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-colors ${
                      checked
                        ? 'border-blue-300 bg-blue-50/50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={isRunning}
                      checked={checked}
                      onChange={() => toggleTargetCase(targetCase)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="min-w-0">
                      <span className="block text-xs font-semibold text-slate-900">
                        {info.title}
                      </span>
                      <span className="mt-0.5 block text-[11px] leading-snug text-slate-500">
                        {info.subtitle}
                      </span>
                    </div>
                  </label>
                );
              },
            )}
          </div>

          {selectedCases.includes('custom') ? (
            <div className="max-w-md pt-1">
              <label
                htmlFor="search-custom-target"
                className="block text-xs font-medium text-slate-700"
              >
                Nilai Target Kustom untuk Field <code className="font-mono">{field}</code>
              </label>
              <input
                id="search-custom-target"
                type="text"
                disabled={isRunning}
                value={customTarget}
                onChange={(event) => {
                  setCustomTarget(event.target.value);
                  if (validationError) setValidationError(null);
                }}
                placeholder="Masukkan nilai target eksak yang ingin dicari..."
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          ) : null}
        </div>

        {/* Binary Search Prerequisite Info & Toggle */}
        <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-4 text-xs text-amber-950">
          <div className="flex items-start gap-3">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
              aria-hidden="true"
            />
            <div className="flex-1 space-y-2.5">
              <div>
                <p className="text-sm font-semibold text-amber-950">
                  Prasyarat Binary Search: Dataset Harus Terurut Menaik
                </p>
                <p className="mt-0.5 leading-relaxed text-amber-900">
                  Snapshot dataset dibuat dalam kondisi acak (tidak terurut). Binary Search wajib
                  menerima array yang sudah terurut menaik menurut field kunci; bila tidak,
                  pencarian biner tidak valid secara algoritmik.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="flex cursor-pointer items-center gap-2 font-medium">
                  <input
                    type="radio"
                    name="benchmark-binary-autosort"
                    disabled={isRunning}
                    checked={autoSortForBinary}
                    onChange={() => setAutoSortForBinary(true)}
                    className="h-4 w-4 border-amber-400 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    Urutkan salinan otomatis untuk Binary Search dan catat waktu setup terpisah (
                    <code className="font-mono">setupMs</code>)
                  </span>
                </label>

                <label className="flex cursor-pointer items-center gap-2 font-medium">
                  <input
                    type="radio"
                    name="benchmark-binary-autosort"
                    disabled={isRunning}
                    checked={!autoSortForBinary}
                    onChange={() => setAutoSortForBinary(false)}
                    className="h-4 w-4 border-amber-400 text-blue-600 focus:ring-blue-500"
                  />
                  <span>
                    Uji langsung tanpa pengurutan awal — akan gagal prasyarat pada data acak
                  </span>
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Searching Algorithm Selection & Methodology */}
        <div className="grid gap-6 border-t border-slate-100 pt-4 lg:grid-cols-12">
          <div className="space-y-2.5 lg:col-span-5">
            <span className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
              3. Pilih Algoritma Pencarian
            </span>
            <div className="grid gap-2.5 sm:grid-cols-2">
              {SEARCHING_ALGORITHM_LIST.map((algo) => {
                const algoId = algo.id as SearchingAlgorithmId;
                const checked = selectedAlgorithms.includes(algoId);
                return (
                  <label
                    key={algo.id}
                    className={`flex cursor-pointer items-start gap-2.5 rounded-xl border p-3 transition-colors ${
                      checked
                        ? 'border-blue-300 bg-blue-50/50'
                        : 'border-slate-200 bg-white hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      disabled={isRunning}
                      checked={checked}
                      onChange={() => toggleAlgorithm(algoId)}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <div className="min-w-0">
                      <span className="block text-sm font-semibold text-slate-900">{algo.name}</span>
                      <span className="mt-0.5 block font-mono text-[11px] text-slate-500">
                        Rata-rata: {algo.averageComplexity}
                      </span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-3 lg:col-span-7">
            <div>
              <label
                htmlFor="search-warmups"
                className="block text-xs font-semibold text-slate-700"
              >
                Warm-up (0–5)
              </label>
              <input
                id="search-warmups"
                type="number"
                min={0}
                max={5}
                step={1}
                disabled={isRunning}
                value={warmups}
                onChange={(event) => setWarmups(Number(event.target.value))}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label
                htmlFor="search-repeats"
                className="block text-xs font-semibold text-slate-700"
              >
                Pengulangan (5–30)
              </label>
              <input
                id="search-repeats"
                type="number"
                min={5}
                max={30}
                step={1}
                disabled={isRunning}
                value={repeats}
                onChange={(event) => setRepeats(Number(event.target.value))}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div>
              <label
                htmlFor="search-timeout"
                className="block text-xs font-semibold text-slate-700"
              >
                Batas Waktu (Detik)
              </label>
              <input
                id="search-timeout"
                type="number"
                min={1}
                max={120}
                step={1}
                disabled={isRunning}
                value={timeoutSec}
                onChange={(event) => setTimeoutSec(Number(event.target.value))}
                className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>
        </div>

        {validationError ? (
          <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            {validationError}
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
          {isRunning ? (
            <button
              type="button"
              onClick={onCancel}
              className="inline-flex items-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-rose-700"
            >
              <Square className="h-4 w-4" aria-hidden="true" />
              <span>Batal</span>
            </button>
          ) : (
            <button
              type="submit"
              className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-blue-700"
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              <span>Jalankan Perbandingan Pencarian</span>
            </button>
          )}
        </div>
      </form>

      {/* Live Progress Bar */}
      {isRunning && progress && progress.mode === 'searching' ? (
        <div
          role="status"
          aria-live="polite"
          className="rounded-xl border border-blue-200 bg-blue-50 p-4 shadow-sm"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs font-semibold text-blue-900">
            <span>
              Sedang menguji: <strong>{progress.currentAlgorithmName}</strong> •{' '}
              {PHASE_LABELS[progress.phase]}
            </span>
            <span className="font-mono tabular-nums">
              Langkah {progress.currentStep}/{progress.totalSteps} • Iterasi{' '}
              {progress.currentIteration}/{progress.totalIterations} ({progressPercent}%)
            </span>
          </div>
          <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-blue-200">
            <div
              className="h-full rounded-full bg-blue-600 transition-all duration-200"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <p className="mt-1.5 text-xs text-blue-800">{progress.message}</p>
        </div>
      ) : null}

      {errorMessage ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          {errorMessage}
        </div>
      ) : null}

      {/* Output Table & Charts */}
      {results.length === 0 ? (
        !isRunning ? (
          <EmptyState
            title="Belum ada hasil pengujian pencarian"
            description="Pilih skenario, kasus target, dan konfigurasi Binary Search di atas lalu jalankan pengujian untuk melihat perbandingannya."
          />
        ) : null
      ) : (
        <div className="space-y-6">
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Tabel Hasil Perbandingan Searching
                </h3>
                <p className="text-xs text-slate-500">
                  Menampilkan waktu pencarian murni dan biaya persiapan pengurutan awal (
                  <code className="font-mono">setupMs</code>) secara terpisah.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
                  <span>Ekspor CSV</span>
                </button>
                <button
                  type="button"
                  onClick={handleExportJSON}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <FileJson className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
                  <span>Ekspor JSON</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                  <tr>
                    <th scope="col" className="px-4 py-3">
                      Kasus Target
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Nilai Target
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Algoritma
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Pencarian Median
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Persiapan Sort (setupMs)
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Status Ditemukan
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Validasi
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Catatan
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {results.map((record) => {
                    const targetTitle = record.targetCase
                      ? TARGET_CASE_LABELS[record.targetCase]?.title ?? record.targetCase
                      : '—';

                    let foundSummary = 'Tidak Ditemukan';
                    if (record.correctness === 'precondition-error') {
                      foundSummary = 'Ditolak (Belum Terurut)';
                    } else if (record.found) {
                      const idxText =
                        record.matchedIndex !== undefined ? `Indeks ${record.matchedIndex}` : 'Ada';
                      const codeText = record.matchedCode ? `, ${record.matchedCode}` : '';
                      foundSummary = `Ditemukan (${idxText}${codeText})`;
                    }

                    return (
                      <tr key={record.id} className="hover:bg-slate-50/70">
                        <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-900">
                          {targetTitle}
                        </td>
                        <td className="max-w-[10rem] truncate px-4 py-3 font-mono text-xs text-slate-700">
                          {record.targetValue || '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                          {record.algorithmName}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs font-bold text-slate-900 tabular-nums">
                          {formatDuration(record.medianMs)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs text-slate-700 tabular-nums">
                          {record.setupMs > 0 ? formatDuration(record.setupMs) : '0 ms'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-700">
                          {foundSummary}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <CorrectnessBadge status={record.correctness} />
                        </td>
                        <td className="max-w-xs px-4 py-3 text-xs text-slate-600">
                          {record.notes || '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>

          <SearchBenchmarkChart results={results} />
        </div>
      )}
    </div>
  );
}
