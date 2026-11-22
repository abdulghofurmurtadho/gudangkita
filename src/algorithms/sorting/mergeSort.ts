import type { Comparator } from '../../types';
import { assertWithinDeadline } from './comparator';

function copyRange<T>(
  src: readonly T[],
  dst: T[],
  start: number,
  end: number,
): void {
  for (let k = start; k < end; k++) {
    dst[k] = src[k];
  }
}

function mergeRanges<T>(
  src: readonly T[],
  dst: T[],
  left: number,
  mid: number,
  right: number,
  comparator: Comparator<T>,
): void {
  let i = left;
  let j = mid;
  let k = left;

  while (i < mid && j < right) {
    // Ambil dari sisi kiri saat setara (<= 0) untuk menjaga stabilitas.
    if (comparator(src[i], src[j]) <= 0) {
      dst[k++] = src[i++];
    } else {
      dst[k++] = src[j++];
    }
  }

  while (i < mid) {
    dst[k++] = src[i++];
  }

  while (j < right) {
    dst[k++] = src[j++];
  }
}

/**
 * Mengurutkan array secara stabil menggunakan Merge Sort bottom-up dengan
 * array bantu berukuran O(n), menyalin hasil akhir ke `arr` dan mengembalikannya.
 */
export function mergeSortPrepared<T>(
  arr: T[],
  comparator: Comparator<T>,
  deadlineMs?: number,
): T[] {
  const n = arr.length;
  if (n <= 1) {
    return arr;
  }

  let src: T[] = arr;
  let dst: T[] = new Array<T>(n);
  let mergeCounter = 0;

  for (let width = 1; width < n; width *= 2) {
    if (deadlineMs !== undefined) {
      assertWithinDeadline(deadlineMs, 'Merge Sort');
    }

    const step = width * 2;
    for (let left = 0; left < n; left += step) {
      if (deadlineMs !== undefined && (++mergeCounter & 63) === 0) {
        assertWithinDeadline(deadlineMs, 'Merge Sort');
      }

      const mid = Math.min(left + width, n);
      const right = Math.min(left + step, n);

      if (mid >= right || comparator(src[mid - 1], src[mid]) <= 0) {
        copyRange(src, dst, left, right);
      } else {
        mergeRanges(src, dst, left, mid, right, comparator);
      }
    }

    const prevSrc = src;
    src = dst;
    dst = prevSrc;
  }

  if (src !== arr) {
    copyRange(src, arr, 0, n);
  }

  return arr;
}

/**
 * Mengembalikan salinan terurut secara stabil menggunakan Merge Sort tanpa memutasi input.
 */
export function mergeSort<T>(
  data: readonly T[],
  comparator: Comparator<T>,
): T[] {
  return mergeSortPrepared([...data], comparator);
}
