import type {
  AlgorithmMetadata,
  SearchingAlgorithmId,
  SearchOutput,
  SortableField,
  WarehouseItem,
} from '../../types';
import {
  compareKeys,
  createKeyAccessor,
  isNumericField,
  normalizeSearchText,
  normalizeTargetForField,
} from './normalizer';
import { linearSearch } from './linearSearch';
import { binarySearch, isSortedByKey } from './binarySearch';

export {
  normalizeSearchText,
  isNumericField,
  createKeyAccessor,
  normalizeTargetForField,
  compareKeys,
  linearSearch,
  isSortedByKey,
  binarySearch,
};

/**
 * Metadata lengkap untuk algoritma pencarian beserta prasyaratnya.
 */
export const SEARCHING_ALGORITHMS: Record<
  SearchingAlgorithmId,
  AlgorithmMetadata
> = {
  linear: {
    id: 'linear',
    name: 'Linear Search',
    mode: 'searching',
    bestComplexity: 'O(1)',
    averageComplexity: 'O(n)',
    worstComplexity: 'O(n)',
    spaceComplexity: 'O(1)',
    prerequisite:
      'Tidak ada prasyarat urutan data; dapat langsung memindai data acak maupun terurut.',
    description:
      'Memeriksa setiap elemen secara berurutan dari indeks awal hingga menemukan kecocokan pertama atau mencapai akhir daftar.',
  },
  binary: {
    id: 'binary',
    name: 'Binary Search',
    mode: 'searching',
    bestComplexity: 'O(1)',
    averageComplexity: 'O(log n)',
    worstComplexity: 'O(log n)',
    spaceComplexity: 'O(1)',
    prerequisite:
      'Data wajib terurut menaik berdasarkan atribut kunci yang sama. Biaya persiapan pengurutan (jika dilakukan) dicatat terpisah dari waktu pencarian.',
    description:
      'Menggunakan prosedur lower-bound pada array terurut menaik untuk membelah ruang pencarian menjadi dua di setiap langkah dan mengembalikan indeks kecocokan pertama.',
  },
};

/**
 * Daftar berurutan metadata algoritma pencarian untuk ditampilkan di UI.
 */
export const SEARCHING_ALGORITHM_LIST: AlgorithmMetadata[] = [
  SEARCHING_ALGORITHMS.linear,
  SEARCHING_ALGORITHMS.binary,
];

/**
 * Menjalankan pencarian item gudang berdasarkan algoritma, field kunci, dan target mentah.
 * Binary Search akan menolak eksekusi apabila data belum terurut menaik menurut kunci.
 */
export function searchItems(
  items: readonly WarehouseItem[],
  algorithm: SearchingAlgorithmId,
  field: SortableField,
  rawTarget: string | number,
): SearchOutput<WarehouseItem> {
  const normalizedTarget = normalizeTargetForField(field, rawTarget);
  if (normalizedTarget === null) {
    return { found: false, index: -1, item: null };
  }

  const keyAccessor = createKeyAccessor(field);

  let index: number;
  if (algorithm === 'binary') {
    if (!isSortedByKey(items, keyAccessor)) {
      return {
        found: false,
        index: -1,
        item: null,
        preconditionError:
          'Binary Search mensyaratkan data terurut menaik berdasarkan atribut kunci yang sama.',
      };
    }
    index = binarySearch(items, normalizedTarget, keyAccessor);
  } else {
    index = linearSearch(items, normalizedTarget, keyAccessor);
  }

  if (index >= 0) {
    return {
      found: true,
      index,
      item: items[index],
    };
  }

  return { found: false, index: -1, item: null };
}
