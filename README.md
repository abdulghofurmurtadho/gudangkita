# GudangKita — Manajemen Stok Gudang & Analisis Kompleksitas Algoritma

**GudangKita** adalah aplikasi web berbasis React + TypeScript yang menggabungkan sistem manajemen inventaris gudang (*Data Simulasi Akademik*) dengan laboratorium *benchmark* empiris di browser untuk membandingkan kinerja algoritma pengurutan (*sorting*) dan pencarian (*searching*).

Seluruh data operasional disimpan secara lokal di browser (`localStorage`), dan seluruh pengujian performa berjalan di *background thread* menggunakan Web Worker tanpa mengirim data ke server eksternal.

---

## Fitur Utama

### 1. Dashboard Operasional
- **4 Kartu Indikator Utama (KPI):** Total SKU Barang, Total Unit Stok, Barang Stok Rendah ($\le 10$ unit), dan Total Nilai Persediaan (Rp).
- **Grafik Distribusi Kategori:** Visualisasi jumlah unit fisik dan variasi SKU per kategori menggunakan Recharts.
- **Daftar Peringatan Stok:** Menampilkan barang dengan stok habis atau menipis beserta tautan cepat ke pengelolaan inventaris.
- **Ringkasan Benchmark Terakhir:** Menampilkan hasil pengukuran aktual terbaru dari sesi berjalan (tanpa angka fiktif).

### 2. Daftar Barang (CRUD, Filter, Sorting, & Searching Interaktif)
- **Operasi CRUD Lengkap:** Tambah, lihat detail, ubah, dan hapus barang dengan validasi input ketat (kode unik, panjang nama 2–100 karakter, stok/harga non-negatif) serta fitur **Reset Data Demo** (28 barang awal).
- **Filter & Paginasi:** Filter berdasarkan kategori dan status stok rendah, dilengkapi paginasi 10 / 25 / 50 baris per halaman.
- **Pengurutan Tabel Multi-Algoritma:** Pilih langsung algoritma *Bubble Sort*, *Selection Sort*, *Insertion Sort*, *Merge Sort*, *Quick Sort*, atau *Native JS Sort* dengan tampilan durasi eksekusi transparan (`performance.now()`).
- **Pencarian Target Langsung:** Bandingkan *Linear Search* dan *Binary Search* pada atribut kunci (`kode`, `nama`, `kategori`, `stok`, `harga`). Untuk *Binary Search*, tersedia opsi **auto-sort salinan** vs **uji langsung pada urutan tabel saat ini** agar efek prasyarat data terurut dapat diamati secara langsung.

### 3. Perbandingan Performa (Benchmark Empiris via Web Worker)
- **Tab Sorting:**
  - Skenario dataset snapshot ber-seed: **Kecil (500)**, **Menengah (3.000)**, **Besar (10.000)**, opsi cepat **20.000**, dan **Kustom (100–50.000)**.
  - Distribusi input: *Acak*, *Sudah Terurut*, dan *Urutan Terbalik*.
  - Peringatan eksplisit saat algoritma kuadratik $O(n^2)$ dipilih untuk ukuran dataset $\ge 10.000$.
  - Grafik batang Recharts dengan label numerik dan toggle **Skala Linear / Logaritmik** (hanya memvisualisasikan hasil valid).
- **Tab Searching:**
  - Pengujian multikasus target: *Target di Awal*, *Target di Tengah*, *Target di Akhir*, *Target Tidak Ditemukan*, dan *Target Kustom*.
  - Kontrol prasyarat *Binary Search* untuk mencatat biaya pengurutan persiapan (`setupMs`) secara terpisah dari waktu pencarian murni (`medianMs`).
  - Grafik perbandingan waktu pencarian serta perbandingan biaya setup vs pencarian murni.
- **Tab Riwayat Sesi:**
  - Mengumpulkan seluruh rekaman benchmark sesi berjalan, dilengkapi **Kurva Pertumbuhan** terhadap ukuran $N$ jika tersedia minimal 2 ukuran dataset berbeda.
- **Ekspor Data:** Ekspor hasil benchmark ke **CSV** (UTF-8 BOM) dan **JSON** lengkap dengan metadata lingkungan browser/perangkat.

### 4. Tentang & Metode
- Tabel kompleksitas teoretis (Terbaik, Rata-rata, Terburuk, Ruang, Stabilitas, dan Prasyarat) untuk seluruh algoritma.
- Dokumentasi metodologi pengukuran empiris, batas validitas interpretasi akademik, serta informasi perangkat dan browser saat ini.

---

## Arsitektur Direktori

```text
gudangkita/
├── index.html
├── package.json
├── tailwind.config.js
├── tsconfig.json
├── vite.config.ts
├── vitest.config.ts
└── src/
    ├── App.tsx                             # Root state (inventaris, riwayat benchmark, navigasi)
    ├── main.tsx                            # Entry point React StrictMode
    ├── index.css                           # Konfigurasi Tailwind CSS
    ├── types/
    │   ├── item.ts                         # Tipe WarehouseItem, ItemInput, kategori & ambang stok
    │   ├── benchmark.ts                    # Tipe konfigurasi, hasil, progres, dan worker message
    │   └── index.ts
    ├── algorithms/
    │   ├── sorting/                        # Bubble, Selection, Insertion, Merge, Quick, Native Sort + comparator
    │   ├── searching/                      # Linear Search, Binary Search (lower-bound) + normalizer
    │   └── __tests__/                      # Unit test algoritma sorting & searching
    ├── data/
    │   ├── initialItems.ts                 # 28 data simulasi gudang awal
    │   ├── generator.ts                    # Generator dataset snapshot deterministik ber-seed (PRNG)
    │   └── storage.ts                      # Persistensi localStorage, validasi input, & generator kode SKU
    ├── benchmark/
    │   ├── runner.ts                       # Orkestrator pengukuran (warm-up, pengulangan, timeout)
    │   ├── metrics.ts                      # Komputasi median/min/maks & pemformatan durasi/Rupiah
    │   ├── validators.ts                   # Verifikasi kebenaran hasil sorting & searching di luar timer
    │   ├── environment.ts                  # Deteksi informasi browser, OS, dan core CPU
    │   ├── exporter.ts                     # Ekspor CSV & JSON
    │   └── __tests__/                      # Unit test runner, metrik, validator, dan generator
    ├── workers/
    │   ├── benchmark.worker.ts             # Web Worker eksekusi benchmark terisolasi
    │   └── workerClient.ts                 # Klien pembungkus worker + dukungan pembatalan instan
    └── components/
        ├── common/                         # Badge status validasi/stok & komponen EmptyState
        ├── layout/                         # AppShell responsif (sidebar desktop & drawer mobile)
        ├── dashboard/                      # DashboardPage (KPI, grafik kategori, stok rendah)
        ├── inventory/                      # InventoryPage & modal (Form, Detail, Konfirmasi Hapus)
        ├── benchmark/                      # BenchmarkPage, Tab Sorting/Searching/Riwayat, & Grafik Recharts
        └── about/                          # AboutMethodPage (teori kompleksitas & metodologi)
```

---

## Prasyarat

- **Node.js** versi 18 atau lebih baru (disarankan LTS v20 / v22 / v24)
- **npm** (terpasang bersama Node.js)

---

## Cara Instalasi & Menjalankan

Masuk ke direktori proyek `gudangkita/`:

```bash
cd gudangkita
```

1. **Instal dependensi:**
   ```bash
   npm install
   ```

2. **Jalankan server pengembangan (Vite):**
   ```bash
   npm run dev
   ```

3. **Jalankan pemeriksaan tipe TypeScript (`strict`):**
   ```bash
   npm run typecheck
   ```

4. **Jalankan pengujian unit (Vitest):**
   ```bash
   npm test
   ```

5. **Bangun bundel produksi (`tsc --noEmit && vite build`):**
   ```bash
   npm run build
   ```

---

## Metodologi Benchmark & Batas Interpretasi

1. **Isolasi Data Benchmark:** Benchmark selalu dijalankan pada dataset snapshot ber-seed yang terpisah dari daftar barang CRUD, sehingga pengeditan stok pengguna tidak memengaruhi eksperimen.
2. **Pemisahan Warm-up & Pengulangan:** Iterasi pemanasan dijalankan sebelum pencatatan waktu dan dikecualikan dari statistik. Nilai utama yang dilaporkan adalah **median** dari 5–30 pengulangan, dilengkapi rentang **minimum–maksimum**.
3. **Timer Terfokus:** `performance.now()` hanya membungkus fungsi algoritma inti; pembangkitan dataset, penyalinan array, dan validasi kebenaran dieksekusi di luar jendela pengukuran.
4. **Pemisahan Biaya Setup Binary Search:** Bila pengurutan otomatis diaktifkan pada data acak, waktu pengurutan dicatat di kolom `setupMs` secara terpisah agar tidak mencampur biaya $O(n \log n)$ dengan pencarian murni $O(\log n)$.
5. **Batas Interpretasi Akademik:** Notasi Big-O menjelaskan laju pertumbuhan asimtotik seiring membesarnya $N$, bukan angka absolut milidetik. Pengukuran di browser dipengaruhi oleh spesifikasi CPU, optimasi JIT mesin JavaScript, *garbage collection*, serta pembulatan resolusi timer keamanan browser.
