import type { LucideIcon } from 'lucide-react';
import { AlertTriangle, CheckCircle2, Clock, PackageX, XCircle } from 'lucide-react';
import type { CorrectnessStatus } from '../../types';
import { LOW_STOCK_THRESHOLD } from '../../types';

interface CorrectnessBadgeProps {
  status: CorrectnessStatus;
  className?: string;
}

const CORRECTNESS_CONFIG: Record<
  CorrectnessStatus,
  { label: string; classes: string; Icon: LucideIcon }
> = {
  valid: {
    label: 'Valid',
    classes: 'border-emerald-200 bg-emerald-50 text-emerald-700',
    Icon: CheckCircle2,
  },
  failed: {
    label: 'Gagal',
    classes: 'border-rose-200 bg-rose-50 text-rose-700',
    Icon: XCircle,
  },
  timeout: {
    label: 'Melebihi Batas Waktu',
    classes: 'border-amber-200 bg-amber-50 text-amber-800',
    Icon: Clock,
  },
  'precondition-error': {
    label: 'Prasyarat Tidak Terpenuhi',
    classes: 'border-orange-200 bg-orange-50 text-orange-800',
    Icon: AlertTriangle,
  },
};

export function CorrectnessBadge({ status, className = '' }: CorrectnessBadgeProps) {
  const { label, classes, Icon } = CORRECTNESS_CONFIG[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-medium ${classes} ${className}`.trim()}
    >
      <Icon className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}

interface StockStatusBadgeProps {
  stok: number;
  className?: string;
}

export function StockStatusBadge({ stok, className = '' }: StockStatusBadgeProps) {
  if (stok === 0) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-xs font-medium text-rose-700 ${className}`.trim()}
      >
        <PackageX className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Stok Habis</span>
      </span>
    );
  }

  if (stok <= LOW_STOCK_THRESHOLD) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800 ${className}`.trim()}
      >
        <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
        <span>Stok Rendah</span>
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ${className}`.trim()}
    >
      <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
      <span>Stok Aman</span>
    </span>
  );
}
