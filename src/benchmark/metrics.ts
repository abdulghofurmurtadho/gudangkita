const idIntegerFormatter = new Intl.NumberFormat('id-ID', {
  maximumFractionDigits: 0,
});

function formatDecimalID(value: number, fractionDigits: number): string {
  return new Intl.NumberFormat('id-ID', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(value);
}

/**
 * Menghitung nilai tengah (median) dari kumpulan sampel numerik berhingga.
 * Mengembalikan null apabila daftar kosong atau tidak memuat angka valid.
 */
export function computeMedian(values: readonly number[]): number | null {
  const valid = values.filter((v) => Number.isFinite(v));
  if (valid.length === 0) {
    return null;
  }

  const sorted = [...valid].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) {
    return sorted[mid];
  }
  return (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * Menghitung nilai minimum dari kumpulan sampel numerik berhingga.
 */
export function computeMin(values: readonly number[]): number | null {
  let min: number | null = null;
  for (const v of values) {
    if (!Number.isFinite(v)) {
      continue;
    }
    if (min === null || v < min) {
      min = v;
    }
  }
  return min;
}

/**
 * Menghitung nilai maksimum dari kumpulan sampel numerik berhingga.
 */
export function computeMax(values: readonly number[]): number | null {
  let max: number | null = null;
  for (const v of values) {
    if (!Number.isFinite(v)) {
      continue;
    }
    if (max === null || v > max) {
      max = v;
    }
  }
  return max;
}

/**
 * Memformat durasi milidetik secara jujur mengikuti resolusi timer browser
 * dan konvensi pemisah desimal Bahasa Indonesia.
 */
export function formatDuration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined || !Number.isFinite(ms)) {
    return '-';
  }

  if (ms <= 0) {
    return '< 0,01 ms';
  }

  if (ms < 0.01) {
    const micro = formatDecimalID(ms * 1000, 1);
    return `< 0,01 ms (~${micro} µs)`;
  }

  if (ms < 1) {
    return `${formatDecimalID(ms, 3)} ms`;
  }

  if (ms < 1000) {
    return `${formatDecimalID(ms, 2)} ms`;
  }

  const msText = formatDecimalID(ms, 2);
  const secondsText = formatDecimalID(ms / 1000, 2);
  return `${msText} ms (${secondsText} dtk)`;
}

/**
 * Memformat nilai nominal menjadi mata uang Rupiah (contoh: "Rp 150.000").
 */
export function formatRupiah(amount: number): string {
  if (!Number.isFinite(amount)) {
    return 'Rp 0';
  }
  const rounded = Math.round(amount);
  if (rounded < 0) {
    return `-Rp ${formatNumberID(Math.abs(rounded))}`;
  }
  return `Rp ${formatNumberID(rounded)}`;
}

/**
 * Memformat angka menggunakan pemisah ribuan titik sesuai konvensi Indonesia (contoh: "10.000").
 */
export function formatNumberID(value: number): string {
  if (!Number.isFinite(value)) {
    return '0';
  }
  if (Number.isInteger(value)) {
    return idIntegerFormatter.format(value);
  }
  return new Intl.NumberFormat('id-ID').format(value);
}
