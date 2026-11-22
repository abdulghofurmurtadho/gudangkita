import { useMemo } from 'react';
import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Boxes,
  CheckCircle2,
  Coins,
  Package,
  TrendingUp,
} from 'lucide-react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { formatDuration, formatNumberID, formatRupiah } from '../../benchmark/metrics';
import type { BenchmarkResultRecord, DatasetScenario, TargetCase, WarehouseItem } from '../../types';
import { LOW_STOCK_THRESHOLD } from '../../types';
import { CorrectnessBadge, StockStatusBadge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import type { AppTab } from '../layout/AppShell';

const TARGET_CASE_LABELS: Record<TargetCase | '', string> = {
  'found-start': 'Target di Awal',
  'found-middle': 'Target di Tengah',
  'found-end': 'Target di Akhir',
  'not-found': 'Tidak Ditemukan',
  custom: 'Target Kustom',
  '': '—',
};

const SCENARIO_LABELS: Record<DatasetScenario, string> = {
  kecil: 'Kecil',
  menengah: 'Menengah',
  besar: 'Besar',
  kustom: 'Kustom',
};

interface DashboardPageProps {
  items: readonly WarehouseItem[];
  benchmarkHistory: readonly BenchmarkResultRecord[];
  latestBenchmarkBatch?: readonly BenchmarkResultRecord[];
  onNavigate: (tab: AppTab) => void;
}

interface CategoryChartDatum {
  kategori: string;
  shortLabel: string;
  totalUnit: number;
  totalSku: number;
  totalNilai: number;
}

interface CustomTooltipPayloadItem {
  payload?: CategoryChartDatum;
}

interface CategoryTooltipProps {
  active?: boolean;
  payload?: CustomTooltipPayloadItem[];
}

function CategoryChartTooltip({ active, payload }: CategoryTooltipProps) {
  const datum = payload?.[0]?.payload;
  if (!active || !datum) {
    return null;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 text-xs shadow-lg">
      <p className="font-semibold text-slate-900">{datum.kategori}</p>
      <div className="mt-2 space-y-1 text-slate-600">
        <div className="flex items-center justify-between gap-4">
          <span>Jumlah Unit Stok:</span>
          <span className="font-mono font-semibold text-blue-700 tabular-nums">
            {formatNumberID(datum.totalUnit)} unit
          </span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span>Jumlah SKU:</span>
          <span className="font-mono font-semibold text-teal-700 tabular-nums">
            {formatNumberID(datum.totalSku)} SKU
          </span>
        </div>
        <div className="flex items-center justify-between gap-4 border-t border-slate-100 pt-1">
          <span>Total Nilai:</span>
          <span className="font-mono font-semibold text-slate-900 tabular-nums">
            {formatRupiah(datum.totalNilai)}
          </span>
        </div>
      </div>
    </div>
  );
}

function shortenCategoryLabel(label: string): string {
  if (label.length <= 14) return label;
  return `${label.slice(0, 12)}…`;
}

export function DashboardPage({
  items,
  benchmarkHistory,
  latestBenchmarkBatch,
  onNavigate,
}: DashboardPageProps) {
  const kpi = useMemo(() => {
    let totalUnits = 0;
    let totalValue = 0;
    let outOfStockCount = 0;
    let lowStockOnlyCount = 0;
    const categorySet = new Set<string>();

    for (const item of items) {
      totalUnits += item.stok;
      totalValue += item.stok * item.harga;
      categorySet.add(item.kategori);
      if (item.stok === 0) {
        outOfStockCount += 1;
      } else if (item.stok <= LOW_STOCK_THRESHOLD) {
        lowStockOnlyCount += 1;
      }
    }

    return {
      totalSku: items.length,
      totalUnits,
      totalValue,
      lowAndOutCount: outOfStockCount + lowStockOnlyCount,
      outOfStockCount,
      lowStockOnlyCount,
      categoryCount: categorySet.size,
    };
  }, [items]);

  const categoryData = useMemo<CategoryChartDatum[]>(() => {
    const grouped = new Map<string, { unit: number; sku: number; nilai: number }>();

    for (const item of items) {
      const current = grouped.get(item.kategori) ?? { unit: 0, sku: 0, nilai: 0 };
      current.unit += item.stok;
      current.sku += 1;
      current.nilai += item.stok * item.harga;
      grouped.set(item.kategori, current);
    }

    return Array.from(grouped.entries())
      .map(([kategori, stats]) => ({
        kategori,
        shortLabel: shortenCategoryLabel(kategori),
        totalUnit: stats.unit,
        totalSku: stats.sku,
        totalNilai: stats.nilai,
      }))
      .sort((a, b) => b.totalUnit - a.totalUnit);
  }, [items]);

  const lowStockItems = useMemo(
    () =>
      items
        .filter((item) => item.stok <= LOW_STOCK_THRESHOLD)
        .sort((a, b) => a.stok - b.stok || a.kode.localeCompare(b.kode, 'id')),
    [items],
  );

  const latestRunRecords = useMemo(() => {
    if (latestBenchmarkBatch && latestBenchmarkBatch.length > 0) {
      return latestBenchmarkBatch;
    }
    if (benchmarkHistory.length === 0) {
      return [];
    }
    const anchor = benchmarkHistory[0];
    if (!anchor) return [];
    const batch: BenchmarkResultRecord[] = [];
    for (const record of benchmarkHistory) {
      if (
        record.mode === anchor.mode &&
        record.datasetSize === anchor.datasetSize &&
        record.seed === anchor.seed &&
        record.field === anchor.field &&
        record.distribution === anchor.distribution
      ) {
        batch.push(record);
      } else {
        break;
      }
    }
    return batch;
  }, [benchmarkHistory, latestBenchmarkBatch]);

  const latestAnchor = latestRunRecords[0] ?? null;

  return (
    <div className="space-y-6">
      {/* Header & Quick Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Dashboard Operasional Gudang
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Ringkasan kondisi stok simulasi gudang dan hasil pengujian performa algoritma terakhir.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => onNavigate('inventory')}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <Package className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <span>Daftar Barang</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('benchmark')}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <BarChart3 className="h-4 w-4" aria-hidden="true" />
            <span>Perbandingan Performa</span>
          </button>
        </div>
      </div>

      {/* 4 KPI Cards */}
      <section aria-label="Ringkasan Indikator Utama" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total SKU Barang
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
              <Package className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-3 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {formatNumberID(kpi.totalSku)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Tersebar pada {formatNumberID(kpi.categoryCount)} kategori aktif
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total Unit Stok
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal-50 text-teal-600">
              <Boxes className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-3 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {formatNumberID(kpi.totalUnits)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Rata-rata{' '}
            {kpi.totalSku > 0 ? formatNumberID(Math.round(kpi.totalUnits / kpi.totalSku)) : '0'}{' '}
            unit per SKU
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Barang Stok Rendah (&le; {LOW_STOCK_THRESHOLD})
            </span>
            <span
              className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                kpi.lowAndOutCount > 0 ? 'bg-amber-50 text-amber-600' : 'bg-emerald-50 text-emerald-600'
              }`}
            >
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-3 font-mono text-2xl font-bold text-slate-900 tabular-nums">
            {formatNumberID(kpi.lowAndOutCount)}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {formatNumberID(kpi.outOfStockCount)} habis, {formatNumberID(kpi.lowStockOnlyCount)} menipis
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Total Nilai Persediaan (Rp)
            </span>
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
              <Coins className="h-5 w-5" aria-hidden="true" />
            </span>
          </div>
          <p className="mt-3 font-mono text-xl font-bold text-slate-900 tabular-nums sm:text-2xl">
            {formatRupiah(kpi.totalValue)}
          </p>
          <p className="mt-1 text-xs text-slate-500">Akumulasi stok dikalikan harga satuan</p>
        </div>
      </section>

      {/* Main Grid: Category Chart & Low Stock Watchlist */}
      <div className="grid gap-6 lg:grid-cols-12">
        {/* Category Distribution Chart */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7">
          <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Distribusi Jumlah Unit &amp; SKU per Kategori
              </h2>
              <p className="text-xs text-slate-500">
                Membandingkan total unit fisik (sumbu kiri) dan variasi SKU (sumbu kanan).
              </p>
            </div>
          </div>

          {categoryData.length === 0 ? (
            <EmptyState
              title="Belum ada data barang"
              description="Tambahkan barang atau muat ulang data demo di halaman Daftar Barang untuk melihat distribusi kategori."
              actionLabel="Buka Daftar Barang"
              onAction={() => onNavigate('inventory')}
            />
          ) : (
            <div className="h-80 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={categoryData}
                  margin={{ top: 12, right: 16, left: 0, bottom: 32 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                  <XAxis
                    dataKey="shortLabel"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    angle={-20}
                    textAnchor="end"
                    interval={0}
                    height={56}
                  />
                  <YAxis
                    yAxisId="unit"
                    orientation="left"
                    tick={{ fontSize: 11, fill: '#475569' }}
                    allowDecimals={false}
                  />
                  <YAxis
                    yAxisId="sku"
                    orientation="right"
                    tick={{ fontSize: 11, fill: '#0f766e' }}
                    allowDecimals={false}
                  />
                  <Tooltip content={<CategoryChartTooltip />} />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
                  <Bar
                    yAxisId="unit"
                    dataKey="totalUnit"
                    name="Jumlah Unit"
                    fill="#2563eb"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={36}
                  />
                  <Bar
                    yAxisId="sku"
                    dataKey="totalSku"
                    name="Jumlah SKU"
                    fill="#0d9488"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </section>

        {/* Low Stock Alert List */}
        <section className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Peringatan Stok Rendah / Habis
              </h2>
              <p className="text-xs text-slate-500">
                Barang dengan stok &le; {LOW_STOCK_THRESHOLD} unit memerlukan peninjauan ulang.
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('inventory')}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              <span>Kelola</span>
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          </div>

          {lowStockItems.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-emerald-200 bg-emerald-50/60 p-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" aria-hidden="true" />
              <p className="mt-2 text-sm font-semibold text-emerald-900">
                Semua stok dalam kondisi aman
              </p>
              <p className="mt-1 text-xs text-emerald-700">
                Tidak ada SKU yang berada pada atau di bawah ambang {LOW_STOCK_THRESHOLD} unit.
              </p>
            </div>
          ) : (
            <div className="flex-1 space-y-2.5 overflow-y-auto pr-1 max-h-80">
              {lowStockItems.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/70 px-3.5 py-2.5"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-700">
                        {item.kode}
                      </span>
                      <span className="text-xs text-slate-400">•</span>
                      <span className="truncate text-xs text-slate-500">{item.lokasi}</span>
                    </div>
                    <p className="mt-0.5 truncate text-sm font-medium text-slate-900">
                      {item.nama}
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StockStatusBadge stok={item.stok} />
                    <span className="font-mono text-xs font-semibold text-slate-700 tabular-nums">
                      {formatNumberID(item.stok)} unit
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Latest Benchmark Session Summary */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Ringkasan Sesi Benchmark Terakhir
            </h2>
            <p className="text-xs text-slate-500">
              Menampilkan hasil pengukuran aktual terakhir dari halaman Perbandingan Performa.
            </p>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('benchmark')}
            className="inline-flex items-center gap-1.5 self-start rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 transition-colors hover:bg-blue-100 sm:self-auto"
          >
            <TrendingUp className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Jalankan Pengujian Baru</span>
          </button>
        </div>

        {latestAnchor === null || latestRunRecords.length === 0 ? (
          <EmptyState
            icon={<BarChart3 className="h-6 w-6" aria-hidden="true" />}
            title="Belum ada pengujian performa pada sesi ini"
            description="Jalankan perbandingan algoritma pengurutan atau pencarian pada dataset simulasi di halaman Perbandingan Performa untuk melihat waktu eksekusi aktual perangkat Anda."
            actionLabel="Buka Perbandingan Performa"
            onAction={() => onNavigate('benchmark')}
          />
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs text-slate-700">
              <span className="font-semibold text-slate-900">
                Mode: {latestAnchor.mode === 'sorting' ? 'Pengurutan (Sorting)' : 'Pencarian (Searching)'}
              </span>
              <span className="text-slate-300">|</span>
              <span>
                Ukuran Dataset:{' '}
                <strong className="font-mono tabular-nums">
                  {formatNumberID(latestAnchor.datasetSize)}
                </strong>{' '}
                baris ({SCENARIO_LABELS[latestAnchor.scenario]})
              </span>
              <span className="text-slate-300">|</span>
              <span>
                Atribut Kunci: <strong className="font-mono">{latestAnchor.field}</strong>
              </span>
              <span className="text-slate-300">|</span>
              <span>
                Seed: <strong className="font-mono">{latestAnchor.seed}</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                <thead>
                  <tr className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                    <th scope="col" className="px-4 py-2.5">
                      Algoritma
                    </th>
                    {latestAnchor.mode === 'searching' ? (
                      <th scope="col" className="px-4 py-2.5">
                        Kasus Target
                      </th>
                    ) : null}
                    <th scope="col" className="px-4 py-2.5 text-right">
                      Median Waktu
                    </th>
                    <th scope="col" className="px-4 py-2.5 text-right">
                      Min – Maks
                    </th>
                    <th scope="col" className="px-4 py-2.5">
                      Status Validasi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {latestRunRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        {record.algorithmName}
                      </td>
                      {latestAnchor.mode === 'searching' ? (
                        <td className="px-4 py-2.5 text-xs text-slate-600">
                          {TARGET_CASE_LABELS[record.targetCase] || '—'}
                        </td>
                      ) : null}
                      <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-slate-900 tabular-nums">
                        {formatDuration(record.medianMs)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-xs text-slate-600 tabular-nums">
                        {record.minMs !== null && record.maxMs !== null
                          ? `${formatDuration(record.minMs)} – ${formatDuration(record.maxMs)}`
                          : '—'}
                      </td>
                      <td className="px-4 py-2.5">
                        <CorrectnessBadge status={record.correctness} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
