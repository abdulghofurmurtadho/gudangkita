import type { ItemInput, ItemValidationErrors, WarehouseItem } from '../types';
import { INITIAL_WAREHOUSE_ITEMS } from './initialItems';

export const STORAGE_KEY = 'gudangkita.warehouse.items.v1';

function getSafeStorage(): Storage | null {
  try {
    if (typeof globalThis !== 'undefined' && 'localStorage' in globalThis) {
      return globalThis.localStorage ?? null;
    }
    return null;
  } catch {
    return null;
  }
}

function cloneItems(items: readonly WarehouseItem[]): WarehouseItem[] {
  return items.map((item) => ({ ...item }));
}

function isValidWarehouseItem(raw: unknown): raw is WarehouseItem {
  if (typeof raw !== 'object' || raw === null) {
    return false;
  }
  const candidate = raw as Record<string, unknown>;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.kode === 'string' &&
    typeof candidate.nama === 'string' &&
    typeof candidate.kategori === 'string' &&
    typeof candidate.stok === 'number' &&
    Number.isFinite(candidate.stok) &&
    typeof candidate.harga === 'number' &&
    Number.isFinite(candidate.harga) &&
    typeof candidate.lokasi === 'string' &&
    typeof candidate.diperbaruiPada === 'string'
  );
}

/**
 * Memuat daftar barang gudang dari localStorage secara aman.
 * Jika tidak tersedia (SSR/Node) atau data rusak, mengembalikan salinan data awal.
 */
export function loadWarehouseItems(): WarehouseItem[] {
  const storage = getSafeStorage();
  if (!storage) {
    return cloneItems(INITIAL_WAREHOUSE_ITEMS);
  }

  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) {
      return cloneItems(INITIAL_WAREHOUSE_ITEMS);
    }

    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed) || !parsed.every(isValidWarehouseItem)) {
      return cloneItems(INITIAL_WAREHOUSE_ITEMS);
    }

    return cloneItems(parsed);
  } catch {
    return cloneItems(INITIAL_WAREHOUSE_ITEMS);
  }
}

/**
 * Menyimpan daftar barang gudang ke localStorage.
 */
export function saveWarehouseItems(items: readonly WarehouseItem[]): void {
  const storage = getSafeStorage();
  if (!storage) {
    return;
  }

  try {
    storage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    // Abaikan kegagalan kuota penyimpanan atau pembatasan akses browser.
  }
}

/**
 * Mengembalikan data gudang ke 28 item awal dan menyimpannya ke localStorage.
 */
export function resetWarehouseItems(): WarehouseItem[] {
  const fresh = cloneItems(INITIAL_WAREHOUSE_ITEMS);
  saveWarehouseItems(fresh);
  return fresh;
}

/**
 * Memvalidasi masukan formulir tambah/ubah barang gudang dalam Bahasa Indonesia.
 */
export function validateItemInput(
  input: ItemInput,
  existingItems: readonly WarehouseItem[],
  editingId?: string,
): ItemValidationErrors {
  const errors: ItemValidationErrors = {};

  const trimmedKode = input.kode.trim();
  if (!trimmedKode) {
    errors.kode = 'Kode barang wajib diisi.';
  } else if (trimmedKode.length < 3) {
    errors.kode = 'Kode barang minimal 3 karakter.';
  } else if (trimmedKode.length > 32) {
    errors.kode = 'Kode barang maksimal 32 karakter.';
  } else {
    const normalizedKode = trimmedKode.toLowerCase();
    const isDuplicate = existingItems.some(
      (item) =>
        item.id !== editingId && item.kode.trim().toLowerCase() === normalizedKode,
    );
    if (isDuplicate) {
      errors.kode = `Kode barang "${trimmedKode}" sudah digunakan oleh barang lain.`;
    }
  }

  const trimmedNama = input.nama.trim();
  if (!trimmedNama) {
    errors.nama = 'Nama barang wajib diisi.';
  } else if (trimmedNama.length < 2) {
    errors.nama = 'Nama barang minimal 2 karakter.';
  } else if (trimmedNama.length > 100) {
    errors.nama = 'Nama barang maksimal 100 karakter.';
  }

  const trimmedKategori = input.kategori.trim();
  if (!trimmedKategori) {
    errors.kategori = 'Kategori barang wajib dipilih.';
  }

  if (!Number.isFinite(input.stok)) {
    errors.stok = 'Stok harus berupa angka yang valid.';
  } else if (!Number.isInteger(input.stok)) {
    errors.stok = 'Stok harus berupa bilangan bulat.';
  } else if (input.stok < 0) {
    errors.stok = 'Stok tidak boleh bernilai negatif.';
  }

  if (!Number.isFinite(input.harga)) {
    errors.harga = 'Harga harus berupa angka yang valid.';
  } else if (input.harga < 0) {
    errors.harga = 'Harga tidak boleh bernilai negatif.';
  }

  const trimmedLokasi = input.lokasi.trim();
  if (trimmedLokasi.length > 50) {
    errors.lokasi = 'Lokasi rak maksimal 50 karakter.';
  }

  return errors;
}

/**
 * Menghasilkan kode barang unik berikutnya mengikuti pola BRG-XXXXXX.
 */
export function generateNextKode(items: readonly WarehouseItem[]): string {
  const existingCodes = new Set<string>();
  let maxNumber = 0;

  for (const item of items) {
    const trimmed = item.kode.trim().toUpperCase();
    existingCodes.add(trimmed);
    const match = /^BRG-(\d+)$/.exec(trimmed);
    if (match) {
      const parsed = Number.parseInt(match[1], 10);
      if (Number.isFinite(parsed) && parsed > maxNumber) {
        maxNumber = parsed;
      }
    }
  }

  let nextNumber = maxNumber + 1;
  let candidate = `BRG-${String(nextNumber).padStart(6, '0')}`;
  while (existingCodes.has(candidate)) {
    nextNumber += 1;
    candidate = `BRG-${String(nextNumber).padStart(6, '0')}`;
  }

  return candidate;
}
