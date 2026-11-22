import type { Comparator } from '../../types';
import { assertWithinDeadline } from './comparator';

/**
 * Mengurutkan array secara in-place menggunakan Bubble Sort dengan optimasi
 * penghentian dini saat tidak ada pertukaran dalam satu lintasan penuh.
 */
export function bubbleSortInPlace<T>(
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
      assertWithinDeadline(deadlineMs, 'Bubble Sort');
    }

    let swapped = false;
    const limit = n - 1 - i;

    for (let j = 0; j < limit; j++) {
      if (comparator(arr[j], arr[j + 1]) > 0) {
        const temp = arr[j];
        arr[j] = arr[j + 1];
        arr[j + 1] = temp;
        swapped = true;
      }
    }

    if (!swapped) {
      break;
    }
  }

  return arr;
}

/**
 * Mengembalikan salinan terurut menggunakan Bubble Sort tanpa memutasi array masukan.
 */
export function bubbleSort<T>(
  data: readonly T[],
  comparator: Comparator<T>,
): T[] {
  return bubbleSortInPlace([...data], comparator);
}
