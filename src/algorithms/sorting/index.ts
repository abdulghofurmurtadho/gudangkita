import type {
  AlgorithmMetadata,
  Comparator,
  SortableField,
  SortingAlgorithmId,
  SortOrder,
  WarehouseItem,
} from '../../types';
import {
  AlgorithmTimeoutError,
  assertWithinDeadline,
  createItemComparator,
  createKeySortComparator,
} from './comparator';
import { bubbleSort, bubbleSortInPlace } from './bubbleSort';
import { selectionSort, selectionSortInPlace } from './selectionSort';
import { insertionSort, insertionSortInPlace } from './insertionSort';
import { mergeSort, mergeSortPrepared } from './mergeSort';
import { quickSort, quickSortInPlace } from './quickSort';
import { nativeSort, nativeSortInPlace } from './nativeSort';

export {
  AlgorithmTimeoutError,
  createItemComparator,
  createKeySortComparator,
  bubbleSortInPlace,
  bubbleSort,
  selectionSortInPlace,
  selectionSort,
  insertionSortInPlace,
  insertionSort,
  mergeSortPrepared,
  mergeSort,
  quickSortInPlace,
  quickSort,
  nativeSortInPlace,
  nativeSort,
};

/**
 * Metadata lengkap untuk seluruh algoritma pengurutan beserta pembanding praktis.
 */
export const SORTING_ALGORITHMS: Record<SortingAlgorithmId, AlgorithmMetadata> =
  {
    bubble: {
      id: 'bubble',
      name: 'Bubble Sort',
      mode: 'sorting',
      bestComplexity: 'O(n)',
      averageComplexity: 'O(n²)',
      worstComplexity: 'O(n²)',
      spaceComplexity: 'O(1)',
      stable: true,
      isQuadratic: true,
      isOptionalBaseline: false,
      prerequisite:
        'Tidak ada prasyarat urutan awal; berhenti lebih awal apabila tidak terjadi pertukaran pada satu lintasan.',
      description:
        'Algoritma pengurutan bertahap yang membandingkan dan menukar elemen bersebelahan secara berulang dengan optimasi penghentian dini saat data sudah terurut.',
    },
    selection: {
      id: 'selection',
      name: 'Selection Sort',
      mode: 'sorting',
      bestComplexity: 'O(n²)',
      averageComplexity: 'O(n²)',
      worstComplexity: 'O(n²)',
      spaceComplexity: 'O(1)',
      stable: false,
      isQuadratic: true,
      isOptionalBaseline: false,
      prerequisite:
        'Tidak ada prasyarat urutan awal; selalu melakukan pemindaian linear sisa elemen pada setiap posisi.',
      description:
        'Memilih elemen terkecil (sesuai komparator) dari bagian yang belum terurut dan menukarnya ke posisi awal bagian tersebut satu kali per iterasi.',
    },
    insertion: {
      id: 'insertion',
      name: 'Insertion Sort',
      mode: 'sorting',
      bestComplexity: 'O(n)',
      averageComplexity: 'O(n²)',
      worstComplexity: 'O(n²)',
      spaceComplexity: 'O(1)',
      stable: true,
      isQuadratic: true,
      isOptionalBaseline: false,
      prerequisite:
        'Tidak ada prasyarat urutan awal; sangat cepat pada data yang sudah atau hampir terurut.',
      description:
        'Menyisipkan setiap elemen ke posisi yang tepat pada bagian kiri yang sudah terurut secara stabil melalui pergeseran elemen yang lebih besar.',
    },
    merge: {
      id: 'merge',
      name: 'Merge Sort',
      mode: 'sorting',
      bestComplexity: 'O(n log n)',
      averageComplexity: 'O(n log n)',
      worstComplexity: 'O(n log n)',
      spaceComplexity: 'O(n)',
      stable: true,
      isQuadratic: false,
      isOptionalBaseline: false,
      prerequisite:
        'Membutuhkan array bantu berukuran O(n) untuk penggabungan sub-array secara stabil.',
      description:
        'Algoritma divide-and-conquer stabil yang menggabungkan sub-array secara berurutan menggunakan buffer bantu O(n) dengan kompleksitas terjamin O(n log n).',
    },
    quick: {
      id: 'quick',
      name: 'Quick Sort',
      mode: 'sorting',
      bestComplexity: 'O(n log n)',
      averageComplexity: 'O(n log n)',
      worstComplexity: 'O(n²)',
      spaceComplexity: 'O(log n)',
      stable: false,
      isQuadratic: false,
      isOptionalBaseline: false,
      prerequisite:
        'Implementasi iteratif dengan stack eksplisit O(log n), pivot median-of-three, serta partisi 3-arah agar tahan terhadap data terurut maupun duplikat.',
      description:
        'Algoritma partisi in-place iteratif yang membagi elemen menjadi lebih kecil, sama dengan, dan lebih besar dari pivot median-of-three dengan pemrosesan sub-array terkecil lebih dulu.',
    },
    native: {
      id: 'native',
      name: 'Array.prototype.sort (Native JS)',
      mode: 'sorting',
      bestComplexity: 'Bergantung runtime JS',
      averageComplexity: 'Bergantung runtime JS',
      worstComplexity: 'Bergantung runtime JS',
      spaceComplexity: 'Bergantung runtime JS',
      stable: true,
      isQuadratic: false,
      isOptionalBaseline: true,
      prerequisite:
        'Pembanding praktis bawaan JavaScript (Array.prototype.sort) dengan komparator eksplisit; bukan salah satu algoritma pengurutan spesifik.',
      description:
        'Pembanding praktis menggunakan Array.prototype.sort bawaan JavaScript dengan komparator eksplisit. Detail algoritma internalnya bergantung pada runtime/engine JavaScript yang berjalan dan bukan merupakan salah satu algoritma spesifik yang diimplementasikan manual.',
    },
  };

/**
 * Daftar berurutan metadata algoritma pengurutan untuk ditampilkan di UI.
 */
export const SORTING_ALGORITHM_LIST: AlgorithmMetadata[] = [
  SORTING_ALGORITHMS.bubble,
  SORTING_ALGORITHMS.selection,
  SORTING_ALGORITHMS.insertion,
  SORTING_ALGORITHMS.merge,
  SORTING_ALGORITHMS.quick,
  SORTING_ALGORITHMS.native,
];

/**
 * Menjalankan algoritma pengurutan langsung pada salinan array yang sudah
 * disiapkan sebelumnya di luar timer pengukuran.
 */
export function runPreparedSort<T>(
  preparedCopy: T[],
  algorithm: SortingAlgorithmId,
  comparator: Comparator<T>,
  deadlineMs?: number,
): T[] {
  switch (algorithm) {
    case 'bubble':
      return bubbleSortInPlace(preparedCopy, comparator, deadlineMs);
    case 'selection':
      return selectionSortInPlace(preparedCopy, comparator, deadlineMs);
    case 'insertion':
      return insertionSortInPlace(preparedCopy, comparator, deadlineMs);
    case 'merge':
      return mergeSortPrepared(preparedCopy, comparator, deadlineMs);
    case 'quick':
      return quickSortInPlace(preparedCopy, comparator, deadlineMs);
    case 'native':
      if (deadlineMs !== undefined) {
        assertWithinDeadline(deadlineMs, 'Native Array.prototype.sort');
      }
      return nativeSortInPlace(preparedCopy, comparator);
  }
}

/**
 * Mengembalikan salinan baru daftar barang gudang yang telah diurutkan secara
 * deterministik tanpa memutasi array masukan asli.
 */
export function sortItems(
  items: readonly WarehouseItem[],
  algorithm: SortingAlgorithmId,
  field: SortableField,
  order: SortOrder,
): WarehouseItem[] {
  const copy = [...items];
  const comparator = createItemComparator(field, order);
  return runPreparedSort(copy, algorithm, comparator);
}
