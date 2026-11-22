import { useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  FileJson,
  FileSpreadsheet,
  Play,
  RefreshCw,
  Square,
} from 'lucide-react';
import { SORTING_ALGORITHMS, SORTING_ALGORITHM_LIST } from '../../algorithms/sorting';
import { downloadTextFile, exportResultsToCSV, exportResultsToJSON } from '../../benchmark/exporter';
import { formatDuration, formatNumberID } from '../../benchmark/metrics';
import {
  CUSTOM_DATASET_LIMITS,
  DATASET_PRESETS,
  classifyScenario,
  generateSeedString,
} from '../../data/generator';
import type {
  BenchmarkProgress,
  BenchmarkResultRecord,
  DatasetScenario,
  EnvironmentInfo,
  InputDistribution,
  SortBenchmarkConfig,
  SortOrder,
  SortableField,
  SortingAlgorithmId,
} from '../../types';
import { CorrectnessBadge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { SortBenchmarkChart } from './BenchmarkCharts';

interface SortingBenchmarkTabProps {
  results: readonly BenchmarkResultRecord[];
  isRunning: boolean;
  progress: BenchmarkProgress | null;
  errorMessage: string | null;
  envInfo: EnvironmentInfo;
  onRun: (config: SortBenchmarkConfig) => void;
  onCancel: () => void;
}

const DISTRIBUTION_OPTIONS: readonly { value: InputDistribution; label: string; hint: string }[] = [
  { value: 'random', label: 'Acak (Random)', hint: 'Merepresentasikan kondisi umum tidak terurut' },
  { value: 'sorted', label: 'Sudah Terurut', hint: 'Kasus terbaik untuk Insertion Sort adaptif' },
  {
    value: 'reversed',
    label: 'Urutan Terbalik',
    hint: 'Menguji kasus terburuk beberapa algoritma O(n²)',
  },
];

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
  measuring: 'Mengukur waktu eksekusi inti',
  validating: 'Memvalidasi kebenaran hasil',
};

const SCENARIO_LABELS: Record<DatasetScenario, string> = {
  kecil: 'Kecil',
  menengah: 'Menengah',
  besar: 'Besar',
  kustom: 'Kustom',
};

export function SortingBenchmarkTab({
  results,
  isRunning,
  progress,
  errorMessage,
  envInfo,
  onRun,
  onCancel,
}: SortingBenchmarkTabProps) {
  const [scenarioChoice, setScenarioChoice] = useState<'kecil' | 'menengah' | 'besar' | 'besar-20k' | 'kustom'>('kecil');
  const [customSizeInput, setCustomSizeInput] = useState<string>('5000');
  const [seed, setSeed] = useState<string>(() => generateSeedString());
  const [distribution, setDistribution] = useState<InputDistribution>('random');
  const [field, setField] = useState<SortableField>('harga');
  const [order, setOrder] = useState<SortOrder>('asc');
  const [selectedAlgorithms, setSelectedAlgorithms] = useState<SortingAlgorithmId[]>([
    'bubble',
    'selection',
    'insertion',
    'merge',
    'quick',
    'native',
  ]);
  const [warmups, setWarmups] = useState<number>(1);
  const [repeats, setRepeats] = useState<number>(10);
  const [timeoutSec, setTimeoutSec] = useState<number>(15);
  const [validationError, setValidationError] = useState<string | null>(null);

  const resolvedDatasetSize = useMemo(() => {
    if (scenarioChoice === 'kecil') return DATASET_PRESETS.kecil.defaultSize;
    if (scenarioChoice === 'menengah') return DATASET_PRESETS.menengah.defaultSize;
    if (scenarioChoice === 'besar') return DATASET_PRESETS.besar.defaultSize;
    if (scenarioChoice === 'besar-20k') {
      const quick = DATASET_PRESETS.besar.quickOptions;
      return quick && quick.includes(20000) ? 20000 : 20000;
    }
    return Number(customSizeInput);
  }, [scenarioChoice, customSizeInput]);

  const hasQuadraticSelected = useMemo(
    () => selectedAlgorithms.some((id) => Boolean(SORTING_ALGORITHMS[id]?.isQuadratic)),
    [selectedAlgorithms],
  );

  const showQuadraticWarning =
    hasQuadraticSelected && Number.isFinite(resolvedDatasetSize) && resolvedDatasetSize >= 10000;

  const toggleAlgorithm = (id: SortingAlgorithmId) => {
    setSelectedAlgorithms((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
    if (validationError) setValidationError(null);
  };

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    if (selectedAlgorithms.length === 0) {
      setValidationError('Pilih minimal 1 algoritma pengurutan untuk diuji.');
      return;
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
      setValidationError('Batas waktu per algoritma harus antara 1 hingga 120 detik.');
      return;
    }

    setValidationError(null);

    onRun({
      algorithms: selectedAlgorithms,
      datasetSize: resolvedDatasetSize,
      seed: seed.trim(),
      distribution,
      field,
      order,
      warmups,
      repeats,
      timeoutMs: Math.round(timeoutSec * 1000),
    });
  };

  const handleExportCSV = () => {
    if (results.length === 0) return;
    const csv = exportResultsToCSV(results);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    downloadTextFile(`gudangkita-sorting-${stamp}.csv`, csv, 'text/csv;charset=utf-8');
  };

  const handleExportJSON = () => {
    if (results.length === 0) return;
    const json = exportResultsToJSON(results, envInfo);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    downloadTextFile(
      `gudangkita-sorting-${stamp}.json`,
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
      {/* Configuration Form */}
      <form
        onSubmit={handleSubmit}
        className="space-y-6 rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-base font-semibold text-slate-900">
            Konfigurasi Pengujian Pengurutan (Sorting)
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            Seluruh algoritma menerima salinan dataset snapshot ber-seed identik di dalam Web Worker
            terpisah.
          </p>
        </div>

        {/* Scenario & Size */}
        <div className="space-y-2.5">
          <span className="block text-xs font-semibold uppercase tracking-wide text-slate-600">
            1. Skenario &amp; Ukuran Dataset (N)
          </span>
          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-5">
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
                setScenarioChoice('besar-20k');
                setValidationError(null);
              }}
              className={`rounded-xl border p-3 text-left transition-all ${
                scenarioChoice === 'besar-20k'
                  ? 'border-blue-500 bg-blue-50/70 ring-1 ring-blue-500'
                  : 'border-slate-200 bg-white hover:bg-slate-50'
              }`}
            >
              <span className="block text-xs font-semibold text-slate-900">Opsi Cepat Besar</span>
              <span className="mt-0.5 block font-mono text-sm font-bold text-blue-700">
                20.000 baris
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
                htmlFor="sort-custom-size"
                className="block text-xs font-medium text-slate-700"
              >
                Jumlah Baris Kustom ({formatNumberID(CUSTOM_DATASET_LIMITS.min)} –{' '}
                {formatNumberID(CUSTOM_DATASET_LIMITS.max)})
              </label>
              <input
                id="sort-custom-size"
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

        {/* Seed, Distribution, Field, Order */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label htmlFor="sort-seed" className="block text-xs font-semibold text-slate-700">
              Seed Dataset Deterministik
            </label>
            <div className="mt-1 flex gap-1.5">
              <input
                id="sort-seed"
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
            <label
              htmlFor="sort-distribution"
              className="block text-xs font-semibold text-slate-700"
            >
              Distribusi Input Awal
            </label>
            <select
              id="sort-distribution"
              disabled={isRunning}
              value={distribution}
              onChange={(event) => setDistribution(event.target.value as InputDistribution)}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {DISTRIBUTION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="sort-field" className="block text-xs font-semibold text-slate-700">
              Atribut Pengurutan
            </label>
            <select
              id="sort-field"
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

          <div>
            <label htmlFor="sort-order" className="block text-xs font-semibold text-slate-700">
              Arah Pengurutan
            </label>
            <select
              id="sort-order"
              disabled={isRunning}
              value={order}
              onChange={(event) => setOrder(event.target.value as SortOrder)}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="asc">Naik (A–Z / Kecil–Besar)</option>
              <option value="desc">Turun (Z–A / Besar–Kecil)</option>
            </select>
          </div>
        </div>

        {/* Algorithm Checklist */}
        <div className="space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">
              2. Pilih Algoritma Sorting ({selectedAlgorithms.length} dipilih)
            </span>
            <div className="flex items-center gap-3 text-xs">
              <button
                type="button"
                disabled={isRunning}
                onClick={() =>
                  setSelectedAlgorithms(
                    SORTING_ALGORITHM_LIST.map((a) => a.id as SortingAlgorithmId),
                  )
                }
                className="font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-50"
              >
                Pilih Semua
              </button>
              <button
                type="button"
                disabled={isRunning}
                onClick={() => setSelectedAlgorithms(['merge', 'quick', 'native'])}
                className="font-semibold text-slate-600 hover:text-slate-900 disabled:opacity-50"
              >
                Hanya O(n log n)
              </button>
            </div>
          </div>

          <div className="grid gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
            {SORTING_ALGORITHM_LIST.map((algo) => {
              const algoId = algo.id as SortingAlgorithmId;
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
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="text-sm font-semibold text-slate-900">{algo.name}</span>
                      {algo.isOptionalBaseline ? (
                        <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                          Pembanding Praktis
                        </span>
                      ) : null}
                      {algo.isQuadratic ? (
                        <span className="rounded bg-amber-100 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-amber-800">
                          O(n²)
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 font-mono text-[11px] text-slate-500">
                      Rata-rata: {algo.averageComplexity} • {algo.stable ? 'Stabil' : 'Tidak Stabil'}
                    </p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>

        {/* Quadratic Warning on N >= 10000 */}
        {showQuadraticWarning ? (
          <div
            role="alert"
            className="flex items-start gap-3 rounded-xl border-2 border-amber-300 bg-amber-50 p-4 text-xs text-amber-950 sm:text-sm"
          >
            <AlertTriangle
              className="mt-0.5 h-5 w-5 shrink-0 text-amber-600"
              aria-hidden="true"
            />
            <div>
              <p className="font-bold">
                Peringatan Komputasi Kuadratik O(n²) pada {formatNumberID(resolvedDatasetSize)} Baris
              </p>
              <p className="mt-1 leading-relaxed text-amber-900">
                Anda memilih algoritma O(n²) (Bubble, Selection, atau Insertion Sort) untuk ukuran
                dataset &ge; 10.000 baris. Waktu eksekusi dapat meningkat drastis atau menyentuh batas
                waktu ({timeoutSec} detik). Pengujian berjalan di Web Worker terpisah sehingga UI
                tetap responsif dan tombol <strong>Batal</strong> dapat digunakan kapan saja.
              </p>
            </div>
          </div>
        ) : null}

        {/* Methodology Settings */}
        <div className="grid gap-4 border-t border-slate-100 pt-4 sm:grid-cols-3">
          <div>
            <label htmlFor="sort-warmups" className="block text-xs font-semibold text-slate-700">
              Jumlah Warm-up (0–5)
            </label>
            <input
              id="sort-warmups"
              type="number"
              min={0}
              max={5}
              step={1}
              disabled={isRunning}
              value={warmups}
              onChange={(event) => setWarmups(Number(event.target.value))}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="mt-1 text-[11px] text-slate-500">Tidak dihitung dalam statistik hasil.</p>
          </div>

          <div>
            <label htmlFor="sort-repeats" className="block text-xs font-semibold text-slate-700">
              Pengulangan Pengukuran (5–30)
            </label>
            <input
              id="sort-repeats"
              type="number"
              min={5}
              max={30}
              step={1}
              disabled={isRunning}
              value={repeats}
              onChange={(event) => setRepeats(Number(event.target.value))}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="mt-1 text-[11px] text-slate-500">Median &amp; min–maks dihitung dari ini.</p>
          </div>

          <div>
            <label htmlFor="sort-timeout" className="block text-xs font-semibold text-slate-700">
              Batas Waktu per Algoritma (Detik)
            </label>
            <input
              id="sort-timeout"
              type="number"
              min={1}
              max={120}
              step={1}
              disabled={isRunning}
              value={timeoutSec}
              onChange={(event) => setTimeoutSec(Number(event.target.value))}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 font-mono text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
            <p className="mt-1 text-[11px] text-slate-500">Default 15 detik agar aman dari hang.</p>
          </div>
        </div>

        {validationError ? (
          <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
            {validationError}
          </p>
        ) : null}

        {/* Execution Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-500">
            Distribusi aktif:{' '}
            <strong>
              {DISTRIBUTION_OPTIONS.find((d) => d.value === distribution)?.hint}
            </strong>
          </p>

          <div className="flex items-center gap-2.5">
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
                <span>Jalankan Perbandingan</span>
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Live Progress Bar */}
      {isRunning && progress && progress.mode === 'sorting' ? (
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

      {/* Error / Cancellation Notice */}
      {errorMessage ? (
        <div
          role="alert"
          className="rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
        >
          {errorMessage}
        </div>
      ) : null}

      {/* Results Section */}
      {results.length === 0 ? (
        !isRunning ? (
          <EmptyState
            title="Belum ada hasil pengujian pengurutan"
            description="Atur parameter dataset di atas lalu tekan tombol Jalankan Perbandingan untuk mengukur performa algoritma pengurutan secara empiris."
          />
        ) : null
      ) : (
        <div className="space-y-6">
          {/* Table + Export Buttons */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">
                  Tabel Hasil Perbandingan Sorting
                </h3>
                <p className="text-xs text-slate-500">
                  Menampilkan statistik median, rentang min–maks, serta status validasi
                  kebenaran urutan.
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
                      Algoritma
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Kompleksitas
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Stabilitas
                    </th>
                    <th scope="col" className="px-4 py-3">
                      Skenario &amp; N
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Pengulangan
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Median
                    </th>
                    <th scope="col" className="px-4 py-3 text-right">
                      Rentang Min–Maks
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
                    const meta = SORTING_ALGORITHMS[record.algorithm as SortingAlgorithmId];
                    const scenarioLabel = SCENARIO_LABELS[classifyScenario(record.datasetSize)];
                    return (
                      <tr key={record.id} className="hover:bg-slate-50/70">
                        <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">
                          {record.algorithmName}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-600">
                          {meta ? `${meta.averageComplexity} / ${meta.worstComplexity}` : '—'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-700">
                          {meta?.stable ? 'Stabil' : 'Tidak Stabil'}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-700">
                          {scenarioLabel} (
                          <span className="font-mono">{formatNumberID(record.datasetSize)}</span>)
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs text-slate-700 tabular-nums">
                          {record.repeats}x
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs font-bold text-slate-900 tabular-nums">
                          {formatDuration(record.medianMs)}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                          {record.minMs !== null && record.maxMs !== null
                            ? `${formatDuration(record.minMs)} – ${formatDuration(record.maxMs)}`
                            : '—'}
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

          <SortBenchmarkChart results={results} />
        </div>
      )}
    </div>
  );
}
