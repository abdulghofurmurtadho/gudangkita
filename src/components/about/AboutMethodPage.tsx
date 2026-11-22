import { useMemo } from 'react';
import {
  AlertCircle,
  BookOpen,
  Cpu,
  Database,
  Scale,
  ShieldCheck,
  Timer,
} from 'lucide-react';
import { SEARCHING_ALGORITHM_LIST } from '../../algorithms/searching';
import { SORTING_ALGORITHM_LIST } from '../../algorithms/sorting';
import { collectEnvironmentInfo } from '../../benchmark/environment';

export function AboutMethodPage() {
  const envInfo = useMemo(() => collectEnvironmentInfo(), []);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Tentang Aplikasi &amp; Metodologi Benchmark
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Referensi teoretis kompleksitas algoritma, desain eksperimen empiris di browser, dan
          batasan interpretasi akademik.
        </p>
      </div>

      {/* 1. Theoretical Complexity & Prerequisites */}
      <section className="space-y-5 rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <BookOpen className="h-5 w-5 text-blue-600" aria-hidden="true" />
          <h2 className="text-lg font-bold text-slate-900">
            Kompleksitas Teoretis &amp; Prasyarat Algoritma
          </h2>
        </div>

        {/* Sorting Algorithms Table */}
        <div className="space-y-2">
          <h3 className="text-sm font-semibold text-slate-800">Algoritma Pengurutan (Sorting)</h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Algoritma
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Terbaik
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Rata-rata
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Terburuk
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Ruang
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Stabilitas
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Prasyarat &amp; Ringkasan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {SORTING_ALGORITHM_LIST.map((algo) => (
                  <tr key={algo.id} className="hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">
                      {algo.name}
                      {algo.isOptionalBaseline ? (
                        <span className="ml-2 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-700">
                          Baseline
                        </span>
                      ) : null}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-700">
                      {algo.bestComplexity}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-blue-700">
                      {algo.averageComplexity}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-700">
                      {algo.worstComplexity}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-700">
                      {algo.spaceComplexity}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-700">
                      {algo.stable ? 'Stabil' : 'Tidak Stabil'}
                    </td>
                    <td className="min-w-[16rem] px-4 py-3 text-xs leading-relaxed text-slate-600">
                      <p>{algo.description}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        <strong>Prasyarat:</strong> {algo.prerequisite}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Searching Algorithms Table */}
        <div className="space-y-2 pt-2">
          <h3 className="text-sm font-semibold text-slate-800">Algoritma Pencarian (Searching)</h3>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
              <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-600">
                <tr>
                  <th scope="col" className="px-4 py-3">
                    Algoritma
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Terbaik
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Rata-rata
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Terburuk
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Ruang
                  </th>
                  <th scope="col" className="px-4 py-3">
                    Prasyarat &amp; Ringkasan
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {SEARCHING_ALGORITHM_LIST.map((algo) => (
                  <tr key={algo.id} className="hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-900">
                      {algo.name}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-700">
                      {algo.bestComplexity}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs font-semibold text-blue-700">
                      {algo.averageComplexity}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-700">
                      {algo.worstComplexity}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-slate-700">
                      {algo.spaceComplexity}
                    </td>
                    <td className="min-w-[16rem] px-4 py-3 text-xs leading-relaxed text-slate-600">
                      <p>{algo.description}</p>
                      <p className="mt-1 text-[11px] font-medium text-amber-800">
                        <strong>Prasyarat:</strong> {algo.prerequisite}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 2. Benchmark Methodology */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Timer className="h-5 w-5 text-blue-600" aria-hidden="true" />
          <h2 className="text-lg font-bold text-slate-900">Metodologi Benchmark Empiris</h2>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-slate-900">
              <Database className="h-4 w-4 text-blue-600" aria-hidden="true" />
              <span>1. Dataset Snapshot Ber-Seed</span>
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              Setiap pengujian membangkitkan dataset sintetis deterministik menggunakan PRNG
              berbasis seed yang terisolasi dari daftar barang CRUD pengguna. Setiap algoritma
              menerima salinan data yang identik (<em>deep/fresh copy</em>) sebelum dieksekusi.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <h3 className="text-sm font-semibold text-slate-900">
              2. Warm-up Tidak Dihitung
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              Iterasi pemanasan (<em>warm-up</em>) dijalankan sebelum pencatatan waktu dimulai agar
              mesin JavaScript (JIT compiler) mengoptimalkan jalur kode secara lebih setara. Durasi
              warm-up tidak dimasukkan ke statistik akhir.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <h3 className="text-sm font-semibold text-slate-900">
              3. Pengulangan &amp; Statistik Median
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              Pengujian diulang sebanyak 5–30 kali. Aplikasi melaporkan <strong>median</strong>{' '}
              sebagai metrik utama karena lebih tahan terhadap lonjakan sesaat (<em>outlier</em>{' '}
              garbage collection atau penjadwalan OS), disertai rentang <strong>min–maks</strong>.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <h3 className="text-sm font-semibold text-slate-900">
              4. Isolasi Timer Inti (<code className="font-mono">performance.now()</code>)
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              Pemanggilan <code className="font-mono">performance.now()</code> hanya membungkus
              pemanggilan fungsi algoritma inti. Tahap generasi data, penyalinan array, dan
              verifikasi hasil berjalan di luar jendela pencatatan waktu.
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <h3 className="text-sm font-semibold text-slate-900">
              5. Pemisahan Biaya Setup Binary Search
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              Bila opsi auto-sort diaktifkan, durasi pengurutan awal dicatat pada metrik terpisah{' '}
              <code className="font-mono">setupMs</code>. Hal ini mencegah pencampuran antara biaya
              persiapan O(n log n) dan pencarian murni O(log n).
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
            <h3 className="text-sm font-semibold text-slate-900">
              6. Web Worker &amp; Validasi Kebenaran
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-slate-600">
              Seluruh benchmark dieksekusi di <em>background thread</em> (Web Worker) dengan batas
              waktu (timeout) dan tombol batal agar UI tetap responsif. Setiap keluaran diverifikasi
              kebenaran urutan atau kecocokannya di luar timer.
            </p>
          </div>
        </div>
      </section>

      {/* 3. Academic Interpretation Guide & Validity Limits */}
      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
          <Scale className="h-5 w-5 text-blue-600" aria-hidden="true" />
          <h2 className="text-lg font-bold text-slate-900">
            Panduan Interpretasi Akademik &amp; Batas Validitas
          </h2>
        </div>

        <ul className="mt-4 space-y-3 text-sm leading-relaxed text-slate-700">
          <li className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
            <span>
              <strong>Big-O adalah laju pertumbuhan asimtotik, bukan angka absolut ms:</strong> Dua
              perangkat berbeda dapat menghasilkan waktu milidetik berbeda, namun pola pertumbuhan
              kurva ketika N dinaikkan dari 500 ke 3.000 lalu 10.000 akan mencerminkan kelas
              kompleksitas O(n²) vs O(n log n) vs O(n) vs O(log n).
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
            <span>
              <strong>Pengaruh CPU, browser, JIT, dan resolusi timer:</strong> Browser modern
              membatasi presisi <code className="font-mono">performance.now()</code> (misalnya
              kelipatan beberapa mikrodetik hingga 0,1 ms) untuk mitigasi serangan <em>timing</em>.
              Oleh karena itu, eksekusi yang sangat cepat seperti Binary Search dapat terbaca sangat
              kecil atau mendekati 0 ms pada N kecil.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
            <span>
              <strong>Faktor konstanta pada N kecil:</strong> Pada ukuran input kecil (misal N =
              500 atau data hampir terurut), algoritma sederhana seperti Insertion Sort dapat
              menyamai atau bahkan lebih cepat dibanding Merge Sort karena biaya alokasi memori dan
              rekursi lebih kecil.
            </span>
          </li>
          <li className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" aria-hidden="true" />
            <span>
              <strong>Amortisasi pengurutan pada Binary Search:</strong> Untuk satu kali pencarian
              pada data acak, biaya pengurutan awal O(n log n) jauh lebih besar daripada sekali
              Linear Search O(n). Keunggulan Binary Search tercapai ketika data yang sama dicari
              berulang kali setelah sekali diurutkan.
            </span>
          </li>
        </ul>
      </section>

      {/* 4. Device Info & 100% Local Privacy */}
      <div className="grid gap-6 lg:grid-cols-12">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm lg:col-span-7">
          <div className="flex items-center gap-2 border-b border-slate-100 pb-3">
            <Cpu className="h-5 w-5 text-blue-600" aria-hidden="true" />
            <h2 className="text-base font-bold text-slate-900">
              Informasi Perangkat &amp; Browser Saat Ini
            </h2>
          </div>

          <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="font-medium text-slate-500">Browser Terdeteksi</dt>
              <dd className="mt-1 font-semibold text-slate-900">{envInfo.browser}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="font-medium text-slate-500">Sistem Operasi / Platform</dt>
              <dd className="mt-1 font-semibold text-slate-900">{envInfo.platform}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="font-medium text-slate-500">Core CPU Logis</dt>
              <dd className="mt-1 font-mono font-semibold text-slate-900">
                {envInfo.hardwareConcurrency !== null
                  ? `${envInfo.hardwareConcurrency} thread`
                  : 'Tidak tersedia'}
              </dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3">
              <dt className="font-medium text-slate-500">Bahasa Browser</dt>
              <dd className="mt-1 font-mono font-semibold text-slate-900">{envInfo.language}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 sm:col-span-2">
              <dt className="font-medium text-slate-500">Catatan Timer Resolusi Tinggi</dt>
              <dd className="mt-1 leading-relaxed text-slate-700">{envInfo.timerNote}</dd>
            </div>
            <div className="rounded-lg bg-slate-50 p-3 sm:col-span-2">
              <dt className="font-medium text-slate-500">User-Agent</dt>
              <dd className="mt-1 break-all font-mono text-[11px] text-slate-600">
                {envInfo.userAgent}
              </dd>
            </div>
          </dl>
        </section>

        <section className="flex flex-col justify-between rounded-xl border border-emerald-200 bg-emerald-50/70 p-5 lg:col-span-5">
          <div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-700" aria-hidden="true" />
              <h2 className="text-base font-bold text-emerald-950">
                Jaminan Privasi &amp; Operasi 100% Lokal
              </h2>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-emerald-900">
              GudangKita berjalan sepenuhnya di sisi klien (browser Anda) tanpa layanan backend,
              tanpa pelacakan eksternal, dan tanpa pengiriman data ke jaringan mana pun.
            </p>
            <ul className="mt-3 space-y-2 text-xs leading-relaxed text-emerald-900/90">
              <li>
                • Daftar barang disimpan lokal menggunakan{' '}
                <code className="font-mono font-semibold">localStorage</code> browser Anda.
              </li>
              <li>
                • Data awal merupakan data simulasi akademik yang dapat di-reset kapan saja.
              </li>
              <li>
                • Ekspor CSV dan JSON dibuat langsung di memori browser dan diunduh ke perangkat
                Anda secara lokal.
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
