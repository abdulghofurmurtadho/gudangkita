import type { Comparator } from '../../types';
import { assertWithinDeadline } from './comparator';

/**
 * Mengurutkan array secara in-place dan stabil menggunakan Insertion Sort.
 */
export function insertionSortInPlace<T>(
  arr: T[],
  comparator: Comparator<T>,
  deadlineMs?: number,
): T[] {
  const n = arr.length;
  if (n <= 1) {
    return arr;
  }

  for (let i = 1; i < n; i++) {
    if (deadlineMs !== undefined) {
      assertWithinDeadline(deadlineMs, 'Insertion Sort');
    }

    const current = arr[i];
    let j = i - 1;

    // Pertahankan urutan relatif elemen bernilai setara (strict > 0) agar stabil.
    while (j >= 0 && comparator(arr[j], current) > 0) {
      arr[j + 1] = arr[j];
      j--;
    }

    arr[j + 1] = current;
  }

  return arr;
}

/**
 * Mengembalikan salinan terurut menggunakan Insertion Sort tanpa memutasi array masukan.
 */
export function insertionSort<T>(
  data: readonly T[],
  comparator: Comparator<T>,
): T[] {
  return insertionSortInPlace([...data], comparator);
}
