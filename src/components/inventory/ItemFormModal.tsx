import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Sparkles, X } from 'lucide-react';
import { formatRupiah } from '../../benchmark/metrics';
import { generateNextKode, validateItemInput } from '../../data/storage';
import type { ItemInput, ItemValidationErrors, WarehouseItem } from '../../types';
import { ITEM_CATEGORIES } from '../../types';

interface ItemFormModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialItem?: WarehouseItem | null;
  existingItems: readonly WarehouseItem[];
  onClose: () => void;
  onSave: (input: ItemInput, editingId?: string) => void;
}

const CUSTOM_CATEGORY_OPTION = '__custom__';

function isStandardCategory(category: string): boolean {
  return (ITEM_CATEGORIES as readonly string[]).includes(category);
}

export function ItemFormModal({
  isOpen,
  mode,
  initialItem,
  existingItems,
  onClose,
  onSave,
}: ItemFormModalProps) {
  const [kode, setKode] = useState('');
  const [nama, setNama] = useState('');
  const [categorySelect, setCategorySelect] = useState<string>(ITEM_CATEGORIES[0]);
  const [customCategory, setCustomCategory] = useState('');
  const [stokInput, setStokInput] = useState('0');
  const [hargaInput, setHargaInput] = useState('0');
  const [lokasi, setLokasi] = useState('');
  const [errors, setErrors] = useState<ItemValidationErrors>({});

  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (mode === 'edit' && initialItem) {
      setKode(initialItem.kode);
      setNama(initialItem.nama);
      if (isStandardCategory(initialItem.kategori)) {
        setCategorySelect(initialItem.kategori);
        setCustomCategory('');
      } else {
        setCategorySelect(CUSTOM_CATEGORY_OPTION);
        setCustomCategory(initialItem.kategori);
      }
      setStokInput(String(initialItem.stok));
      setHargaInput(String(initialItem.harga));
      setLokasi(initialItem.lokasi);
    } else {
      setKode(generateNextKode(existingItems));
      setNama('');
      setCategorySelect(ITEM_CATEGORIES[0]);
      setCustomCategory('');
      setStokInput('10');
      setHargaInput('50000');
      setLokasi('Rak A-01');
    }
    setErrors({});

    const timerId = window.setTimeout(() => {
      firstInputRef.current?.focus();
    }, 10);

    return () => window.clearTimeout(timerId);
  }, [isOpen, mode, initialItem, existingItems]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const resolvedKategori =
    categorySelect === CUSTOM_CATEGORY_OPTION ? customCategory.trim() : categorySelect;

  const parsedHarga = Number(hargaInput);
  const previewHarga =
    hargaInput.trim() !== '' && Number.isFinite(parsedHarga) && parsedHarga >= 0
      ? formatRupiah(parsedHarga)
      : null;

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault();

    const parsedStok = stokInput.trim() === '' ? Number.NaN : Number(stokInput);
    const parsedPrice = hargaInput.trim() === '' ? Number.NaN : Number(hargaInput);

    const candidate: ItemInput = {
      kode: kode.trim(),
      nama: nama.trim(),
      kategori: resolvedKategori,
      stok: parsedStok,
      harga: parsedPrice,
      lokasi: lokasi.trim(),
    };

    const nextErrors = validateItemInput(
      candidate,
      existingItems,
      mode === 'edit' ? initialItem?.id : undefined,
    );

    if (stokInput.trim() === '' && !nextErrors.stok) {
      nextErrors.stok = 'Stok wajib diisi dengan angka bulat minimal 0.';
    }
    if (hargaInput.trim() === '' && !nextErrors.harga) {
      nextErrors.harga = 'Harga satuan wajib diisi dengan angka minimal 0.';
    }

    if (Object.keys(nextErrors).length > 0) {
      setErrors(nextErrors);
      return;
    }

    onSave(candidate, mode === 'edit' ? initialItem?.id : undefined);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-form-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <h2 id="item-form-modal-title" className="text-lg font-bold text-slate-900">
              {mode === 'create' ? 'Tambah Barang Baru' : 'Ubah Data Barang'}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Data disimpan langsung ke penyimpanan lokal browser (
              <code className="font-mono">localStorage</code>).
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup formulir barang"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-4" noValidate>
          {/* Kode Barang */}
          <div>
            <div className="flex items-center justify-between">
              <label htmlFor="item-kode" className="block text-sm font-medium text-slate-700">
                Kode SKU <span className="text-rose-600">*</span>
              </label>
              {mode === 'create' ? (
                <button
                  type="button"
                  onClick={() => setKode(generateNextKode(existingItems))}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
                >
                  <Sparkles className="h-3 w-3" aria-hidden="true" />
                  <span>Buat Otomatis</span>
                </button>
              ) : null}
            </div>
            <input
              ref={firstInputRef}
              id="item-kode"
              type="text"
              value={kode}
              onChange={(event) => {
                setKode(event.target.value);
                if (errors.kode) {
                  setErrors((prev) => ({ ...prev, kode: undefined }));
                }
              }}
              placeholder="Contoh: BRG-0029"
              aria-invalid={Boolean(errors.kode)}
              aria-describedby={errors.kode ? 'item-kode-error' : undefined}
              className={`mt-1.5 block w-full rounded-lg border px-3 py-2 font-mono text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                errors.kode ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300 bg-white'
              }`}
            />
            {errors.kode ? (
              <p id="item-kode-error" role="alert" className="mt-1 text-xs text-rose-600">
                {errors.kode}
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-400">3–32 karakter, harus unik antar barang.</p>
            )}
          </div>

          {/* Nama Barang */}
          <div>
            <label htmlFor="item-nama" className="block text-sm font-medium text-slate-700">
              Nama Barang <span className="text-rose-600">*</span>
            </label>
            <input
              id="item-nama"
              type="text"
              value={nama}
              onChange={(event) => {
                setNama(event.target.value);
                if (errors.nama) {
                  setErrors((prev) => ({ ...prev, nama: undefined }));
                }
              }}
              placeholder="Contoh: Kabel HDMI 2.1 Braided 2m"
              aria-invalid={Boolean(errors.nama)}
              aria-describedby={errors.nama ? 'item-nama-error' : undefined}
              className={`mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                errors.nama ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300 bg-white'
              }`}
            />
            {errors.nama ? (
              <p id="item-nama-error" role="alert" className="mt-1 text-xs text-rose-600">
                {errors.nama}
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-400">Minimal 2 karakter, maksimal 100 karakter.</p>
            )}
          </div>

          {/* Kategori */}
          <div>
            <label htmlFor="item-kategori" className="block text-sm font-medium text-slate-700">
              Kategori <span className="text-rose-600">*</span>
            </label>
            <select
              id="item-kategori"
              value={categorySelect}
              onChange={(event) => {
                setCategorySelect(event.target.value);
                if (errors.kategori) {
                  setErrors((prev) => ({ ...prev, kategori: undefined }));
                }
              }}
              aria-invalid={Boolean(errors.kategori)}
              aria-describedby={errors.kategori ? 'item-kategori-error' : undefined}
              className={`mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                errors.kategori ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300 bg-white'
              }`}
            >
              {ITEM_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
              <option value={CUSTOM_CATEGORY_OPTION}>+ Kategori Lainnya (Ketik Kustom)</option>
            </select>

            {categorySelect === CUSTOM_CATEGORY_OPTION ? (
              <div className="mt-2">
                <label htmlFor="item-kategori-kustom" className="sr-only">
                  Nama Kategori Kustom
                </label>
                <input
                  id="item-kategori-kustom"
                  type="text"
                  value={customCategory}
                  onChange={(event) => {
                    setCustomCategory(event.target.value);
                    if (errors.kategori) {
                      setErrors((prev) => ({ ...prev, kategori: undefined }));
                    }
                  }}
                  placeholder="Masukkan nama kategori baru"
                  className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                />
              </div>
            ) : null}

            {errors.kategori ? (
              <p id="item-kategori-error" role="alert" className="mt-1 text-xs text-rose-600">
                {errors.kategori}
              </p>
            ) : null}
          </div>

          {/* Stok & Harga */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="item-stok" className="block text-sm font-medium text-slate-700">
                Stok (Unit) <span className="text-rose-600">*</span>
              </label>
              <input
                id="item-stok"
                type="number"
                min={0}
                step={1}
                value={stokInput}
                onChange={(event) => {
                  setStokInput(event.target.value);
                  if (errors.stok) {
                    setErrors((prev) => ({ ...prev, stok: undefined }));
                  }
                }}
                aria-invalid={Boolean(errors.stok)}
                aria-describedby={errors.stok ? 'item-stok-error' : undefined}
                className={`mt-1.5 block w-full rounded-lg border px-3 py-2 font-mono text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                  errors.stok ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300 bg-white'
                }`}
              />
              {errors.stok ? (
                <p id="item-stok-error" role="alert" className="mt-1 text-xs text-rose-600">
                  {errors.stok}
                </p>
              ) : null}
            </div>

            <div>
              <label htmlFor="item-harga" className="block text-sm font-medium text-slate-700">
                Harga Satuan (Rp) <span className="text-rose-600">*</span>
              </label>
              <input
                id="item-harga"
                type="number"
                min={0}
                step={500}
                value={hargaInput}
                onChange={(event) => {
                  setHargaInput(event.target.value);
                  if (errors.harga) {
                    setErrors((prev) => ({ ...prev, harga: undefined }));
                  }
                }}
                aria-invalid={Boolean(errors.harga)}
                aria-describedby={errors.harga ? 'item-harga-error' : undefined}
                className={`mt-1.5 block w-full rounded-lg border px-3 py-2 font-mono text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                  errors.harga ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300 bg-white'
                }`}
              />
              {errors.harga ? (
                <p id="item-harga-error" role="alert" className="mt-1 text-xs text-rose-600">
                  {errors.harga}
                </p>
              ) : previewHarga ? (
                <p className="mt-1 font-mono text-xs text-slate-500">Pratinjau: {previewHarga}</p>
              ) : null}
            </div>
          </div>

          {/* Lokasi Rak */}
          <div>
            <label htmlFor="item-lokasi" className="block text-sm font-medium text-slate-700">
              Lokasi Rak Gudang
            </label>
            <input
              id="item-lokasi"
              type="text"
              value={lokasi}
              onChange={(event) => {
                setLokasi(event.target.value);
                if (errors.lokasi) {
                  setErrors((prev) => ({ ...prev, lokasi: undefined }));
                }
              }}
              placeholder="Contoh: Rak B-03"
              aria-invalid={Boolean(errors.lokasi)}
              aria-describedby={errors.lokasi ? 'item-lokasi-error' : undefined}
              className={`mt-1.5 block w-full rounded-lg border px-3 py-2 text-sm text-slate-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
                errors.lokasi ? 'border-rose-400 bg-rose-50/40' : 'border-slate-300 bg-white'
              }`}
            />
            {errors.lokasi ? (
              <p id="item-lokasi-error" role="alert" className="mt-1 text-xs text-rose-600">
                {errors.lokasi}
              </p>
            ) : (
              <p className="mt-1 text-xs text-slate-400">Maksimal 50 karakter (opsional).</p>
            )}
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            >
              {mode === 'create' ? 'Simpan Barang' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
