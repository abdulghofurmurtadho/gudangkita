import { useEffect, useRef } from 'react';
import { Calendar, MapPin, Package, Pencil, Tag, X } from 'lucide-react';
import { formatNumberID, formatRupiah } from '../../benchmark/metrics';
import type { WarehouseItem } from '../../types';
import { StockStatusBadge } from '../common/Badge';

interface ItemDetailModalProps {
  item: WarehouseItem | null;
  onClose: () => void;
  onEdit?: (item: WarehouseItem) => void;
}

function formatIndonesianDateTime(isoString: string): string {
  const parsed = new Date(isoString);
  if (Number.isNaN(parsed.getTime())) {
    return isoString;
  }
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'full',
    timeStyle: 'medium',
  }).format(parsed);
}

export function ItemDetailModal({ item, onClose, onEdit }: ItemDetailModalProps) {
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!item) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const timerId = window.setTimeout(() => {
      closeButtonRef.current?.focus();
    }, 10);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(timerId);
    };
  }, [item, onClose]);

  if (!item) {
    return null;
  }

  const totalNilai = item.stok * item.harga;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="item-detail-modal-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-slate-100 px-2 py-0.5 font-mono text-xs font-semibold text-slate-700">
                {item.kode}
              </span>
              <StockStatusBadge stok={item.stok} />
            </div>
            <h2
              id="item-detail-modal-title"
              className="mt-2 text-lg font-bold leading-snug text-slate-900"
            >
              {item.nama}
            </h2>
          </div>

          <button
            ref={closeButtonRef}
            type="button"
            onClick={onClose}
            aria-label="Tutup detail barang"
            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <dl className="mt-5 grid grid-cols-1 gap-3.5 sm:grid-cols-2">
          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Tag className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <span>Kategori</span>
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900">{item.kategori}</dd>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <MapPin className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <span>Lokasi Rak</span>
            </dt>
            <dd className="mt-1 text-sm font-semibold text-slate-900">{item.lokasi}</dd>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Package className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <span>Jumlah Stok</span>
            </dt>
            <dd className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums">
              {formatNumberID(item.stok)} unit
            </dd>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">
            <dt className="text-xs font-medium text-slate-500">Harga Satuan</dt>
            <dd className="mt-1 font-mono text-base font-bold text-slate-900 tabular-nums">
              {formatRupiah(item.harga)}
            </dd>
          </div>

          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 sm:col-span-2">
            <dt className="text-xs font-medium text-blue-700">Nilai Total Persediaan Item</dt>
            <dd className="mt-1 font-mono text-lg font-bold text-blue-900 tabular-nums">
              {formatRupiah(totalNilai)}
            </dd>
          </div>

          <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 sm:col-span-2">
            <dt className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Calendar className="h-3.5 w-3.5 text-slate-400" aria-hidden="true" />
              <span>Terakhir Diperbarui</span>
            </dt>
            <dd className="mt-1 text-sm font-medium text-slate-800">
              {formatIndonesianDateTime(item.diperbaruiPada)}
            </dd>
          </div>
        </dl>

        <div className="mt-6 flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
          {onEdit ? (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEdit(item);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              <Pencil className="h-4 w-4" aria-hidden="true" />
              <span>Ubah Barang</span>
            </button>
          ) : null}
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
}
