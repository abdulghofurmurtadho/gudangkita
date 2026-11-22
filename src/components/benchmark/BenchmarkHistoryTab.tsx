import { useMemo, useState } from 'react';
import { FileJson, FileSpreadsheet, History, Trash2 } from 'lucide-react';
import { downloadTextFile, exportResultsToCSV, exportResultsToJSON } from '../../benchmark/exporter';
import { formatDuration, formatNumberID } from '../../benchmark/metrics';
import type {
  BenchmarkMode,
  BenchmarkResultRecord,
  EnvironmentInfo,
  TargetCase,
} from '../../types';
import { CorrectnessBadge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { GrowthCurveChart } from './BenchmarkCharts';

const DISTRIBUTION_LABELS: Record<BenchmarkResultRecord['distribution'], string> = {
  random: 'Acak',
  sorted: 'Terurut',
  reversed: 'Terbalik',
  'unsorted-snapshot': 'Snapshot Acak',
};

const ORDER_LABELS: Record<BenchmarkResultRecord['order'], string> = {
  asc: 'Naik',
  desc: 'Turun',
  'ascending-key': 'Menaik',
};

const TARGET_CASE_LABELS: Record<TargetCase | '', string> = {
  'found-start': 'Awal',
  'found-middle': 'Tengah',
  'found-end': 'Akhir',
  'not-found': 'Tidak Ditemukan',
  custom: 'Kustom',
  '': 'Target',
};

interface BenchmarkHistoryTabProps {
  history: readonly BenchmarkResultRecord[];
  envInfo: EnvironmentInfo;
  onClearHistory: () => void;
}

type HistoryModeFilter = 'all' | BenchmarkMode;

function formatShortTimestamp(iso: string): string {
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'short',
    timeStyle: 'medium',
  }).format(parsed);
}

export function BenchmarkHistoryTab({
  history,
  envInfo,
  onClearHistory,
}: BenchmarkHistoryTabProps) {
  const [modeFilter, setModeFilter] = useState<HistoryModeFilter>('all');
  const [confirmClear, setConfirmClear] = useState<boolean>(false);

  const filteredHistory = useMemo(() => {
    if (modeFilter === 'all') return history;
    return history.filter((record) => record.mode === modeFilter);
  }, [history, modeFilter]);

  const handleExportCSV = () => {
    if (filteredHistory.length === 0) return;
    const csv = exportResultsToCSV(filteredHistory);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    downloadTextFile(`gudangkita-riwayat-${stamp}.csv`, csv, 'text/csv;charset=utf-8');
  };

  const handleExportJSON = () => {
    if (filteredHistory.length === 0) return;
    const json = exportResultsToJSON(filteredHistory, envInfo);
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, '-');
    downloadTextFile(
      `gudangkita-riwayat-${stamp}.json`,
      json,
      'application/json;charset=utf-8',
    );
  };

  if (history.length === 0) {
    return (
      <EmptyState
        icon={<History className="h-6 w-6" aria-hidden="true" />}
        title="Riwayat sesi benchmark masih kosong"
        description="Jalankan pengujian pada tab Sorting atau Searching (cobalah minimal 2 ukuran dataset berbeda seperti 500, 3.000, dan 10.000 baris) untuk memunculkan rekaman dan kurva pertumbuhan."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Filter & Export Toolbar */}
      <div className="flex flex-col gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Filter Mode:
          </span>
          <div
            role="group"
            aria-label="Filter riwayat berdasarkan mode"
            className="inline-flex rounded-lg border border-slate-200 bg-slate-100 p-0.5 text-xs"
          >
            {(
              [
                { id: 'all', label: `Semua (${history.length})` },
                {
                  id: 'sorting',
                  label: `Sorting (${history.filter((r) => r.mode === 'sorting').length})`,
                },
                {
                  id: 'searching',
                  label: `Searching (${history.filter((r) => r.mode === 'searching').length})`,
                },
              ] as const
            ).map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => setModeFilter(option.id)}
                className={`rounded-md px-3 py-1 font-medium transition-colors ${
                  modeFilter === option.id
                    ? 'bg-white text-slate-900 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={filteredHistory.length === 0}
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-600" aria-hidden="true" />
            <span>Ekspor CSV</span>
          </button>
          <button
            type="button"
            disabled={filteredHistory.length === 0}
            onClick={handleExportJSON}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            <FileJson className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
            <span>Ekspor JSON</span>
          </button>

          {confirmClear ? (
            <div className="flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs">
              <span className="font-medium text-rose-800">Hapus semua?</span>
              <button
                type="button"
                onClick={() => {
                  onClearHistory();
                  setConfirmClear(false);
                }}
                className="font-bold text-rose-700 underline hover:text-rose-900"
              >
                Ya
              </button>
              <button
                type="button"
                onClick={() => setConfirmClear(false)}
                className="font-semibold text-slate-600 hover:text-slate-900"
              >
                Batal
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmClear(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-100"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Bersihkan Riwayat</span>
            </button>
          )}
        </div>
      </div>

      {/* Growth Curve Chart */}
      <GrowthCurveChart results={filteredHistory} />

      {/* Full History Table */}
      <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-200 px-5 py-4">
          <h3 className="text-base font-semibold text-slate-900">
            Rekaman Lengkap Sesi Pengujian
          </h3>
          <p className="text-xs text-slate-500">
            Menampilkan {formatNumberID(filteredHistory.length)} rekaman pengujian dari sesi browser
            saat ini.
          </p>
        </div>

        {filteredHistory.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="Tidak ada rekaman pada filter mode ini"
              description="Ubah filter mode ke Semua untuk melihat rekaman pengujian lainnya."
              actionLabel="Tampilkan Semua Mode"
              onAction={() => setModeFilter('all')}
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Waktu
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Mode
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Algoritma
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    N
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Parameter
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Median
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Setup
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Min–Maks
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Validasi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredHistory.map((record) => (
                  <tr key={record.id} className="hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-500">
                      {formatShortTimestamp(record.timestamp)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs font-semibold text-slate-700">
                      {record.mode === 'sorting' ? 'Sorting' : 'Searching'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-900">
                      {record.algorithmName}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs text-slate-800 tabular-nums">
                      {formatNumberID(record.datasetSize)}
                    </td>
                    <td className="max-w-[14rem] truncate px-4 py-3 text-xs text-slate-600">
                      <span className="font-mono">{record.field}</span> •{' '}
                      {record.mode === 'sorting'
                        ? `${DISTRIBUTION_LABELS[record.distribution]} (${ORDER_LABELS[record.order]})`
                        : `${TARGET_CASE_LABELS[record.targetCase]}: ${record.targetValue || '-'}`}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs font-bold text-slate-900 tabular-nums">
                      {formatDuration(record.medianMs)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                      {record.setupMs > 0 ? formatDuration(record.setupMs) : '0 ms'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs text-slate-600 tabular-nums">
                      {record.minMs !== null && record.maxMs !== null
                        ? `${formatDuration(record.minMs)} – ${formatDuration(record.maxMs)}`
                        : '—'}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      <CorrectnessBadge status={record.correctness} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
