export const ITEM_CATEGORIES = [
  'Kabel & Konektor',
  'Periferal Komputer',
  'Penyimpanan',
  'Jaringan',
  'Adaptor & Daya',
  'Komponen PC',
  'Aksesoris Laptop',
] as const;

export type ItemCategory = (typeof ITEM_CATEGORIES)[number];

export interface WarehouseItem {
  id: string;
  kode: string;
  nama: string;
  kategori: string;
  stok: number;
  harga: number;
  lokasi: string;
  diperbaruiPada: string;
}

export type SortableField = 'kode' | 'nama' | 'kategori' | 'stok' | 'harga';

export type SortOrder = 'asc' | 'desc';

export type ItemInput = Omit<WarehouseItem, 'id' | 'diperbaruiPada'>;

export type ItemValidationErrors = Partial<Record<keyof ItemInput, string>>;

export const LOW_STOCK_THRESHOLD = 10;
