import { useEffect, useMemo, useState, type FormEvent } from 'react';
import {
  AlertTriangle,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Eye,
  Filter,
  Info,
  Pencil,
  Plus,
  RotateCcw,
  Search,
  Trash2,
  X,
  XCircle,
} from 'lucide-react';
import { SEARCHING_ALGORITHM_LIST, searchItems } from '../../algorithms/searching';
import { SORTING_ALGORITHMS, SORTING_ALGORITHM_LIST, sortItems } from '../../algorithms/sorting';
import { formatDuration, formatNumberID, formatRupiah } from '../../benchmark/metrics';
import type {
  ItemInput,
  SearchingAlgorithmId,
  SortableField,
  SortOrder,
  SortingAlgorithmId,
  WarehouseItem,
} from '../../types';
import { ITEM_CATEGORIES, LOW_STOCK_THRESHOLD } from '../../types';
import { CorrectnessBadge, StockStatusBadge } from '../common/Badge';
import { EmptyState } from '../common/EmptyState';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { ItemDetailModal } from './ItemDetailModal';
import { ItemFormModal } from './ItemFormModal';

interface InventoryPageProps {
  items: readonly WarehouseItem[];
  onCreateItem: (input: ItemInput) => void;
  onUpdateItem: (id: string, input: ItemInput) => void;
  onDeleteItem: (id: string) => void;
  onResetDemoData: () => void;
}

const FIELD_LABELS: Record<SortableField, string> = {
  kode: 'Kode SKU',
  nama: 'Nama Barang',
  kategori: 'Kategori',
  stok: 'Stok (Unit)',
  harga: 'Harga (Rp)',
};

const SORTABLE_FIELDS: readonly SortableField[] = ['kode', 'nama', 'kategori', 'stok', 'harga'];
const PAGE_SIZE_OPTIONS = [10, 25, 50] as const;

interface SearchExecutionState {
  algorithm: SearchingAlgorithmId;
  field: SortableField;
  query: string;
  autoSorted: boolean;
  setupDurationMs: number;
  searchDurationMs: number;
  searchedCount: number;
  found: boolean;
  searchedIndex: number;
  matchedItem: WarehouseItem | null;
  preconditionError?: string;
}

export function InventoryPage({
  items,
  onCreateItem,
  onUpdateItem,
  onDeleteItem,
  onResetDemoData,
}: InventoryPageProps) {
  // Filter state
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [onlyLowStock, setOnlyLowStock] = useState<boolean>(false);

  // Sorting state
  const [sortAlgorithm, setSortAlgorithm] = useState<SortingAlgorithmId>('merge');
  const [sortField, setSortField] = useState<SortableField>('kode');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

  // Target searching state (Linear vs Binary)
  const [searchAlgorithm, setSearchAlgorithm] = useState<SearchingAlgorithmId>('linear');
  const [searchField, setSearchField] = useState<SortableField>('kode');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [binaryAutoSort, setBinaryAutoSort] = useState<boolean>(true);
  const [searchValidationMsg, setSearchValidationMsg] = useState<string | null>(null);
  const [searchState, setSearchState] = useState<SearchExecutionState | null>(null);

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(10);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Modal state
  const [formOpen, setFormOpen] = useState<boolean>(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editingItem, setEditingItem] = useState<WarehouseItem | null>(null);
  const [detailItem, setDetailItem] = useState<WarehouseItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<WarehouseItem | null>(null);
  const [confirmResetOpen, setConfirmResetOpen] = useState<boolean>(false);

  const categoryOptions = useMemo(() => {
    const set = new Set<string>(ITEM_CATEGORIES);
    for (const item of items) {
      set.add(item.kategori);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'id'));
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedCategory !== 'ALL' && item.kategori !== selectedCategory) {
        return false;
      }
      if (onlyLowStock && item.stok > LOW_STOCK_THRESHOLD) {
        return false;
      }
      return true;
    });
  }, [items, selectedCategory, onlyLowStock]);

  const sortOutcome = useMemo(() => {
    const start = performance.now();
    const sorted = sortItems(filteredItems, sortAlgorithm, sortField, sortOrder);
    const durationMs = Math.max(0, performance.now() - start);
    return { sorted, durationMs };
  }, [filteredItems, sortAlgorithm, sortField, sortOrder]);

  const sortedItems = sortOutcome.sorted;

  const totalPages = Math.max(1, Math.ceil(sortedItems.length / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  useEffect(() => {
    if (currentPage !== safePage) {
      setCurrentPage(safePage);
    }
  }, [currentPage, safePage]);

  useEffect(() => {
    if (!confirmResetOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        setConfirmResetOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [confirmResetOpen]);

  const paginatedItems = useMemo(() => {
    const startIndex = (safePage - 1) * pageSize;
    return sortedItems.slice(startIndex, startIndex + pageSize);
  }, [sortedItems, safePage, pageSize]);

  // Dynamic example values from active table rows so user can test exact search cleanly
  const sampleTargets = useMemo(() => {
    if (sortedItems.length === 0) return [];
    const indices = [0, Math.floor(sortedItems.length / 2), sortedItems.length - 1];
    const seen = new Set<string>();
    const samples: string[] = [];
    for (const idx of indices) {
      const row = sortedItems[idx];
      if (!row) continue;
      const val = String(row[searchField]);
      if (!seen.has(val)) {
        seen.add(val);
        samples.push(val);
      }
    }
    return samples;
  }, [sortedItems, searchField]);

  const executeTargetSearch = (
    overrideAlgorithm?: SearchingAlgorithmId,
    overrideAutoSort?: boolean,
    overrideQuery?: string,
    overrideField?: SortableField,
    customDataset?: readonly WarehouseItem[],
  ) => {
    const algo = overrideAlgorithm ?? searchAlgorithm;
    const autoSort = overrideAutoSort ?? binaryAutoSort;
    const field = overrideField ?? searchField;
    const query = (overrideQuery ?? searchQuery).trim();
    const baseData = customDataset ?? sortedItems;

    if (query === '') {
      setSearchValidationMsg('Masukkan nilai target pencarian terlebih dahulu.');
      return;
    }
    setSearchValidationMsg(null);

    let datasetToSearch: readonly WarehouseItem[] = baseData;
    let setupDurationMs = 0;

    if (algo === 'binary' && autoSort) {
      const sortStart = performance.now();
      datasetToSearch = sortItems(baseData, 'merge', field, 'asc');
      setupDurationMs = Math.max(0, performance.now() - sortStart);
    }

    const searchStart = performance.now();
    const result = searchItems(datasetToSearch, algo, field, query);
    const searchDurationMs = Math.max(0, performance.now() - searchStart);

    setSearchState({
      algorithm: algo,
      field,
      query,
      autoSorted: algo === 'binary' && autoSort,
      setupDurationMs,
      searchDurationMs,
      searchedCount: datasetToSearch.length,
      found: result.found,
      searchedIndex: result.index,
      matchedItem: result.item,
      preconditionError: result.preconditionError,
    });

    if (result.found && result.item) {
      const tableIndex = baseData.findIndex((item) => item.id === result.item?.id);
      if (tableIndex >= 0) {
        setCurrentPage(Math.floor(tableIndex / pageSize) + 1);
      }
    }
  };

  const handleSearchSubmit = (event: FormEvent) => {
    event.preventDefault();
    executeTargetSearch();
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchState(null);
    setSearchValidationMsg(null);
  };

  const handleToggleColumnSort = (field: SortableField) => {
    if (sortField === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
    setCurrentPage(1);
  };

  const handleFixPrerequisiteBySortingTable = () => {
    const nextSorted = sortItems(filteredItems, sortAlgorithm, searchField, 'asc');
    setSortField(searchField);
    setSortOrder('asc');
    setCurrentPage(1);
    if (searchQuery.trim() !== '') {
      executeTargetSearch('binary', false, searchQuery, searchField, nextSorted);
    }
  };

  const openCreateModal = () => {
    setFormMode('create');
    setEditingItem(null);
    setFormOpen(true);
  };

  const openEditModal = (item: WarehouseItem) => {
    setFormMode('edit');
    setEditingItem(item);
    setFormOpen(true);
  };

  const handleFormSave = (input: ItemInput, editingId?: string) => {
    if (editingId) {
      onUpdateItem(editingId, input);
    } else {
      onCreateItem(input);
    }
    setFormOpen(false);
    setEditingItem(null);
  };

  const handleDeleteConfirm = (item: WarehouseItem) => {
    onDeleteItem(item.id);
    if (searchState?.matchedItem?.id === item.id) {
      setSearchState(null);
    }
    setDeleteTarget(null);
  };

  const resetFilters = () => {
    setSelectedCategory('ALL');
    setOnlyLowStock(false);
    setCurrentPage(1);
  };

  const renderSortIcon = (field: SortableField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />;
    }
    return sortOrder === 'asc' ? (
      <ArrowUp className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
    ) : (
      <ArrowDown className="h-3.5 w-3.5 text-blue-600" aria-hidden="true" />
    );
  };

  const matchedItemId = searchState?.found ? searchState.matchedItem?.id : undefined;
  const activeSortMeta = SORTING_ALGORITHMS[sortAlgorithm];
  const startRow = sortedItems.length === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endRow = Math.min(safePage * pageSize, sortedItems.length);

  return (
    <div className="space-y-6">
      {/* Header & Main Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Daftar Barang Gudang
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Kelola stok barang (CRUD), uji algoritma pengurutan tabel, dan bandingkan Linear vs
            Binary Search secara langsung.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={() => setConfirmResetOpen(true)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
          >
            <RotateCcw className="h-4 w-4 text-slate-500" aria-hidden="true" />
            <span>Reset Data Demo</span>
          </button>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-blue-700"
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Tambah Barang</span>
          </button>
        </div>
      </div>

      {/* Benchmark Snapshot Isolation Note */}
      <div className="flex items-start gap-3 rounded-xl border border-blue-200 bg-blue-50/70 px-4 py-3 text-xs text-blue-900 sm:text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
        <p>
          <strong>Isolasi Data Benchmark:</strong> Pengujian di halaman{' '}
          <em>Perbandingan Performa</em> menggunakan dataset snapshot sintetis ber-seed yang
          terpisah, sehingga operasi tambah, ubah, atau hapus barang di sini tidak merusak hasil
          benchmark.
        </p>
      </div>

      {/* Target Search Panel (Linear vs Binary Search) */}
      <section
        aria-label="Pencarian Target dengan Linear atau Binary Search"
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Pencarian Target Barang (Linear Search vs Binary Search)
            </h2>
            <p className="text-xs text-slate-500">
              Pencarian mencocokkan nilai target secara eksak pada atribut kunci yang dipilih.
            </p>
          </div>
          {searchState ? (
            <button
              type="button"
              onClick={handleClearSearch}
              className="inline-flex items-center gap-1 self-start text-xs font-semibold text-slate-600 hover:text-slate-900 sm:self-auto"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Bersihkan Hasil Cari</span>
            </button>
          ) : null}
        </div>

        <form onSubmit={handleSearchSubmit} className="mt-4 grid gap-3 md:grid-cols-12">
          <div className="md:col-span-3">
            <label
              htmlFor="inventory-search-algorithm"
              className="block text-xs font-semibold text-slate-700"
            >
              Algoritma Pencarian
            </label>
            <select
              id="inventory-search-algorithm"
              value={searchAlgorithm}
              onChange={(event) => {
                setSearchAlgorithm(event.target.value as SearchingAlgorithmId);
                setSearchState(null);
              }}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {SEARCHING_ALGORITHM_LIST.map((algo) => (
                <option key={algo.id} value={algo.id}>
                  {algo.name} ({algo.averageComplexity})
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3">
            <label
              htmlFor="inventory-search-field"
              className="block text-xs font-semibold text-slate-700"
            >
              Atribut Kunci
            </label>
            <select
              id="inventory-search-field"
              value={searchField}
              onChange={(event) => {
                setSearchField(event.target.value as SortableField);
                setSearchState(null);
              }}
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              {SORTABLE_FIELDS.map((field) => (
                <option key={field} value={field}>
                  {FIELD_LABELS[field]}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4">
            <label
              htmlFor="inventory-search-query"
              className="block text-xs font-semibold text-slate-700"
            >
              Nilai Target Eksak
            </label>
            <input
              id="inventory-search-query"
              type="text"
              value={searchQuery}
              onChange={(event) => {
                setSearchQuery(event.target.value);
                if (searchValidationMsg) setSearchValidationMsg(null);
              }}
              placeholder={
                sampleTargets[0] ? `Contoh: ${sampleTargets[0]}` : 'Masukkan nilai target...'
              }
              className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div className="flex items-end md:col-span-2">
            <button
              type="submit"
              disabled={sortedItems.length === 0}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              <span>Cari Target</span>
            </button>
          </div>
        </form>

        {/* Quick example target chips from current data */}
        {sampleTargets.length > 0 ? (
          <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
            <span>Contoh nilai tersedia:</span>
            {sampleTargets.map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => {
                  setSearchQuery(sample);
                  setSearchValidationMsg(null);
                }}
                className="rounded-md border border-slate-200 bg-slate-50 px-2 py-0.5 font-mono text-xs text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
              >
                {sample}
              </button>
            ))}
          </div>
        ) : null}

        {searchValidationMsg ? (
          <p role="alert" className="mt-2 text-xs font-medium text-rose-600">
            {searchValidationMsg}
          </p>
        ) : null}

        {/* Binary Search Prerequisite Control */}
        {searchAlgorithm === 'binary' ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-950">
            <div className="flex items-start gap-2.5">
              <AlertTriangle
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                aria-hidden="true"
              />
              <div className="flex-1 space-y-2">
                <div>
                  <p className="font-semibold">Prasyarat Binary Search: Data Harus Terurut Menaik</p>
                  <p className="mt-0.5 text-amber-900/90">
                    Binary Search membutuhkan array yang sudah terurut menaik (ascending) berdasarkan
                    atribut kunci <strong>{FIELD_LABELS[searchField]}</strong>. Pilih perilaku
                    eksekusi di bawah ini untuk melihat pengaruh prasyarat secara langsung:
                  </p>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-5">
                  <label className="inline-flex cursor-pointer items-center gap-2 font-medium">
                    <input
                      type="radio"
                      name="binary-prerequisite-mode"
                      checked={binaryAutoSort}
                      onChange={() => setBinaryAutoSort(true)}
                      className="h-4 w-4 border-amber-400 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Urutkan salinan otomatis sesuai kunci (hitung waktu persiapan)</span>
                  </label>
                  <label className="inline-flex cursor-pointer items-center gap-2 font-medium">
                    <input
                      type="radio"
                      name="binary-prerequisite-mode"
                      checked={!binaryAutoSort}
                      onChange={() => setBinaryAutoSort(false)}
                      className="h-4 w-4 border-amber-400 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Uji langsung pada urutan tabel saat ini (tolak jika belum terurut)</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        ) : null}

        {/* Search Execution Result Banner */}
        {searchState ? (
          <div
            role="status"
            className={`mt-4 rounded-xl border p-4 text-sm ${
              searchState.preconditionError
                ? 'border-orange-200 bg-orange-50 text-orange-950'
                : searchState.found
                  ? 'border-emerald-200 bg-emerald-50 text-emerald-950'
                  : 'border-slate-200 bg-slate-50 text-slate-800'
            }`}
          >
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  {searchState.preconditionError ? (
                    <CorrectnessBadge status="precondition-error" />
                  ) : searchState.found ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Target Ditemukan</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-300 bg-white px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                      <XCircle className="h-3.5 w-3.5 text-slate-500" aria-hidden="true" />
                      <span>Target Tidak Ditemukan</span>
                    </span>
                  )}

                  <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-0.5 font-mono text-xs text-slate-700 ring-1 ring-slate-200">
                    <Clock className="h-3 w-3 text-slate-500" aria-hidden="true" />
                    <span>Cari: {formatDuration(searchState.searchDurationMs)}</span>
                  </span>

                  {searchState.autoSorted ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-white/80 px-2.5 py-0.5 font-mono text-xs text-slate-700 ring-1 ring-slate-200">
                      <span>Sort persiapan: {formatDuration(searchState.setupDurationMs)}</span>
                    </span>
                  ) : null}
                </div>

                {searchState.preconditionError ? (
                  <div className="space-y-2">
                    <p className="text-xs leading-relaxed text-orange-900 sm:text-sm">
                      {searchState.preconditionError}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={handleFixPrerequisiteBySortingTable}
                        className="rounded-lg border border-orange-300 bg-white px-3 py-1.5 text-xs font-semibold text-orange-900 hover:bg-orange-100"
                      >
                        Urutkan Tabel Ascending ({FIELD_LABELS[searchField]}) &amp; Cari Ulang
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setBinaryAutoSort(true);
                          executeTargetSearch('binary', true);
                        }}
                        className="rounded-lg bg-orange-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-orange-800"
                      >
                        Aktifkan Auto-Sort Salinan &amp; Cari Ulang
                      </button>
                    </div>
                  </div>
                ) : searchState.found && searchState.matchedItem ? (
                  <p className="text-xs leading-relaxed sm:text-sm">
                    Menemukan <strong>{searchState.matchedItem.nama}</strong> (
                    <span className="font-mono">{searchState.matchedItem.kode}</span>) pada indeks{' '}
                    <span className="font-mono font-semibold">{searchState.searchedIndex}</span>{' '}
                    dari {formatNumberID(searchState.searchedCount)} data
                    {searchState.autoSorted ? ' (pada salinan terurut)' : ''}. Baris disorot pada
                    tabel di bawah.
                  </p>
                ) : (
                  <p className="text-xs leading-relaxed sm:text-sm">
                    Tidak ada barang dengan {FIELD_LABELS[searchState.field]} sama dengan{' '}
                    <span className="font-mono font-semibold">&ldquo;{searchState.query}&rdquo;</span>{' '}
                    pada {formatNumberID(searchState.searchedCount)} data aktif.
                  </p>
                )}
              </div>

              {searchState.found && searchState.matchedItem ? (
                <button
                  type="button"
                  onClick={() => setDetailItem(searchState.matchedItem)}
                  className="inline-flex shrink-0 items-center gap-1.5 self-start rounded-lg border border-emerald-300 bg-white px-3 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                >
                  <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Lihat Detail</span>
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>

      {/* Filter & Sorting Controls */}
      <section
        aria-label="Filter dan Pengurutan Tabel"
        className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      >
        <div className="grid gap-4 lg:grid-cols-12">
          {/* Simple Filters */}
          <div className="space-y-3 lg:col-span-5 lg:border-r lg:border-slate-100 lg:pr-4">
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <Filter className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Filter Tampilan</span>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
              <div>
                <label
                  htmlFor="inventory-filter-category"
                  className="block text-xs font-medium text-slate-700"
                >
                  Kategori Barang
                </label>
                <select
                  id="inventory-filter-category"
                  value={selectedCategory}
                  onChange={(event) => {
                    setSelectedCategory(event.target.value);
                    setCurrentPage(1);
                  }}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="ALL">Semua Kategori ({items.length})</option>
                  {categoryOptions.map((category) => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-end pb-1">
                <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 hover:bg-slate-100">
                  <input
                    id="inventory-filter-low-stock"
                    type="checkbox"
                    checked={onlyLowStock}
                    onChange={(event) => {
                      setOnlyLowStock(event.target.checked);
                      setCurrentPage(1);
                    }}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span>Hanya Stok Rendah (&le; {LOW_STOCK_THRESHOLD})</span>
                </label>
              </div>
            </div>
          </div>

          {/* Sorting Controls */}
          <div className="space-y-3 lg:col-span-7">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                <ArrowUpDown className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Pengurutan Tabel</span>
              </div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 font-mono text-xs text-slate-700">
                <Clock className="h-3 w-3 text-blue-600" aria-hidden="true" />
                <span>
                  Durasi {activeSortMeta.name}: <strong>{formatDuration(sortOutcome.durationMs)}</strong>
                </span>
              </span>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="inventory-sort-algorithm"
                  className="block text-xs font-medium text-slate-700"
                >
                  Algoritma Sorting
                </label>
                <select
                  id="inventory-sort-algorithm"
                  value={sortAlgorithm}
                  onChange={(event) =>
                    setSortAlgorithm(event.target.value as SortingAlgorithmId)
                  }
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {SORTING_ALGORITHM_LIST.map((algo) => (
                    <option key={algo.id} value={algo.id}>
                      {algo.name} ({algo.averageComplexity})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="inventory-sort-field"
                  className="block text-xs font-medium text-slate-700"
                >
                  Urutkan Berdasarkan
                </label>
                <select
                  id="inventory-sort-field"
                  value={sortField}
                  onChange={(event) => {
                    setSortField(event.target.value as SortableField);
                    setCurrentPage(1);
                  }}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  {SORTABLE_FIELDS.map((field) => (
                    <option key={field} value={field}>
                      {FIELD_LABELS[field]}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="inventory-sort-order"
                  className="block text-xs font-medium text-slate-700"
                >
                  Arah Urutan
                </label>
                <select
                  id="inventory-sort-order"
                  value={sortOrder}
                  onChange={(event) => {
                    setSortOrder(event.target.value as SortOrder);
                    setCurrentPage(1);
                  }}
                  className="mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                >
                  <option value="asc">Naik (A–Z / Kecil–Besar)</option>
                  <option value="desc">Turun (Z–A / Besar–Kecil)</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Inventory Table / Empty States */}
      {items.length === 0 ? (
        <EmptyState
          title="Daftar barang gudang masih kosong"
          description="Tambahkan barang baru secara manual atau muat ulang 28 data simulasi awal untuk memulai manajemen stok."
          actionLabel="Tambah Barang Pertama"
          onAction={openCreateModal}
          secondaryActionLabel="Muat 28 Data Demo"
          onSecondaryAction={onResetDemoData}
        />
      ) : sortedItems.length === 0 ? (
        <EmptyState
          title="Tidak ada barang yang sesuai filter"
          description="Coba ubah pilihan kategori atau nonaktifkan filter stok rendah untuk melihat data barang lainnya."
          actionLabel="Reset Semua Filter"
          onAction={resetFilters}
        />
      ) : (
        <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
          {/* Table Status Header */}
          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-slate-600 sm:text-sm">
              Menampilkan{' '}
              <strong className="font-mono text-slate-900">
                {startRow}–{endRow}
              </strong>{' '}
              dari <strong className="font-mono text-slate-900">{sortedItems.length}</strong> barang
              {sortedItems.length !== items.length ? ` (terfilter dari ${items.length} total)` : ''}
            </p>

            <div className="flex items-center gap-2 text-xs">
              <label htmlFor="inventory-page-size" className="font-medium text-slate-600">
                Baris per halaman:
              </label>
              <select
                id="inventory-page-size"
                value={pageSize}
                onChange={(event) => {
                  setPageSize(Number(event.target.value));
                  setCurrentPage(1);
                }}
                className="rounded-lg border border-slate-300 bg-white px-2.5 py-1 font-mono text-xs text-slate-900 focus:border-blue-500 focus:outline-none"
              >
                {PAGE_SIZE_OPTIONS.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleColumnSort('kode')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      <span>Kode SKU</span>
                      {renderSortIcon('kode')}
                    </button>
                  </th>
                  <th scope="col" className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleColumnSort('nama')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      <span>Nama Barang</span>
                      {renderSortIcon('nama')}
                    </button>
                  </th>
                  <th scope="col" className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => handleToggleColumnSort('kategori')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      <span>Kategori</span>
                      {renderSortIcon('kategori')}
                    </button>
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleToggleColumnSort('stok')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      <span>Stok</span>
                      {renderSortIcon('stok')}
                    </button>
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    <button
                      type="button"
                      onClick={() => handleToggleColumnSort('harga')}
                      className="inline-flex items-center gap-1 hover:text-slate-900"
                    >
                      <span>Harga</span>
                      {renderSortIcon('harga')}
                    </button>
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Lokasi
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Status Stok
                  </th>
                  <th scope="col" className="px-4 py-3 text-right">
                    Aksi
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {paginatedItems.map((item) => {
                  const isHighlighted = matchedItemId === item.id;
                  return (
                    <tr
                      key={item.id}
                      className={`transition-colors ${
                        isHighlighted
                          ? 'bg-emerald-50/90 ring-1 ring-inset ring-emerald-300'
                          : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-slate-800">
                        {item.kode}
                      </td>
                      <td className="max-w-xs px-4 py-3 font-medium text-slate-900">
                        <span className="line-clamp-2">{item.nama}</span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                        {item.kategori}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-sm font-semibold text-slate-900 tabular-nums">
                        {formatNumberID(item.stok)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right font-mono text-xs text-slate-800 tabular-nums">
                        {formatRupiah(item.harga)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                        {item.lokasi}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3">
                        <StockStatusBadge stok={item.stok} />
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => setDetailItem(item)}
                            aria-label={`Lihat detail ${item.nama}`}
                            title="Lihat Detail"
                            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
                          >
                            <Eye className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(item)}
                            aria-label={`Ubah ${item.nama}`}
                            title="Ubah Barang"
                            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-blue-50 hover:text-blue-700"
                          >
                            <Pencil className="h-4 w-4" aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(item)}
                            aria-label={`Hapus ${item.nama}`}
                            title="Hapus Barang"
                            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-700"
                          >
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination Footer */}
          {totalPages > 1 ? (
            <div className="flex flex-col items-center justify-between gap-3 border-t border-slate-200 bg-slate-50/70 px-5 py-3 sm:flex-row">
              <p className="text-xs text-slate-600">
                Halaman <strong className="font-mono text-slate-900">{safePage}</strong> dari{' '}
                <strong className="font-mono text-slate-900">{totalPages}</strong>
              </p>

              <nav aria-label="Paginasi Daftar Barang" className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={safePage === 1}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <ChevronLeft className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Sebelumnya</span>
                </button>

                <div className="hidden items-center gap-1 sm:flex">
                  {Array.from({ length: totalPages }, (_, index) => index + 1).map((page) => (
                    <button
                      key={page}
                      type="button"
                      onClick={() => setCurrentPage(page)}
                      aria-current={page === safePage ? 'page' : undefined}
                      className={`h-8 min-w-[2rem] rounded-lg px-2 font-mono text-xs font-semibold transition-colors ${
                        page === safePage
                          ? 'bg-blue-600 text-white'
                          : 'border border-slate-300 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={safePage === totalPages}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <span>Berikutnya</span>
                  <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </nav>
            </div>
          ) : null}
        </section>
      )}

      {/* Modals */}
      <ItemFormModal
        isOpen={formOpen}
        mode={formMode}
        initialItem={editingItem}
        existingItems={items}
        onClose={() => {
          setFormOpen(false);
          setEditingItem(null);
        }}
        onSave={handleFormSave}
      />

      <ItemDetailModal
        item={detailItem}
        onClose={() => setDetailItem(null)}
        onEdit={(item) => openEditModal(item)}
      />

      <DeleteConfirmModal
        item={deleteTarget}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
      />

      {/* Reset Demo Data Confirmation Dialog */}
      {confirmResetOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]"
          role="dialog"
          aria-modal="true"
          aria-labelledby="reset-demo-modal-title"
          onClick={(event) => {
            if (event.target === event.currentTarget) {
              setConfirmResetOpen(false);
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                  <RotateCcw className="h-5 w-5" aria-hidden="true" />
                </div>
                <div>
                  <h2 id="reset-demo-modal-title" className="text-base font-bold text-slate-900">
                    Reset ke 28 Data Demo Awal?
                  </h2>
                  <p className="mt-1 text-sm text-slate-600">
                    Seluruh penambahan, pengubahan, atau penghapusan barang pada daftar lokal akan
                    dikembalikan ke 28 data simulasi awal.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                aria-label="Tutup konfirmasi reset data"
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmResetOpen(false)}
                className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  onResetDemoData();
                  setSearchState(null);
                  resetFilters();
                  setConfirmResetOpen(false);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-amber-700"
              >
                <RotateCcw className="h-4 w-4" aria-hidden="true" />
                <span>Ya, Reset Data Demo</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
