import type { Comparator } from '../../types';

/**
 * Mengurutkan array secara in-place menggunakan Array.prototype.sort bawaan
 * JavaScript dengan komparator eksplisit sebagai pembanding praktis.
 */
export function nativeSortInPlace<T>(
  arr: T[],
  comparator: Comparator<T>,
): T[] {
  return arr.sort(comparator);
}

/**
 * Mengembalikan salinan terurut menggunakan Array.prototype.sort tanpa memutasi input.
 */
export function nativeSort<T>(
  data: readonly T[],
  comparator: Comparator<T>,
): T[] {
  return nativeSortInPlace([...data], comparator);
}
