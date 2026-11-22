import { useEffect, useRef } from 'react';
import { AlertTriangle, Trash2, X } from 'lucide-react';
import { formatNumberID } from '../../benchmark/metrics';
import type { WarehouseItem } from '../../types';

interface DeleteConfirmModalProps {
  item: WarehouseItem | null;
  onCancel: () => void;
  onConfirm: (item: WarehouseItem) => void;
}

export function DeleteConfirmModal({ item, onCancel, onConfirm }: DeleteConfirmModalProps) {
  const cancelButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!item) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onCancel();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    const timerId = window.setTimeout(() => {
      cancelButtonRef.current?.focus();
    }, 10);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.clearTimeout(timerId);
    };
  }, [item, onCancel]);

  if (!item) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-[1px]"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-confirm-title"
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          onCancel();
        }
      }}
    >
      <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <AlertTriangle className="h-5 w-5" aria-hidden="true" />
            </div>
            <div>
              <h2 id="delete-confirm-title" className="text-base font-bold text-slate-900">
                Hapus Barang dari Daftar?
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Tindakan ini akan menghapus data barang berikut dari penyimpanan lokal browser.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            aria-label="Tutup dialog konfirmasi hapus"
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>

        <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-sm">
          <div className="flex items-center justify-between gap-2">
            <span className="font-mono text-xs font-semibold text-slate-700">{item.kode}</span>
            <span className="text-xs text-slate-500">{item.kategori}</span>
          </div>
          <p className="mt-1 font-semibold text-slate-900">{item.nama}</p>
          <p className="mt-1 text-xs text-slate-600">
            Stok saat ini: <strong className="font-mono">{formatNumberID(item.stok)} unit</strong> •
            Lokasi: {item.lokasi}
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-2.5">
          <button
            ref={cancelButtonRef}
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={() => onConfirm(item)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700"
          >
            <Trash2 className="h-4 w-4" aria-hidden="true" />
            <span>Ya, Hapus Barang</span>
          </button>
        </div>
      </div>
    </div>
  );
}
