import { useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, Info, TrendingUp } from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { SEARCHING_ALGORITHMS } from '../../algorithms/searching';
import { SORTING_ALGORITHMS } from '../../algorithms/sorting';
import { formatDuration, formatNumberID } from '../../benchmark/metrics';
import type {
  AlgorithmId,
  BenchmarkMode,
  BenchmarkResultRecord,
  SearchingAlgorithmId,
  SortingAlgorithmId,
  TargetCase,
} from '../../types';
import { EmptyState } from '../common/EmptyState';

type ScaleMode = 'linear' | 'log';

const LOG_MIN_VALUE = 0.001;
const SMALL_VALUE_WARNING_THRESHOLD = 0.01;

const TARGET_CASE_LABELS: Record<TargetCase | '', string> = {
  'found-start': 'Awal',
  'found-middle': 'Tengah',
  'found-end': 'Akhir',
  'not-found': 'Tidak Ditemukan',
  custom: 'Kustom',
  '': 'Lainnya',
};

const ALGORITHM_COLORS: Record<AlgorithmId, string> = {
  bubble: '#f97316',
  selection: '#ef4444',
  insertion: '#eab308',
  merge: '#2563eb',
  quick: '#0d9488',
  native: '#6366f1',
  linear: '#f59e0b',
  binary: '#2563eb',
};

const ALGORITHM_DASHES: Record<AlgorithmId, string | undefined> = {
  bubble: '6 3',
  selection: '2 2',
  insertion: '8 4 2 4',
  merge: undefined,
  quick: '5 2',
  native: '3 3',
  linear: '6 3',
  binary: undefined,
};

function getAlgorithmComplexityLabel(algorithm: AlgorithmId): string {
  if (algorithm === 'linear' || algorithm === 'binary') {
    const meta = SEARCHING_ALGORITHMS[algorithm as SearchingAlgorithmId];
    return `${meta.averageComplexity} (Terburuk: ${meta.worstComplexity})`;
  }
  const meta = SORTING_ALGORITHMS[algorithm as SortingAlgorithmId];
  return `${meta.averageComplexity} (Terburuk: ${meta.worstComplexity})`;
}

interface ScaleToggleProps {
  scale: ScaleMode;
  onChange: (next: ScaleMode) => void;
  idPrefix: string;
}

function ScaleToggle({ scale, onChange, idPrefix }: ScaleToggleProps) {
  return (
    <div
      role="group"
      aria-label="Pilih skala sumbu vertikal"
      className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs"
    >
      <button
        id={`${idPrefix}-scale-linear`}
        type="button"
        onClick={() => onChange('linear')}
        aria-pressed={scale === 'linear'}
        className={`rounded-md px-3 py-1 font-medium transition-colors ${
          scale === 'linear'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        Skala Linear
      </button>
      <button
        id={`${idPrefix}-scale-log`}
        type="button"
        onClick={() => onChange('log')}
        aria-pressed={scale === 'log'}
        className={`rounded-md px-3 py-1 font-medium transition-colors ${
          scale === 'log'
            ? 'bg-white text-slate-900 shadow-sm'
            : 'text-slate-600 hover:text-slate-900'
        }`}
      >
        Skala Logaritmik
      </button>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 1. SortBenchmarkChart                                                      */
/* -------------------------------------------------------------------------- */

interface SortChartDatum {
  algorithm: SortingAlgorithmId;
  algorithmName: string;
  actualMedianMs: number;
  plotMedianMs: number;
  minMs: number;
  maxMs: number;
  complexity: string;
  datasetSize: number;
  distribution: string;
  color: string;
}

interface SortTooltipPayloadItem {
  payload?: SortChartDatum;
}

function SortChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: SortTooltipPayloadItem[];
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <p className="font-semibold text-slate-900">{row.algorithmName}</p>
      <p className="mt-0.5 font-mono text-[11px] text-slate-500">
        Kompleksitas: {row.complexity}
      </p>
      <div className="mt-2 space-y-1 text-slate-700">
        <div className="flex items-center justify-between gap-4">
          <span>Median Waktu:</span>
          <span className="font-mono font-bold text-blue-700 tabular-nums">
            {formatDuration(row.actualMedianMs)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Rentang Min–Maks:</span>
          <span className="font-mono tabular-nums">
            {formatDuration(row.minMs)} – {formatDuration(row.maxMs)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-1 text-slate-500">
          <span>Dataset:</span>
          <span className="font-mono">{formatNumberID(row.datasetSize)} baris</span>
        </div>
      </div>
    </div>
  );
}

interface SortBenchmarkChartProps {
  results: readonly BenchmarkResultRecord[];
}

export function SortBenchmarkChart({ results }: SortBenchmarkChartProps) {
  const [scaleMode, setScaleMode] = useState<ScaleMode>('linear');

  const validResults = useMemo(
    () => results.filter((r) => r.correctness === 'valid' && r.medianMs !== null),
    [results],
  );

  const excludedResults = useMemo(
    () => results.filter((r) => r.correctness !== 'valid' || r.medianMs === null),
    [results],
  );

  const allBelowWarningThreshold = useMemo(
    () =>
      validResults.length > 0 &&
      validResults.every((r) => (r.medianMs ?? 0) < SMALL_VALUE_WARNING_THRESHOLD),
    [validResults],
  );

  const chartData = useMemo<SortChartDatum[]>(() => {
    return validResults.map((r) => {
      const actual = r.medianMs ?? 0;
      const algoId = r.algorithm as SortingAlgorithmId;
      return {
        algorithm: algoId,
        algorithmName: r.algorithmName,
        actualMedianMs: actual,
        plotMedianMs: scaleMode === 'log' ? Math.max(actual, LOG_MIN_VALUE) : actual,
        minMs: r.minMs ?? actual,
        maxMs: r.maxMs ?? actual,
        complexity: getAlgorithmComplexityLabel(algoId),
        datasetSize: r.datasetSize,
        distribution: r.distribution,
        color: ALGORITHM_COLORS[algoId] ?? '#2563eb',
      };
    });
  }, [validResults, scaleMode]);

  if (results.length === 0) {
    return null;
  }

  if (validResults.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-6 w-6" aria-hidden="true" />}
        title="Tidak ada hasil valid untuk divisualisasikan"
        description="Seluruh algoritma pada eksekusi ini berstatus timeout, gagal, atau tidak memenuhi prasyarat. Kurangi ukuran dataset atau naikkan batas waktu."
      />
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Grafik Perbandingan Median Waktu Pengurutan
          </h3>
          <p className="text-xs text-slate-500">
            Hanya menampilkan algoritma dengan status validasi <strong>Valid</strong>. Nilai lebih
            rendah berarti lebih cepat.
          </p>
        </div>

        <ScaleToggle scale={scaleMode} onChange={setScaleMode} idPrefix="sort-chart" />
      </div>

      {excludedResults.length > 0 ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <p>
            Algoritma berikut dikecualikan dari grafik karena tidak berstatus Valid:{' '}
            <strong>{excludedResults.map((r) => r.algorithmName).join(', ')}</strong>.
          </p>
        </div>
      ) : null}

      {scaleMode === 'log' && allBelowWarningThreshold ? (
        <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3.5 py-2.5 text-xs text-orange-900">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-orange-600"
            aria-hidden="true"
          />
          <p>
            Seluruh nilai median berada di bawah <strong>0,01 ms</strong>. Pada skala logaritmik,
            nilai yang sangat kecil di-clamp ke 0,001 ms agar tetap positif. Disarankan
            menggunakan <strong>Skala Linear</strong> agar perbandingan lebih proporsional.
          </p>
        </div>
      ) : null}

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 28, right: 20, left: 10, bottom: 18 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
            <XAxis
              dataKey="algorithmName"
              tick={{ fontSize: 11, fill: '#334155' }}
              interval={0}
              height={42}
            />
            <YAxis
              scale={scaleMode === 'log' ? 'log' : 'auto'}
              domain={
                scaleMode === 'log'
                  ? ([, dataMax]: [number, number]) => [
                      LOG_MIN_VALUE,
                      Math.max(0.01, dataMax * 1.45),
                    ]
                  : ([, dataMax]: [number, number]) => [0, dataMax > 0 ? dataMax * 1.2 : 1]
              }
              allowDataOverflow={false}
              tick={{ fontSize: 11, fill: '#475569' }}
              tickFormatter={(value: number) => `${Number(value).toFixed(value < 1 ? 3 : 1)} ms`}
              width={72}
            />
            <Tooltip content={<SortChartTooltip />} />
            <Bar dataKey="plotMedianMs" name="Median (ms)" radius={[6, 6, 0, 0]} maxBarSize={54}>
              {chartData.map((entry) => (
                <Cell key={entry.algorithm} fill={entry.color} />
              ))}
              <LabelList
                dataKey="actualMedianMs"
                position="top"
                fill="#1e293b"
                fontSize={11}
                fontWeight={600}
                formatter={(value: unknown) =>
                  typeof value === 'number' ? formatDuration(value) : ''
                }
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 2. SearchBenchmarkChart                                                    */
/* -------------------------------------------------------------------------- */

interface SearchCaseRow {
  caseKey: string;
  caseLabel: string;
  linearActualMs?: number;
  linearPlotMs?: number;
  linearMinMs?: number;
  linearMaxMs?: number;
  binaryActualMs?: number;
  binaryPlotMs?: number;
  binaryMinMs?: number;
  binaryMaxMs?: number;
  binarySetupMs?: number;
}

interface SearchSetupRow {
  label: string;
  algorithmName: string;
  setupMs: number;
  searchMs: number;
}

interface SearchTooltipPayloadItem {
  payload?: SearchCaseRow;
}

function SearchChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: SearchTooltipPayloadItem[];
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <p className="font-semibold text-slate-900">Kasus: {row.caseLabel}</p>
      <div className="mt-2 space-y-2 text-slate-700">
        {row.linearActualMs !== undefined ? (
          <div>
            <p className="font-medium text-amber-700">Linear Search (O(n))</p>
            <p className="font-mono tabular-nums">
              Median: <strong>{formatDuration(row.linearActualMs)}</strong> (Min–Maks:{' '}
              {formatDuration(row.linearMinMs)} – {formatDuration(row.linearMaxMs)})
            </p>
          </div>
        ) : null}
        {row.binaryActualMs !== undefined ? (
          <div>
            <p className="font-medium text-blue-700">Binary Search (O(log n))</p>
            <p className="font-mono tabular-nums">
              Median: <strong>{formatDuration(row.binaryActualMs)}</strong> (Min–Maks:{' '}
              {formatDuration(row.binaryMinMs)} – {formatDuration(row.binaryMaxMs)})
            </p>
            {row.binarySetupMs !== undefined && row.binarySetupMs > 0 ? (
              <p className="font-mono text-slate-500 tabular-nums">
                Biaya sort persiapan: {formatDuration(row.binarySetupMs)}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

interface SetupTooltipPayloadItem {
  payload?: SearchSetupRow;
}

function SetupChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: SetupTooltipPayloadItem[];
}) {
  const row = payload?.[0]?.payload;
  if (!active || !row) return null;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <p className="font-semibold text-slate-900">{row.label}</p>
      <div className="mt-2 space-y-1 text-slate-700">
        <div className="flex items-center justify-between gap-4">
          <span>Biaya Sort Persiapan (setupMs):</span>
          <span className="font-mono font-semibold text-indigo-700 tabular-nums">
            {formatDuration(row.setupMs)}
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Waktu Pencarian Murni (medianMs):</span>
          <span className="font-mono font-semibold text-teal-700 tabular-nums">
            {formatDuration(row.searchMs)}
          </span>
        </div>
      </div>
    </div>
  );
}

interface SearchBenchmarkChartProps {
  results: readonly BenchmarkResultRecord[];
}

export function SearchBenchmarkChart({ results }: SearchBenchmarkChartProps) {
  const [scaleMode, setScaleMode] = useState<ScaleMode>('linear');

  const validResults = useMemo(
    () => results.filter((r) => r.correctness === 'valid' && r.medianMs !== null),
    [results],
  );

  const excludedResults = useMemo(
    () => results.filter((r) => r.correctness !== 'valid' || r.medianMs === null),
    [results],
  );

  const allBelowWarningThreshold = useMemo(
    () =>
      validResults.length > 0 &&
      validResults.every((r) => (r.medianMs ?? 0) < SMALL_VALUE_WARNING_THRESHOLD),
    [validResults],
  );

  const searchCaseData = useMemo<SearchCaseRow[]>(() => {
    const map = new Map<string, SearchCaseRow>();

    for (const r of validResults) {
      const caseKey = `${r.targetCase || 'custom'}::${r.targetValue}`;
      const baseLabel = TARGET_CASE_LABELS[r.targetCase] || 'Target';
      const caseLabel = r.targetValue ? `${baseLabel} (${r.targetValue})` : baseLabel;

      const existing = map.get(caseKey) ?? {
        caseKey,
        caseLabel: caseLabel.length > 26 ? `${baseLabel}` : caseLabel,
      };

      const actual = r.medianMs ?? 0;
      const plotted = scaleMode === 'log' ? Math.max(actual, LOG_MIN_VALUE) : actual;

      if (r.algorithm === 'linear') {
        existing.linearActualMs = actual;
        existing.linearPlotMs = plotted;
        existing.linearMinMs = r.minMs ?? actual;
        existing.linearMaxMs = r.maxMs ?? actual;
      } else if (r.algorithm === 'binary') {
        existing.binaryActualMs = actual;
        existing.binaryPlotMs = plotted;
        existing.binaryMinMs = r.minMs ?? actual;
        existing.binaryMaxMs = r.maxMs ?? actual;
        existing.binarySetupMs = r.setupMs;
      }

      map.set(caseKey, existing);
    }

    return Array.from(map.values());
  }, [validResults, scaleMode]);

  const setupComparisonData = useMemo<SearchSetupRow[]>(() => {
    return validResults
      .filter((r) => r.algorithm === 'binary' || r.setupMs > 0)
      .map((r) => ({
        label: `${r.algorithmName} • ${TARGET_CASE_LABELS[r.targetCase] || 'Target'}`,
        algorithmName: r.algorithmName,
        setupMs: r.setupMs,
        searchMs: r.medianMs ?? 0,
      }));
  }, [validResults]);

  const hasLinear = useMemo(
    () => validResults.some((r) => r.algorithm === 'linear'),
    [validResults],
  );
  const hasBinary = useMemo(
    () => validResults.some((r) => r.algorithm === 'binary'),
    [validResults],
  );

  if (results.length === 0) {
    return null;
  }

  if (validResults.length === 0) {
    return (
      <EmptyState
        icon={<BarChart3 className="h-6 w-6" aria-hidden="true" />}
        title="Tidak ada hasil pencarian valid untuk grafik"
        description="Hasil pada sesi ini mengalami prasyarat tidak terpenuhi, timeout, atau kegagalan validasi. Aktifkan auto-sort untuk Binary Search atau periksa konfigurasi."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Chart 1: Median Search Time (Linear vs Binary) */}
      <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Grafik Waktu Pencarian Murni (Linear vs Binary Search)
            </h3>
            <p className="text-xs text-slate-500">
              Mengukur fungsi pencarian inti saja tanpa memasukkan biaya persiapan pengurutan awal.
            </p>
          </div>

          <ScaleToggle scale={scaleMode} onChange={setScaleMode} idPrefix="search-chart" />
        </div>

        {excludedResults.length > 0 ? (
          <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-xs text-amber-900">
            <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
            <p>
              Sebanyak {excludedResults.length} hasil tidak berstatus Valid (misal: prasyarat
              Binary Search tidak terpenuhi) tidak diplot pada grafik ini, namun tetap terlihat di
              tabel hasil.
            </p>
          </div>
        ) : null}

        {scaleMode === 'log' && allBelowWarningThreshold ? (
          <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3.5 py-2.5 text-xs text-orange-900">
            <AlertTriangle
              className="mt-0.5 h-4 w-4 shrink-0 text-orange-600"
              aria-hidden="true"
            />
            <p>
              Seluruh nilai median pencarian berada di bawah <strong>0,01 ms</strong> dan di-clamp
              minimal ke 0,001 ms pada skala logaritmik. Gunakan <strong>Skala Linear</strong>{' '}
              untuk melihat selisih absolut secara lebih jelas.
            </p>
          </div>
        ) : null}

        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={searchCaseData} margin={{ top: 28, right: 20, left: 10, bottom: 18 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="caseLabel" tick={{ fontSize: 11, fill: '#334155' }} height={40} />
              <YAxis
                scale={scaleMode === 'log' ? 'log' : 'auto'}
                domain={
                  scaleMode === 'log'
                    ? ([, dataMax]: [number, number]) => [
                        LOG_MIN_VALUE,
                        Math.max(0.01, dataMax * 1.45),
                      ]
                    : ([, dataMax]: [number, number]) => [0, dataMax > 0 ? dataMax * 1.22 : 1]
                }
                allowDataOverflow={false}
                tick={{ fontSize: 11, fill: '#475569' }}
                tickFormatter={(value: number) =>
                  `${Number(value).toFixed(value < 1 ? 3 : 2)} ms`
                }
                width={74}
              />
              <Tooltip content={<SearchChartTooltip />} />
              <Legend wrapperStyle={{ fontSize: '12px' }} />
              {hasLinear ? (
                <Bar
                  dataKey="linearPlotMs"
                  name="Linear Search"
                  fill={ALGORITHM_COLORS.linear}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={44}
                >
                  <LabelList
                    dataKey="linearActualMs"
                    position="top"
                    fill="#92400e"
                    fontSize={10}
                    fontWeight={600}
                    formatter={(value: unknown) =>
                      typeof value === 'number' ? formatDuration(value) : ''
                    }
                  />
                </Bar>
              ) : null}
              {hasBinary ? (
                <Bar
                  dataKey="binaryPlotMs"
                  name="Binary Search"
                  fill={ALGORITHM_COLORS.binary}
                  radius={[6, 6, 0, 0]}
                  maxBarSize={44}
                >
                  <LabelList
                    dataKey="binaryActualMs"
                    position="top"
                    fill="#1e40af"
                    fontSize={10}
                    fontWeight={600}
                    formatter={(value: unknown) =>
                      typeof value === 'number' ? formatDuration(value) : ''
                    }
                  />
                </Bar>
              ) : null}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: Setup Sorting Cost vs Pure Search Cost */}
      {setupComparisonData.length > 0 ? (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div>
            <h3 className="text-base font-semibold text-slate-900">
              Perbandingan Biaya Persiapan Sorting (<code className="font-mono text-sm">setupMs</code>) vs Pencarian Murni
            </h3>
            <p className="text-xs text-slate-500">
              Menunjukkan biaya satu kali pengurutan awal agar Binary Search dapat berjalan,
              dibandingkan waktu satu kali pencarian biner.
            </p>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={setupComparisonData}
                margin={{ top: 24, right: 20, left: 10, bottom: 18 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#334155' }} height={40} />
                <YAxis
                  domain={([, dataMax]: [number, number]) => [
                    0,
                    dataMax > 0 ? dataMax * 1.2 : 1,
                  ]}
                  tick={{ fontSize: 11, fill: '#475569' }}
                  tickFormatter={(value: number) =>
                    `${Number(value).toFixed(value < 1 ? 3 : 2)} ms`
                  }
                  width={74}
                />
                <Tooltip content={<SetupChartTooltip />} />
                <Legend wrapperStyle={{ fontSize: '12px' }} />
                <Bar
                  dataKey="setupMs"
                  name="Biaya Persiapan Sorting (setupMs)"
                  fill="#6366f1"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={44}
                >
                  <LabelList
                    dataKey="setupMs"
                    position="top"
                    fill="#3730a3"
                    fontSize={10}
                    fontWeight={600}
                    formatter={(value: unknown) =>
                      typeof value === 'number' ? formatDuration(value) : ''
                    }
                  />
                </Bar>
                <Bar
                  dataKey="searchMs"
                  name="Waktu Pencarian Murni (medianMs)"
                  fill="#0d9488"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={44}
                >
                  <LabelList
                    dataKey="searchMs"
                    position="top"
                    fill="#115e59"
                    fontSize={10}
                    fontWeight={600}
                    formatter={(value: unknown) =>
                      typeof value === 'number' ? formatDuration(value) : ''
                    }
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* 3. GrowthCurveChart                                                        */
/* -------------------------------------------------------------------------- */

interface GrowthPoint {
  datasetSize: number;
  [algorithmKey: string]: number | undefined;
}

interface GrowthTooltipPayloadItem {
  name?: string;
  value?: number;
  color?: string;
  dataKey?: string;
}

function GrowthChartTooltip({
  active,
  payload,
  label,
  actualLookup,
}: {
  active?: boolean;
  payload?: GrowthTooltipPayloadItem[];
  label?: number | string;
  actualLookup: Map<string, number>;
}) {
  if (!active || !payload || payload.length === 0) return null;

  const sizeNum = Number(label);
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <p className="font-semibold text-slate-900">
        Ukuran Dataset: <span className="font-mono">{formatNumberID(sizeNum)} baris</span>
      </p>
      <div className="mt-2 space-y-1">
        {payload.map((entry) => {
          const algoKey = String(entry.dataKey ?? '');
          const actual = actualLookup.get(`${sizeNum}::${algoKey}`);
          return (
            <div key={algoKey} className="flex items-center justify-between gap-4">
              <span className="flex items-center gap-1.5 text-slate-700">
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: entry.color }}
                />
                <span>{entry.name}</span>
              </span>
              <span className="font-mono font-semibold text-slate-900 tabular-nums">
                {actual !== undefined ? formatDuration(actual) : '—'}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function computeNumericMedian(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid] ?? 0;
  }
  return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
}

interface GrowthCurveChartProps {
  results: readonly BenchmarkResultRecord[];
}

export function GrowthCurveChart({ results }: GrowthCurveChartProps) {
  const [selectedMode, setSelectedMode] = useState<BenchmarkMode>('sorting');
  const [scaleMode, setScaleMode] = useState<ScaleMode>('linear');

  const validByMode = useMemo(() => {
    const sorting = results.filter(
      (r) => r.mode === 'sorting' && r.correctness === 'valid' && r.medianMs !== null,
    );
    const searching = results.filter(
      (r) => r.mode === 'searching' && r.correctness === 'valid' && r.medianMs !== null,
    );
    return { sorting, searching };
  }, [results]);

  const sortingSizeCount = useMemo(
    () => new Set(validByMode.sorting.map((r) => r.datasetSize)).size,
    [validByMode.sorting],
  );
  const searchingSizeCount = useMemo(
    () => new Set(validByMode.searching.map((r) => r.datasetSize)).size,
    [validByMode.searching],
  );

  const effectiveMode: BenchmarkMode =
    selectedMode === 'sorting' && sortingSizeCount < 2 && searchingSizeCount >= 2
      ? 'searching'
      : selectedMode === 'searching' && searchingSizeCount < 2 && sortingSizeCount >= 2
        ? 'sorting'
        : selectedMode;

  const activeRecords =
    effectiveMode === 'sorting' ? validByMode.sorting : validByMode.searching;

  const { points, algorithms, actualLookup, allBelowWarningThreshold } = useMemo(() => {
    const bySizeAndAlgo = new Map<number, Map<AlgorithmId, number[]>>();
    const algoNames = new Map<AlgorithmId, string>();

    for (const r of activeRecords) {
      if (r.medianMs === null) continue;
      algoNames.set(r.algorithm, r.algorithmName);
      const sizeMap = bySizeAndAlgo.get(r.datasetSize) ?? new Map<AlgorithmId, number[]>();
      const list = sizeMap.get(r.algorithm) ?? [];
      list.push(r.medianMs);
      sizeMap.set(r.algorithm, list);
      bySizeAndAlgo.set(r.datasetSize, sizeMap);
    }

    const sortedSizes = Array.from(bySizeAndAlgo.keys()).sort((a, b) => a - b);
    const lookup = new Map<string, number>();
    const allValues: number[] = [];

    const chartPoints: GrowthPoint[] = sortedSizes.map((size) => {
      const point: GrowthPoint = { datasetSize: size };
      const sizeMap = bySizeAndAlgo.get(size);
      if (sizeMap) {
        for (const [algo, samples] of sizeMap.entries()) {
          const med = computeNumericMedian(samples);
          lookup.set(`${size}::${algo}`, med);
          allValues.push(med);
          point[algo] = scaleMode === 'log' ? Math.max(med, LOG_MIN_VALUE) : med;
        }
      }
      return point;
    });

    const algoList = Array.from(algoNames.entries()).map(([id, name]) => ({ id, name }));
    const belowThreshold =
      allValues.length > 0 && allValues.every((val) => val < SMALL_VALUE_WARNING_THRESHOLD);

    return {
      points: chartPoints,
      algorithms: algoList,
      actualLookup: lookup,
      allBelowWarningThreshold: belowThreshold,
    };
  }, [activeRecords, scaleMode]);

  const activeSizeCount = effectiveMode === 'sorting' ? sortingSizeCount : searchingSizeCount;

  if (sortingSizeCount < 2 && searchingSizeCount < 2) {
    return (
      <EmptyState
        icon={<TrendingUp className="h-6 w-6" aria-hidden="true" />}
        title="Kurva Pertumbuhan Memerlukan Minimal 2 Ukuran Dataset"
        description="Jalankan pengujian pada minimal dua ukuran dataset berbeda (misal: 500 dan 3.000, atau 10.000 baris) untuk memvisualisasikan tren pertumbuhan waktu terhadap N."
      />
    );
  }

  return (
    <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h3 className="text-base font-semibold text-slate-900">
            Kurva Pertumbuhan Waktu Terhadap Ukuran Dataset (N)
          </h3>
          <p className="text-xs text-slate-500">
            Menampilkan tren median waktu eksekusi valid berdasarkan ukuran dataset pada riwayat
            sesi ({activeSizeCount} titik ukuran).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {sortingSizeCount >= 2 && searchingSizeCount >= 2 ? (
            <div
              role="group"
              aria-label="Pilih mode kurva pertumbuhan"
              className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs"
            >
              <button
                type="button"
                onClick={() => setSelectedMode('sorting')}
                className={`rounded-md px-3 py-1 font-medium transition-colors ${
                  effectiveMode === 'sorting'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Sorting
              </button>
              <button
                type="button"
                onClick={() => setSelectedMode('searching')}
                className={`rounded-md px-3 py-1 font-medium transition-colors ${
                  effectiveMode === 'searching'
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Searching
              </button>
            </div>
          ) : null}

          <ScaleToggle scale={scaleMode} onChange={setScaleMode} idPrefix="growth-chart" />
        </div>
      </div>

      {scaleMode === 'log' && allBelowWarningThreshold ? (
        <div className="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 px-3.5 py-2.5 text-xs text-orange-900">
          <AlertTriangle
            className="mt-0.5 h-4 w-4 shrink-0 text-orange-600"
            aria-hidden="true"
          />
          <p>
            Seluruh titik di bawah <strong>0,01 ms</strong> dan di-clamp minimal ke 0,001 ms pada
            skala logaritmik. Gunakan <strong>Skala Linear</strong> jika rentang perbedaan kecil.
          </p>
        </div>
      ) : null}

      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={points} margin={{ top: 16, right: 24, left: 10, bottom: 16 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis
              dataKey="datasetSize"
              tick={{ fontSize: 11, fill: '#334155' }}
              tickFormatter={(value: number) => formatNumberID(Number(value))}
            />
            <YAxis
              scale={scaleMode === 'log' ? 'log' : 'auto'}
              domain={
                scaleMode === 'log'
                  ? ([, dataMax]: [number, number]) => [
                      LOG_MIN_VALUE,
                      Math.max(0.01, dataMax * 1.35),
                    ]
                  : ([, dataMax]: [number, number]) => [0, dataMax > 0 ? dataMax * 1.15 : 1]
              }
              allowDataOverflow={false}
              tick={{ fontSize: 11, fill: '#475569' }}
              tickFormatter={(value: number) =>
                `${Number(value).toFixed(value < 1 ? 3 : 1)} ms`
              }
              width={74}
            />
            <Tooltip content={<GrowthChartTooltip actualLookup={actualLookup} />} />
            <Legend wrapperStyle={{ fontSize: '12px' }} />
            {algorithms.map(({ id, name }) => (
              <Line
                key={id}
                type="monotone"
                dataKey={id}
                name={name}
                stroke={ALGORITHM_COLORS[id] ?? '#2563eb'}
                strokeDasharray={ALGORITHM_DASHES[id]}
                strokeWidth={2.5}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
