import { describe, expect, it } from 'vitest';
import type {
  SortableField,
  SortingAlgorithmId,
  SortOrder,
  WarehouseItem,
} from '../../types';
import {
  AlgorithmTimeoutError,
  bubbleSort,
  bubbleSortInPlace,
  createItemComparator,
  createKeySortComparator,
  insertionSort,
  insertionSortInPlace,
  mergeSort,
  mergeSortPrepared,
  nativeSort,
  nativeSortInPlace,
  quickSort,
  quickSortInPlace,
  runPreparedSort,
  selectionSort,
  selectionSortInPlace,
  SORTING_ALGORITHM_LIST,
  SORTING_ALGORITHMS,
  sortItems,
} from '../sorting';
import { createKeyAccessor, isSortedByKey } from '../searching';

function makeItem(
  overrides: Partial<WarehouseItem> & { id: string; kode: string },
): WarehouseItem {
  return {
    nama: `Barang ${overrides.kode}`,
    kategori: 'Kabel & Konektor',
    stok: 10,
    harga: 50000,
    lokasi: 'Rak A-01',
    diperbaruiPada: '2026-11-22T00:00:00.000Z',
    ...overrides,
  };
}

const ALL_ALGORITHMS: SortingAlgorithmId[] = [
  'bubble',
  'selection',
  'insertion',
  'merge',
  'quick',
  'native',
];

const ALL_FIELDS: SortableField[] = [
  'kode',
  'nama',
  'kategori',
  'stok',
  'harga',
];

const ALL_ORDERS: SortOrder[] = ['asc', 'desc'];

const SAMPLE_ITEMS: WarehouseItem[] = [
  makeItem({
    id: 'item-4',
    kode: '  KBL-002 ',
    nama: '  Kabel HDMI 2m ',
    kategori: 'Kabel & Konektor',
    stok: 25,
    harga: 75000,
  }),
  makeItem({
    id: 'item-2',
    kode: 'kbl-001',
    nama: 'Adaptor USB-C 65W',
    kategori: 'Adaptor & Daya',
    stok: 5,
    harga: 250000,
  }),
  makeItem({
    id: 'item-5',
    kode: 'NET-003',
    nama: 'Router WiFi 6',
    kategori: 'Jaringan',
    stok: 25,
    harga: 850000,
  }),
  makeItem({
    id: 'item-1',
    kode: 'SSD-001',
    nama: 'SSD NVMe 1TB',
    kategori: 'Penyimpanan',
    stok: 12,
    harga: 1200000,
  }),
  makeItem({
    id: 'item-3',
    kode: 'kbl-002',
    nama: 'Kabel DisplayPort',
    kategori: '  kabel & konektor ',
    stok: 100,
    harga: 75000,
  }),
];

describe('Modul Algoritma Sorting', () => {
  it('menangani array kosong dan array dengan 1 elemen di semua algoritma', () => {
    const single = [makeItem({ id: '1', kode: 'A-01', stok: 7 })];

    for (const algo of ALL_ALGORITHMS) {
      const emptyResult = sortItems([], algo, 'kode', 'asc');
      expect(emptyResult).toEqual([]);

      const singleSnapshot = single.map((item) => ({ ...item }));
      const singleResult = sortItems(single, algo, 'stok', 'desc');
      expect(singleResult).toEqual(single);
      expect(singleResult).not.toBe(single);
      expect(single).toEqual(singleSnapshot);
    }
  });

  it('tidak memutasi array masukan saat menggunakan fungsi non-mutating dan sortItems', () => {
    const comparator = createItemComparator('harga', 'asc');
    const original = SAMPLE_ITEMS.map((item) => ({ ...item }));

    const nonMutatingFns = [
      bubbleSort,
      selectionSort,
      insertionSort,
      mergeSort,
      quickSort,
      nativeSort,
    ];

    for (const sortFn of nonMutatingFns) {
      const result = sortFn(SAMPLE_ITEMS, comparator);
      expect(result).not.toBe(SAMPLE_ITEMS);
      expect(SAMPLE_ITEMS).toEqual(original);
    }

    for (const algo of ALL_ALGORITHMS) {
      const result = sortItems(SAMPLE_ITEMS, algo, 'nama', 'desc');
      expect(result).not.toBe(SAMPLE_ITEMS);
      expect(SAMPLE_ITEMS).toEqual(original);
    }
  });

  it('mengurutkan seluruh 5 field pada arah asc dan desc secara konsisten di semua algoritma', () => {
    for (const field of ALL_FIELDS) {
      for (const order of ALL_ORDERS) {
        const expected = [...SAMPLE_ITEMS].sort(
          createItemComparator(field, order),
        );

        for (const algo of ALL_ALGORITHMS) {
          const actual = sortItems(SAMPLE_ITEMS, algo, field, order);
          expect(actual.map((item) => item.id)).toEqual(
            expected.map((item) => item.id),
          );
        }
      }
    }
  });

  it('menerapkan tie-breaker deterministik kode naik lalu id naik meskipun arah desc', () => {
    const tiedItems: WarehouseItem[] = [
      makeItem({ id: 'id-9', kode: '  KBL-002 ', stok: 10, harga: 50000 }),
      makeItem({ id: 'id-2', kode: 'kbl-002', stok: 10, harga: 50000 }),
      makeItem({ id: 'id-5', kode: 'KBL-001', stok: 10, harga: 50000 }),
      makeItem({ id: 'id-1', kode: 'KBL-003', stok: 20, harga: 50000 }),
    ];

    const ascResult = sortItems(tiedItems, 'merge', 'stok', 'asc');
    expect(ascResult.map((x) => x.id)).toEqual(['id-5', 'id-2', 'id-9', 'id-1']);

    // Saat desc: stok=20 lebih dulu, lalu stok=10 tetap tie-break kode naik -> id naik.
    const descResult = sortItems(tiedItems, 'quick', 'stok', 'desc');
    expect(descResult.map((x) => x.id)).toEqual([
      'id-1',
      'id-5',
      'id-2',
      'id-9',
    ]);

    // Field kode sama (case-insensitive trimmed) -> langsung tie-break berdasarkan id naik.
    const sameCodeAsc = sortItems(
      tiedItems.slice(0, 2),
      'bubble',
      'kode',
      'asc',
    );
    const sameCodeDesc = sortItems(
      tiedItems.slice(0, 2),
      'insertion',
      'kode',
      'desc',
    );
    expect(sameCodeAsc.map((x) => x.id)).toEqual(['id-2', 'id-9']);
    expect(sameCodeDesc.map((x) => x.id)).toEqual(['id-2', 'id-9']);
  });

  it('menjaga stabilitas pada Bubble Sort, Insertion Sort, dan Merge Sort', () => {
    interface TaggedItem {
      key: number;
      seq: number;
    }

    const input: TaggedItem[] = [
      { key: 3, seq: 1 },
      { key: 1, seq: 1 },
      { key: 2, seq: 1 },
      { key: 3, seq: 2 },
      { key: 2, seq: 2 },
      { key: 1, seq: 2 },
      { key: 2, seq: 3 },
      { key: 3, seq: 3 },
    ];
    const cmp = (a: TaggedItem, b: TaggedItem): number => a.key - b.key;

    const stableAlgorithms = [bubbleSort, insertionSort, mergeSort];
    for (const sortFn of stableAlgorithms) {
      const sorted = sortFn(input, cmp);
      expect(sorted).toEqual([
        { key: 1, seq: 1 },
        { key: 1, seq: 2 },
        { key: 2, seq: 1 },
        { key: 2, seq: 2 },
        { key: 2, seq: 3 },
        { key: 3, seq: 1 },
        { key: 3, seq: 2 },
        { key: 3, seq: 3 },
      ]);
    }
  });

  it('menjalankan Quick Sort pada 2.000 dan 10.000 data terurut, terbalik, dan duplikat tanpa stack overflow', () => {
    const numericCmp = (a: number, b: number): number => a - b;

    for (const size of [2000, 10000]) {
      const sortedInput = Array.from({ length: size }, (_, i) => i);
      const reversedInput = Array.from({ length: size }, (_, i) => size - 1 - i);
      const allEqualInput = Array.from({ length: size }, () => 42);
      const manyDuplicatesInput = Array.from(
        { length: size },
        (_, i) => (i * 37) % 7,
      );

      const outSorted = quickSort(sortedInput, numericCmp);
      expect(outSorted).toEqual(sortedInput);

      const outReversed = quickSort(reversedInput, numericCmp);
      expect(outReversed).toEqual(sortedInput);

      const outDuplicates = quickSort(allEqualInput, numericCmp);
      expect(outDuplicates).toEqual(allEqualInput);

      const outManyDuplicates = quickSort(manyDuplicatesInput, numericCmp);
      expect(outManyDuplicates).toEqual([...manyDuplicatesInput].sort(numericCmp));
    }
  });

  it('menjalankan runPreparedSort dan mergeSortPrepared pada salinan in-place untuk seluruh algoritma', () => {
    const comparator = createItemComparator('kode', 'asc');
    const expectedIds = [...SAMPLE_ITEMS].sort(comparator).map((x) => x.id);

    for (const algo of ALL_ALGORITHMS) {
      const prepared = [...SAMPLE_ITEMS];
      const returned = runPreparedSort(prepared, algo, comparator);
      expect(returned).toBe(prepared);
      expect(returned.map((x) => x.id)).toEqual(expectedIds);
    }

    const preparedMerge = [...SAMPLE_ITEMS];
    const mergeReturned = mergeSortPrepared(preparedMerge, comparator);
    expect(mergeReturned).toBe(preparedMerge);
  });

  it('melempar AlgorithmTimeoutError saat deadline sudah terlewati', () => {
    const arr = [5, 4, 3, 2, 1];
    const cmp = (a: number, b: number): number => a - b;
    const expiredDeadline = performance.now() - 10;

    expect(() => bubbleSortInPlace([...arr], cmp, expiredDeadline)).toThrow(
      AlgorithmTimeoutError,
    );
    expect(() => selectionSortInPlace([...arr], cmp, expiredDeadline)).toThrow(
      AlgorithmTimeoutError,
    );
    expect(() => insertionSortInPlace([...arr], cmp, expiredDeadline)).toThrow(
      AlgorithmTimeoutError,
    );
    expect(() => mergeSortPrepared([...arr], cmp, expiredDeadline)).toThrow(
      AlgorithmTimeoutError,
    );
    expect(() => quickSortInPlace([...arr], cmp, expiredDeadline)).toThrow(
      AlgorithmTimeoutError,
    );
    expect(() =>
      runPreparedSort([...arr], 'native', cmp, expiredDeadline),
    ).toThrow(AlgorithmTimeoutError);

    const err = new AlgorithmTimeoutError('Timeout uji', 250);
    expect(err.timeoutMs).toBe(250);
    expect(err.name).toBe('AlgorithmTimeoutError');
  });

  it('menghasilkan urutan yang valid untuk isSortedByKey lewat createKeySortComparator', () => {
    for (const field of ALL_FIELDS) {
      const sorted = mergeSort(SAMPLE_ITEMS, createKeySortComparator(field));
      expect(isSortedByKey(sorted, createKeyAccessor(field))).toBe(true);
    }
  });

  it('menyediakan metadata algoritma pengurutan lengkap termasuk catatan native baseline', () => {
    expect(SORTING_ALGORITHM_LIST).toHaveLength(6);
    expect(SORTING_ALGORITHMS.native.isOptionalBaseline).toBe(true);
    expect(SORTING_ALGORITHMS.native.description).toContain(
      'Array.prototype.sort',
    );
    expect(SORTING_ALGORITHMS.bubble.stable).toBe(true);
    expect(SORTING_ALGORITHMS.selection.stable).toBe(false);
    expect(SORTING_ALGORITHMS.insertion.stable).toBe(true);
    expect(SORTING_ALGORITHMS.merge.stable).toBe(true);
    expect(SORTING_ALGORITHMS.quick.isQuadratic).toBe(false);
    expect(nativeSortInPlace([3, 1, 2], (a, b) => a - b)).toEqual([1, 2, 3]);
  });
});
