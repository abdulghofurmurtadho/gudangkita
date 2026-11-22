import { createItemComparator } from '../algorithms/sorting';
import {
  ITEM_CATEGORIES,
  type DatasetScenario,
  type InputDistribution,
  type ItemCategory,
  type SortOrder,
  type SortableField,
  type WarehouseItem,
} from '../types';

export interface DatasetPreset {
  label: string;
  defaultSize: number;
  minSize: number;
  maxSize: number;
  quickOptions?: readonly number[];
  description: string;
}

export const DATASET_PRESETS: Record<
  Exclude<DatasetScenario, 'kustom'>,
  DatasetPreset
> = {
  kecil: {
    label: 'Kecil',
    defaultSize: 500,
    minSize: 100,
    maxSize: 999,
    description: 'Dataset kecil (< 1.000 data; rentang 100–999)',
  },
  menengah: {
    label: 'Menengah',
    defaultSize: 3000,
    minSize: 1000,
    maxSize: 5000,
    description: 'Dataset menengah (1.000–5.000 data)',
  },
  besar: {
    label: 'Besar',
    defaultSize: 10000,
    minSize: 10000,
    maxSize: 50000,
    quickOptions: [10000, 20000],
    description: 'Dataset besar (10.000–50.000 data; bawaan 10.000)',
  },
};

export const CUSTOM_DATASET_LIMITS = {
  min: 100,
  max: 50000,
} as const;

interface CategoryCatalogEntry {
  rackLetter: string;
  baseProducts: readonly string[];
  variants: readonly string[];
  priceLadder: readonly number[];
}

const CATEGORY_CATALOG: Record<ItemCategory, CategoryCatalogEntry> = {
  'Kabel & Konektor': {
    rackLetter: 'A',
    baseProducts: [
      'Kabel HDMI 2.1 Ultra High Speed',
      'Kabel DisplayPort 1.4 Braided',
      'Kabel USB-C to USB-C PD 100W',
      'Kabel LAN UTP Cat6A Patch Cord',
      'Kabel Extension USB 3.0 Aktif',
      'Kabel Power PC C13 Tembaga Murni',
      'Konektor Modular RJ45 Cat6 (Pack)',
      'Kabel Audio AUX 3.5mm TRS Gold-Plated',
      'Adapter USB-C to HDMI 4K 60Hz',
      'Kabel SATA III 6Gbps Pengunci Klip',
      'Splitter HDMI 1-in-2 Out 4K',
    ],
    variants: ['1m - Hitam', '2m - Hitam', '2m - Abu', '3m - Braided'],
    priceLadder: [25000, 35000, 45000, 65000, 85000, 110000, 135000, 175000],
  },
  'Periferal Komputer': {
    rackLetter: 'B',
    baseProducts: [
      'Mouse Wireless Silent 2.4GHz',
      'Mouse Gaming Optik 12000 DPI',
      'Keyboard Mekanikal TKL Hot-Swap',
      'Keyboard Wireless Office Ergonomis',
      'Webcam Full HD 1080p Autofokus',
      'Headset USB Noise Cancelling Mic',
      'Mousepad Gaming Deskmat Jahit Tepi',
      'Speaker Desktop Stereo USB 10W',
      'Presenter Wireless Laser Merah',
      'Drawing Tablet Grafis 10x6 Inci',
      'Card Reader All-in-One USB 3.0',
    ],
    variants: ['Hitam', 'Putih', 'Abu-abu', 'Edisi Pro'],
    priceLadder: [75000, 125000, 145000, 225000, 350000, 485000, 650000, 890000],
  },
  Penyimpanan: {
    rackLetter: 'C',
    baseProducts: [
      'SSD NVMe PCIe Gen4 M.2 2280',
      'SSD SATA III 2.5 Inci',
      'Harddisk Eksternal USB 3.2',
      'Harddisk Internal Desktop 7200RPM',
      'Flashdisk USB 3.2 Gen1 Metal',
      'Kartu Memori microSDXC UHS-I U3',
      'Enclosure SSD M.2 NVMe Aluminium',
      'Docking Station Dual Bay SATA',
      'SSD Portable USB-C Tahan Guncangan',
      'NAS Drive 3.5 Inci SATA',
      'Kartu Memori SDXC Pro V30',
    ],
    variants: ['128GB', '256GB', '512GB', '1TB', '2TB'],
    priceLadder: [95000, 185000, 320000, 580000, 890000, 1120000, 1250000, 1850000],
  },
  Jaringan: {
    rackLetter: 'D',
    baseProducts: [
      'Router Wi-Fi 6 Dual-Band AX1800',
      'Switch Gigabit Unmanaged 8-Port',
      'Switch Gigabit Managed 16-Port',
      'Access Point Ceiling Mount PoE',
      'USB Wi-Fi Adapter Dual-Band AC1300',
      'Kartu Jaringan PCIe Gigabit LAN',
      'Range Extender Wi-Fi Mesh AC1200',
      'PoE Injector Gigabit 802.3at',
      'Media Converter Fiber Optik SFP',
      'Modem Router LTE 4G Dual Antena',
      'Tang Crimping RJ45 & LAN Tester',
    ],
    variants: ['Standar', 'Metal Case', 'Dual Antena', 'V2'],
    priceLadder: [110000, 195000, 290000, 350000, 540000, 785000, 1150000, 1650000],
  },
  'Adaptor & Daya': {
    rackLetter: 'E',
    baseProducts: [
      'Adaptor Charger GaN USB-C PD 3.0',
      'UPS Line-Interactive AVR',
      'Power Strip Stop Kontak Surge Protector',
      'Power Supply PC 80+ Bronze',
      'Power Supply PC 80+ Gold Full Modular',
      'Adaptor Laptop Universal Multi-Tip',
      'Powerbank Fast Charging 20000mAh',
      'Stabilizer Tegangan Digital Servo',
      'Baterai Pengganti UPS 12V 7Ah',
      'Kabel Power Splitter PDU Rak Server',
      'Charger Desktop Multi-Port 4 USB',
    ],
    variants: ['45W', '65W', '100W', '650W / 1200VA'],
    priceLadder: [120000, 165000, 275000, 450000, 650000, 890000, 1480000, 2150000],
  },
  'Komponen PC': {
    rackLetter: 'F',
    baseProducts: [
      'RAM Desktop DDR4 3200MHz CL16',
      'RAM Desktop DDR5 6000MHz XMP',
      'RAM Laptop SODIMM DDR4 3200MHz',
      'Prosesor Desktop Multi-Core',
      'Motherboard Micro-ATX Chipset Pro',
      'Pendingin CPU Tower 4 Heatpipe PWM',
      'Pasta Termal Konduktivitas Tinggi',
      'Kipas Casing PWM 120mm Silent',
      'Casing PC Airflow Mesh Tempered Glass',
      'Kartu Grafis Workstation Entry',
      'Liquid Cooler AIO 240mm ARGB',
    ],
    variants: ['8GB / Standar', '16GB / Hitam', '32GB / Putih', 'Edisi OC'],
    priceLadder: [85000, 195000, 315000, 650000, 1150000, 1950000, 2750000, 3450000],
  },
  'Aksesoris Laptop': {
    rackLetter: 'G',
    baseProducts: [
      'Cooling Pad Laptop Kipas Adjustable',
      'USB-C Hub 7-in-1 HDMI 4K Ethernet',
      'Stand Laptop Aluminium Lipat',
      'Tas Sleeve Laptop Anti Air',
      'Tas Ransel Laptop Kompartemen Padded',
      'Pelindung Layar Privacy Filter Matte',
      'Docking Station USB-C Dual Monitor',
      'Kunci Pengaman Laptop Kensington',
      'Kit Pembersih Layar & Keyboard',
      'Penyangga Pergelangan Tangan Memory Foam',
      'Penutup Kamera Webcam Slide Ultra-Tipis',
    ],
    variants: ['13-14 Inci', '15-16 Inci', 'Silver', 'Hitam Matte'],
    priceLadder: [35000, 75000, 135000, 175000, 225000, 350000, 420000, 680000],
  },
};

const STOCK_TIERS = [
  0, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 15, 18, 20, 24, 25, 28, 30, 32, 35, 40,
  45, 50, 60, 75, 90, 120, 150,
] as const;

const BASE_TIMESTAMP_UTC = Date.UTC(2026, 0, 1, 0, 0, 0);

function hashSeedFNV1a(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * PRNG deterministik berbasis hash string FNV-1a dan generator Mulberry32.
 * Menghasilkan bilangan pseudo-acak seragam pada rentang [0, 1).
 */
export function createSeededRng(seed: string): () => number {
  const normalized = seed.trim() || 'gudangkita-default-seed';
  let state = hashSeedFNV1a(normalized);
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Mengklasifikasikan ukuran dataset ke skenario benchmark sesuai PRD Bagian 9.
 */
export function classifyScenario(size: number): DatasetScenario {
  if (!Number.isFinite(size) || size <= 0) {
    return 'kustom';
  }
  if (size < 1000) {
    return 'kecil';
  }
  if (size <= 5000) {
    return 'menengah';
  }
  if (size >= 10000) {
    return 'besar';
  }
  return 'kustom';
}

/**
 * Membuat string seed baru yang mudah dibaca, misalnya "GK-2026-4F9A".
 */
export function generateSeedString(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let suffix = '';
  for (let i = 0; i < 4; i++) {
    suffix += chars[Math.floor(Math.random() * chars.length)];
  }
  return `GK-2026-${suffix}`;
}

function padTwo(value: number): string {
  return value < 10 ? `0${value}` : String(value);
}

/**
 * Membangkitkan dataset barang gudang sintetis yang 100% deterministik untuk
 * pasangan (size, seed) yang sama, termasuk pengacakan Fisher-Yates di akhir
 * agar distribusi awal benar-benar acak di seluruh kolom termasuk kode barang.
 */
export function generateDataset(size: number, seed: string): WarehouseItem[] {
  const count = Number.isFinite(size) ? Math.max(0, Math.floor(size)) : 0;
  if (count === 0) {
    return [];
  }

  const rng = createSeededRng(seed);
  const categoryCount = ITEM_CATEGORIES.length;
  const items: WarehouseItem[] = new Array<WarehouseItem>(count);

  for (let i = 0; i < count; i++) {
    const seq = String(i + 1).padStart(6, '0');
    const kategori = ITEM_CATEGORIES[Math.floor(rng() * categoryCount)];
    const catalog = CATEGORY_CATALOG[kategori];

    const baseIdx = Math.floor(rng() * catalog.baseProducts.length);
    // Condongkan ke 2 varian pertama (~65%) agar duplikat nama terjadi bahkan pada dataset kecil.
    const variantIdx =
      rng() < 0.65 && catalog.variants.length >= 2
        ? Math.floor(rng() * 2)
        : Math.floor(rng() * catalog.variants.length);

    const nama = `${catalog.baseProducts[baseIdx]} - ${catalog.variants[variantIdx]}`;

    // Stok rendah muncul ~15%, selebihnya dari pool stok realistis untuk menjamin duplikat.
    const stok =
      rng() < 0.15
        ? Math.floor(rng() * 11)
        : STOCK_TIERS[Math.floor(rng() * STOCK_TIERS.length)];

    const harga = catalog.priceLadder[Math.floor(rng() * catalog.priceLadder.length)];

    const aisle = padTwo(1 + Math.floor(rng() * 8));
    const slot = padTwo(1 + Math.floor(rng() * 12));
    const lokasi = `ELEK-${catalog.rackLetter}-${aisle}-${slot}`;

    // Stempel waktu deterministik berbasis seed dalam rentang ~320 hari sejak 2026-01-01.
    const offsetMinutes = Math.floor(rng() * 460800);
    const diperbaruiPada = new Date(
      BASE_TIMESTAMP_UTC + offsetMinutes * 60000,
    ).toISOString();

    items[i] = {
      id: `item-${seq}`,
      kode: `BRG-${seq}`,
      nama,
      kategori,
      stok,
      harga,
      lokasi,
      diperbaruiPada,
    };
  }

  // Fisher-Yates shuffle deterministik agar kode & seluruh kolom acak pada distribusi 'random'.
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const temp = items[i];
    items[i] = items[j];
    items[j] = temp;
  }

  return items;
}

/**
 * Menyiapkan distribusi awal dataset sesuai konfigurasi benchmark sorting.
 */
export function prepareDistribution(
  dataset: readonly WarehouseItem[],
  distribution: InputDistribution,
  field: SortableField,
  order: SortOrder,
): WarehouseItem[] {
  const copy = [...dataset];
  if (distribution === 'random') {
    return copy;
  }
  if (distribution === 'sorted') {
    return copy.sort(createItemComparator(field, order));
  }
  const oppositeOrder: SortOrder = order === 'asc' ? 'desc' : 'asc';
  return copy.sort(createItemComparator(field, oppositeOrder));
}
