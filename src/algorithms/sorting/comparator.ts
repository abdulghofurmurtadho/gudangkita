import type {
  Comparator,
  SortableField,
  SortOrder,
  WarehouseItem,
} from '../../types';

/**
 * Error yang dilempar ketika eksekusi algoritma melampaui batas waktu (deadline).
 */
export class AlgorithmTimeoutError extends Error {
  public readonly timeoutMs?: number;

  constructor(
    message = 'Eksekusi algoritma melampaui batas waktu yang ditentukan.',
    timeoutMs?: number,
  ) {
    super(message);
    this.name = 'AlgorithmTimeoutError';
    this.timeoutMs = timeoutMs;
    Object.setPrototypeOf(this, AlgorithmTimeoutError.prototype);
  }
}

/**
 * Memeriksa apakah waktu saat ini telah melewati batas deadline yang diberikan.
 */
export function assertWithinDeadline(
  deadlineMs: number | undefined,
  algorithmLabel = 'Algoritma',
): void {
  if (deadlineMs !== undefined && performance.now() > deadlineMs) {
    throw new AlgorithmTimeoutError(
      `Eksekusi ${algorithmLabel} melampaui batas waktu yang ditentukan.`,
    );
  }
}

function compareNormalizedText(a: string, b: string): number {
  const aNorm = a.trim().toLowerCase();
  const bNorm = b.trim().toLowerCase();
  return aNorm < bNorm ? -1 : aNorm > bNorm ? 1 : 0;
}

function compareFieldPrimary(
  a: WarehouseItem,
  b: WarehouseItem,
  field: SortableField,
): number {
  switch (field) {
    case 'kode':
    case 'nama':
    case 'kategori':
      return compareNormalizedText(a[field], b[field]);
    case 'stok':
    case 'harga':
      return a[field] - b[field];
  }
}

/**
 * Membuat komparator deterministik untuk mengurutkan WarehouseItem berdasarkan
 * atribut utama dan arah urutan, dengan tie-breaker tetap kode naik lalu id naik.
 */
export function createItemComparator(
  field: SortableField,
  order: SortOrder,
): Comparator<WarehouseItem> {
  return (a: WarehouseItem, b: WarehouseItem): number => {
    const primary = compareFieldPrimary(a, b, field);
    if (primary !== 0) {
      return order === 'desc' ? -primary : primary;
    }

    const codeTieBreaker = compareNormalizedText(a.kode, b.kode);
    if (codeTieBreaker !== 0) {
      return codeTieBreaker;
    }

    return a.id < b.id ? -1 : a.id > b.id ? 1 : 0;
  };
}

/**
 * Membuat komparator naik (ascending) berdasarkan atribut kunci pencarian
 * dengan tie-breaker kode naik (dan id naik) sebagai prasyarat Binary Search.
 */
export function createKeySortComparator(
  field: SortableField,
): Comparator<WarehouseItem> {
  return createItemComparator(field, 'asc');
}
