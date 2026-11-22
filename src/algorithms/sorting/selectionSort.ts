import type { Comparator } from '../../types';
import { assertWithinDeadline } from './comparator';

/**
 * Mengurutkan array secara in-place menggunakan Selection Sort.
 */
export function selectionSortInPlace<T>(
  arr: T[],
  comparator: Comparator<T>,
  deadlineMs?: number,
): T[] {
  const n = arr.length;
  if (n <= 1) {
    return arr;
  }

  for (let i = 0; i < n - 1; i++) {
    if (deadlineMs !== undefined) {
      assertWithinDeadline(deadlineMs, 'Selection Sort');
    }

    let minIndex = i;
    for (let j = i + 1; j < n; j++) {
      if (comparator(arr[j], arr[minIndex]) < 0) {
        minIndex = j;
      }
    }

    if (minIndex !== i) {
      const temp = arr[i];
      arr[i] = arr[minIndex];
      arr[minIndex] = temp;
    }
  }

  return arr;
}

/**
 * Mengembalikan salinan terurut menggunakan Selection Sort tanpa memutasi array masukan.
 */
export function selectionSort<T>(
  data: readonly T[],
  comparator: Comparator<T>,
): T[] {
  return selectionSortInPlace([...data], comparator);
}
