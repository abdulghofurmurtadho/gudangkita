import type { KeyAccessor } from '../../types';
import { compareKeys } from './normalizer';

/**
 * Mencari indeks elemen pertama yang cocok dengan target secara berurutan (Linear Search).
 * Mengembalikan -1 apabila target bernilai NaN atau tidak ditemukan.
 */
export function linearSearch<T>(
  data: readonly T[],
  target: string | number,
  keyAccessor: KeyAccessor<T>,
): number {
  if (typeof target === 'number' && Number.isNaN(target)) {
    return -1;
  }

  for (let i = 0; i < data.length; i++) {
    if (compareKeys(keyAccessor(data[i]), target) === 0) {
      return i;
    }
  }

  return -1;
}
