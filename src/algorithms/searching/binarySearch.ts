import type { KeyAccessor } from '../../types';
import { compareKeys } from './normalizer';

/**
 * Memeriksa apakah array sudah terurut menaik (non-descending) berdasarkan keyAccessor.
 */
export function isSortedByKey<T>(
  data: readonly T[],
  keyAccessor: KeyAccessor<T>,
): boolean {
  if (data.length <= 1) {
    return true;
  }

  let prevKey = keyAccessor(data[0]);
  for (let i = 1; i < data.length; i++) {
    const currKey = keyAccessor(data[i]);
    if (compareKeys(prevKey, currKey) > 0) {
      return false;
    }
    prevKey = currKey;
  }

  return true;
}

/**
 * Mencari indeks kecocokan pertama pada data terurut menaik menggunakan
 * prosedur lower-bound Binary Search. Mengembalikan -1 apabila tidak ditemukan.
 */
export function binarySearch<T>(
  data: readonly T[],
  target: string | number,
  keyAccessor: KeyAccessor<T>,
): number {
  if (
    data.length === 0 ||
    (typeof target === 'number' && Number.isNaN(target))
  ) {
    return -1;
  }

  let low = 0;
  let high = data.length;

  while (low < high) {
    const mid = low + ((high - low) >>> 1);
    if (compareKeys(keyAccessor(data[mid]), target) < 0) {
      low = mid + 1;
    } else {
      high = mid;
    }
  }

  if (low < data.length && compareKeys(keyAccessor(data[low]), target) === 0) {
    return low;
  }

  return -1;
}
