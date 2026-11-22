import { describe, expect, it } from 'vitest';
import type { SortableField, WarehouseItem } from '../../types';
import { createKeySortComparator, mergeSort } from '../sorting';
import {
  binarySearch,
  compareKeys,
  createKeyAccessor,
  isNumericField,
  isSortedByKey,
  linearSearch,
  normalizeSearchText,
  normalizeTargetForField,
  SEARCHING_ALGORITHM_LIST,
  SEARCHING_ALGORITHMS,
  searchItems,
} from '../searching';

function makeItem(
  overrides: Partial<WarehouseItem> & { id: string; kode: string },
): WarehouseItem {
  return {
    nama: `Produk ${overrides.kode}`,
    kategori: 'Periferal Komputer',
    stok: 15,
    harga: 100000,
    lokasi: 'Rak B-02',
    diperbaruiPada: '2026-11-22T00:00:00.000Z',
    ...overrides,
  };
}

const UNSORTED_ITEMS: WarehouseItem[] = [
  makeItem({
    id: 'u-1',
    kode: 'NET-020',
    nama: 'Switch 8 Port',
    kategori: 'Jaringan',
    stok: 40,
    harga: 350000,
  }),
  makeItem({
    id: 'u-2',
    kode: 'KBL-005',
    nama: 'Kabel LAN Cat6',
    kategori: 'Kabel & Konektor',
    stok: 10,
    harga: 45000,
  }),
  makeItem({
    id: 'u-3',
    kode: 'ADP-010',
    nama: 'Adaptor Laptop 90W',
    kategori: 'Adaptor & Daya',
    stok: 25,
    harga: 220000,
  }),
  makeItem({
    id: 'u-4',
    kode: 'KBL-005-B',
    nama: 'Kabel LAN Cat6',
    kategori: 'Kabel & Konektor',
    stok: 10,
    harga: 45000,
  }),
  makeItem({
    id: 'u-5',
    kode: 'SSD-099',
    nama: 'SSD SATA 512GB',
    kategori: 'Penyimpanan',
    stok: 5,
    harga: 680000,
  }),
];

describe('Modul Algoritma Searching', () => {
  it('menangani normalisasi teks, field numerik, dan perbandingan kunci', () => {
    expect(normalizeSearchText('  Kabel USB-C  ')).toBe('kabel usb-c');
    expect(isNumericField('stok')).toBe(true);
    expect(isNumericField('harga')).toBe(true);
    expect(isNumericField('kode')).toBe(false);
    expect(isNumericField('nama')).toBe(false);
    expect(isNumericField('kategori')).toBe(false);

    expect(normalizeTargetForField('stok', '  25  ')).toBe(25);
    expect(normalizeTargetForField('harga', 0)).toBe(0);
    expect(normalizeTargetForField('stok', '')).toBeNull();
    expect(normalizeTargetForField('stok', '   ')).toBeNull();
    expect(normalizeTargetForField('harga', 'bukan-angka')).toBeNull();
    expect(normalizeTargetForField('stok', Number.NaN)).toBeNull();
    expect(normalizeTargetForField('stok', Number.POSITIVE_INFINITY)).toBeNull();
    expect(normalizeTargetForField('kode', '  KBL-001 ')).toBe('kbl-001');
    expect(normalizeTargetForField('nama', '   ')).toBe('');

    expect(compareKeys(10, 20)).toBe(-1);
    expect(compareKeys(20, 10)).toBe(1);
    expect(compareKeys(20, 20)).toBe(0);
    expect(compareKeys('abc', 'abd')).toBe(-1);
    expect(compareKeys('abd', 'abc')).toBe(1);
    expect(compareKeys('abc', 'abc')).toBe(0);
  });

  it('menangani array kosong dan array 1 elemen pada Linear Search dan Binary Search', () => {
    const emptyResultLinear = searchItems([], 'linear', 'kode', 'KBL-001');
    const emptyResultBinary = searchItems([], 'binary', 'kode', 'KBL-001');
    expect(emptyResultLinear).toEqual({ found: false, index: -1, item: null });
    expect(emptyResultBinary).toEqual({ found: false, index: -1, item: null });

    const single = [makeItem({ id: 's-1', kode: '  KBL-001 ', stok: 12 })];
    expect(searchItems(single, 'linear', 'kode', 'kbl-001')).toEqual({
      found: true,
      index: 0,
      item: single[0],
    });
    expect(searchItems(single, 'binary', 'kode', ' KBL-001 ')).toEqual({
      found: true,
      index: 0,
      item: single[0],
    });
    expect(searchItems(single, 'binary', 'kode', 'TIDAK-ADA')).toEqual({
      found: false,
      index: -1,
      item: null,
    });
  });

  it('mengembalikan -1 pada linearSearch dan binarySearch apabila target NaN', () => {
    const items = [makeItem({ id: '1', kode: 'A-1', stok: 5 })];
    const stokAccessor = createKeyAccessor('stok');
    expect(linearSearch(items, Number.NaN, stokAccessor)).toBe(-1);
    expect(binarySearch(items, Number.NaN, stokAccessor)).toBe(-1);
  });

  it('menolak Binary Search apabila data belum terurut menaik menurut kunci', () => {
    const result = searchItems(UNSORTED_ITEMS, 'binary', 'kode', 'KBL-005');
    expect(result.found).toBe(false);
    expect(result.index).toBe(-1);
    expect(result.item).toBeNull();
    expect(result.preconditionError).toBe(
      'Binary Search mensyaratkan data terurut menaik berdasarkan atribut kunci yang sama.',
    );

    // Linear Search tetap bisa mencari pada data tidak terurut.
    const linearResult = searchItems(
      UNSORTED_ITEMS,
      'linear',
      'kode',
      '  kbl-005  ',
    );
    expect(linearResult).toEqual({
      found: true,
      index: 1,
      item: UNSORTED_ITEMS[1],
    });
  });

  it('mengembalikan indeks pertama (lower-bound) saat terdapat kunci duplikat', () => {
    const itemsWithDuplicates: WarehouseItem[] = [
      makeItem({ id: 'd-1', kode: 'A-01', kategori: 'Adaptor & Daya', stok: 5 }),
      makeItem({ id: 'd-2', kode: 'A-02', kategori: 'Jaringan', stok: 10 }),
      makeItem({ id: 'd-3', kode: 'A-03', kategori: 'Jaringan', stok: 10 }),
      makeItem({ id: 'd-4', kode: 'A-04', kategori: 'Jaringan', stok: 10 }),
      makeItem({ id: 'd-5', kode: 'A-05', kategori: 'Penyimpanan', stok: 20 }),
    ];

    const linearKat = searchItems(
      itemsWithDuplicates,
      'linear',
      'kategori',
      '  JARINGAN ',
    );
    const binaryKat = searchItems(
      itemsWithDuplicates,
      'binary',
      'kategori',
      'jaringan',
    );
    expect(linearKat.index).toBe(1);
    expect(binaryKat.index).toBe(1);
    expect(binaryKat.item?.id).toBe('d-2');

    const linearStok = searchItems(itemsWithDuplicates, 'linear', 'stok', '10');
    const binaryStok = searchItems(itemsWithDuplicates, 'binary', 'stok', 10);
    expect(linearStok.index).toBe(1);
    expect(binaryStok.index).toBe(1);
    expect(binaryStok.item?.id).toBe('d-2');
  });

  it('menemukan target di posisi awal, tengah, akhir, serta menangani target tidak ada untuk seluruh 5 field', () => {
    const fields: SortableField[] = [
      'kode',
      'nama',
      'kategori',
      'stok',
      'harga',
    ];

    const distinctItems: WarehouseItem[] = [
      makeItem({
        id: 'x-1',
        kode: 'A-100',
        nama: 'Adaptor Mini',
        kategori: 'Adaptor & Daya',
        stok: 5,
        harga: 50000,
      }),
      makeItem({
        id: 'x-2',
        kode: 'B-200',
        nama: 'Hub USB 4 Port',
        kategori: 'Aksesoris Laptop',
        stok: 15,
        harga: 150000,
      }),
      makeItem({
        id: 'x-3',
        kode: 'C-300',
        nama: 'Kabel DisplayPort',
        kategori: 'Kabel & Konektor',
        stok: 30,
        harga: 250000,
      }),
      makeItem({
        id: 'x-4',
        kode: 'D-400',
        nama: 'Mouse Wireless',
        kategori: 'Periferal Komputer',
        stok: 45,
        harga: 350000,
      }),
      makeItem({
        id: 'x-5',
        kode: 'E-500',
        nama: 'SSD NVMe 2TB',
        kategori: 'Penyimpanan',
        stok: 60,
        harga: 1500000,
      }),
    ];

    for (const field of fields) {
      const sorted = mergeSort(distinctItems, createKeySortComparator(field));
      expect(isSortedByKey(sorted, createKeyAccessor(field))).toBe(true);

      const startRaw =
        typeof sorted[0][field] === 'string'
          ? `  ${String(sorted[0][field]).toUpperCase()}  `
          : sorted[0][field];
      const middleRaw = sorted[2][field];
      const endRaw = sorted[sorted.length - 1][field];

      for (const algo of ['linear', 'binary'] as const) {
        const startRes = searchItems(sorted, algo, field, startRaw);
        expect(startRes).toEqual({ found: true, index: 0, item: sorted[0] });

        const midRes = searchItems(sorted, algo, field, middleRaw);
        expect(midRes).toEqual({ found: true, index: 2, item: sorted[2] });

        const endRes = searchItems(sorted, algo, field, endRaw);
        expect(endRes).toEqual({
          found: true,
          index: sorted.length - 1,
          item: sorted[sorted.length - 1],
        });

        const missingTarget =
          field === 'stok' || field === 'harga' ? 99999999 : 'TIDAK-DITEMUKAN';
        const notFoundRes = searchItems(sorted, algo, field, missingTarget);
        expect(notFoundRes).toEqual({ found: false, index: -1, item: null });
      }
    }
  });

  it('mengembalikan tidak ditemukan tanpa preconditionError saat input angka tidak valid', () => {
    expect(searchItems(UNSORTED_ITEMS, 'binary', 'stok', 'abc')).toEqual({
      found: false,
      index: -1,
      item: null,
    });
    expect(searchItems(UNSORTED_ITEMS, 'linear', 'harga', '')).toEqual({
      found: false,
      index: -1,
      item: null,
    });
  });

  it('menyediakan metadata algoritma pencarian lengkap dalam Bahasa Indonesia', () => {
    expect(SEARCHING_ALGORITHM_LIST).toHaveLength(2);
    expect(SEARCHING_ALGORITHMS.linear.averageComplexity).toBe('O(n)');
    expect(SEARCHING_ALGORITHMS.binary.averageComplexity).toBe('O(log n)');
    expect(SEARCHING_ALGORITHMS.binary.prerequisite).toContain('terurut');
  });
});
