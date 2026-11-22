import type { KeyAccessor, SortableField, WarehouseItem } from '../../types';

/**
 * Menormalkan teks pencarian dengan menghapus spasi pinggir dan mengubah ke huruf kecil.
 */
export function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Menentukan apakah field pengurutan/pencarian bertipe numerik.
 */
export function isNumericField(field: SortableField): boolean {
  return field === 'stok' || field === 'harga';
}

/**
 * Membuat pengakses kunci terstandarisasi untuk WarehouseItem sesuai field target.
 */
export function createKeyAccessor(
  field: SortableField,
): KeyAccessor<WarehouseItem> {
  switch (field) {
    case 'stok':
    case 'harga':
      return (item: WarehouseItem): number => item[field];
    case 'kode':
    case 'nama':
    case 'kategori':
      return (item: WarehouseItem): string => normalizeSearchText(item[field]);
  }
}

/**
 * Menormalkan target pencarian mentah agar sesuai dengan tipe kunci pada field.
 * Mengembalikan null apabila field numerik menerima masukan kosong atau bukan angka valid.
 */
export function normalizeTargetForField(
  field: SortableField,
  rawTarget: string | number,
): string | number | null {
  if (isNumericField(field)) {
    if (typeof rawTarget === 'number') {
      return Number.isFinite(rawTarget) ? rawTarget : null;
    }

    const trimmed = rawTarget.trim();
    if (trimmed === '') {
      return null;
    }

    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  return normalizeSearchText(String(rawTarget));
}

/**
 * Membandingkan dua nilai kunci yang telah dinormalisasi secara deterministik (-1, 0, 1).
 */
export function compareKeys(a: string | number, b: string | number): number {
  if (typeof a === 'number' && typeof b === 'number') {
    if (Number.isNaN(a) && Number.isNaN(b)) {
      return 0;
    }
    if (Number.isNaN(a)) {
      return -1;
    }
    if (Number.isNaN(b)) {
      return 1;
    }
    return a < b ? -1 : a > b ? 1 : 0;
  }

  if (typeof a === 'string' && typeof b === 'string') {
    return a < b ? -1 : a > b ? 1 : 0;
  }

  return typeof a === 'number' ? -1 : 1;
}
