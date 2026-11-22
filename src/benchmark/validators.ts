import { compareKeys } from '../algorithms/searching';
import type { Comparator, KeyAccessor, WarehouseItem } from '../types';

export interface ValidationResult {
  valid: boolean;
  reason?: string;
}

/**
 * Memvalidasi hasil pengurutan di luar timer pengukuran:
 * 1) Panjang keluaran sama dengan masukan,
 * 2) Multiset ID barang identik tanpa ada data yang hilang atau terduplikasi,
 * 3) Seluruh pasangan berurutan memenuhi comparator(output[i - 1], output[i]) <= 0.
 */
export function validateSortResult(
  input: readonly WarehouseItem[],
  output: readonly WarehouseItem[],
  comparator: Comparator<WarehouseItem>,
): ValidationResult {
  if (output.length !== input.length) {
    return {
      valid: false,
      reason: `Jumlah item keluaran (${output.length}) tidak sama dengan masukan (${input.length}).`,
    };
  }

  const idCounts = new Map<string, number>();
  for (let i = 0; i < input.length; i++) {
    const id = input[i].id;
    idCounts.set(id, (idCounts.get(id) ?? 0) + 1);
  }

  for (let i = 0; i < output.length; i++) {
    const id = output[i].id;
    const remaining = idCounts.get(id);
    if (remaining === undefined || remaining <= 0) {
      return {
        valid: false,
        reason: `Item dengan ID "${id}" pada hasil pengurutan tidak cocok dengan himpunan masukan.`,
      };
    }
    if (remaining === 1) {
      idCounts.delete(id);
    } else {
      idCounts.set(id, remaining - 1);
    }
  }

  if (idCounts.size > 0) {
    return {
      valid: false,
      reason: 'Terdapat item masukan yang hilang dari hasil pengurutan.',
    };
  }

  for (let i = 1; i < output.length; i++) {
    if (comparator(output[i - 1], output[i]) > 0) {
      return {
        valid: false,
        reason: `Urutan hasil tidak monoton pada indeks ${i - 1} dan ${i}.`,
      };
    }
  }

  return { valid: true };
}

/**
 * Memvalidasi hasil pencarian terhadap kunci target:
 * - Jika foundIndex === -1, memastikan tidak ada elemen pada data yang cocok.
 * - Jika foundIndex >= 0, memastikan indeks valid, cocok dengan target, dan merupakan kecocokan pertama.
 */
export function validateSearchResult(
  data: readonly WarehouseItem[],
  target: string | number,
  keyAccessor: KeyAccessor<WarehouseItem>,
  foundIndex: number,
): ValidationResult {
  if (!Number.isInteger(foundIndex) || foundIndex < -1 || foundIndex >= data.length) {
    return {
      valid: false,
      reason: `Indeks hasil pencarian (${foundIndex}) berada di luar batas panjang dataset (${data.length}).`,
    };
  }

  if (foundIndex === -1) {
    for (let i = 0; i < data.length; i++) {
      if (compareKeys(keyAccessor(data[i]), target) === 0) {
        return {
          valid: false,
          reason: `Algoritma melaporkan tidak ditemukan (-1), padahal kecocokan ada pada indeks ${i}.`,
        };
      }
    }
    return { valid: true };
  }

  if (compareKeys(keyAccessor(data[foundIndex]), target) !== 0) {
    return {
      valid: false,
      reason: `Elemen pada indeks ${foundIndex} tidak cocok dengan nilai target pencarian.`,
    };
  }

  for (let i = 0; i < foundIndex; i++) {
    if (compareKeys(keyAccessor(data[i]), target) === 0) {
      return {
        valid: false,
        reason: `Indeks ${foundIndex} bukan kemunculan pertama; kecocokan lebih awal berada pada indeks ${i}.`,
      };
    }
  }

  return { valid: true };
}
