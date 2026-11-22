import type { Comparator } from '../../types';
import { assertWithinDeadline } from './comparator';

function swap<T>(arr: T[], i: number, j: number): void {
  if (i === j) {
    return;
  }
  const temp = arr[i];
  arr[i] = arr[j];
  arr[j] = temp;
}

/**
 * Mengurutkan array secara in-place menggunakan Quick Sort iteratif dengan
 * stack eksplisit (push sub-array lebih besar terlebih dahulu sehingga kedalaman
 * stack maksimal O(log n)), pemilihan pivot median-of-three, dan partisi 3-arah.
 */
export function quickSortInPlace<T>(
  arr: T[],
  comparator: Comparator<T>,
  deadlineMs?: number,
): T[] {
  const n = arr.length;
  if (n <= 1) {
    return arr;
  }

  // Simpan pasangan indeks [low, high] secara datar untuk menghindari alokasi objek.
  const stack: number[] = [0, n - 1];
  let iterations = 0;

  while (stack.length > 0) {
    if (deadlineMs !== undefined && (iterations & 15) === 0) {
      assertWithinDeadline(deadlineMs, 'Quick Sort');
    }
    iterations++;

    const high = stack.pop()!;
    const low = stack.pop()!;

    if (low >= high) {
      continue;
    }

    if (high - low === 1) {
      if (comparator(arr[low], arr[high]) > 0) {
        swap(arr, low, high);
      }
      continue;
    }

    // Pilih pivot median-of-three dari posisi awal, tengah, dan akhir.
    const mid = low + ((high - low) >>> 1);
    if (comparator(arr[mid], arr[low]) < 0) {
      swap(arr, low, mid);
    }
    if (comparator(arr[high], arr[low]) < 0) {
      swap(arr, low, high);
    }
    if (comparator(arr[high], arr[mid]) < 0) {
      swap(arr, mid, high);
    }

    // Tempatkan pivot di indeks low lalu lakukan partisi 3-arah (Dutch National Flag).
    swap(arr, low, mid);
    const pivot = arr[low];

    let lt = low;
    let i = low + 1;
    let gt = high;

    while (i <= gt) {
      const cmp = comparator(arr[i], pivot);
      if (cmp < 0) {
        swap(arr, lt, i);
        lt++;
        i++;
      } else if (cmp > 0) {
        swap(arr, i, gt);
        gt--;
      } else {
        i++;
      }
    }

    const leftSize = lt - low;
    const rightSize = high - gt;

    // Dorong partisi yang lebih besar terlebih dahulu agar partisi lebih kecil
    // diproses lebih dulu dan kedalaman stack terjaga maksimal O(log n).
    if (leftSize > rightSize) {
      if (leftSize > 1) {
        stack.push(low, lt - 1);
      }
      if (rightSize > 1) {
        stack.push(gt + 1, high);
      }
    } else {
      if (rightSize > 1) {
        stack.push(gt + 1, high);
      }
      if (leftSize > 1) {
        stack.push(low, lt - 1);
      }
    }
  }

  return arr;
}

/**
 * Mengembalikan salinan terurut menggunakan Quick Sort iteratif tanpa memutasi array masukan.
 */
export function quickSort<T>(
  data: readonly T[],
  comparator: Comparator<T>,
): T[] {
  return quickSortInPlace([...data], comparator);
}
