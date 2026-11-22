import type { BenchmarkResultRecord, EnvironmentInfo } from '../types';

const CSV_HEADERS = [
  'id',
  'timestamp',
  'mode',
  'scenario',
  'datasetSize',
  'seed',
  'distribution',
  'algorithm',
  'algorithmName',
  'field',
  'order',
  'targetCase',
  'targetValue',
  'repeats',
  'warmups',
  'medianMs',
  'minMs',
  'maxMs',
  'setupMs',
  'unit',
  'medianDefinition',
  'correctness',
  'found',
  'matchedIndex',
  'matchedCode',
  'timeoutMs',
  'browser',
  'platform',
  'notes',
] as const;

const DURATION_UNIT_LABEL = 'ms (milidetik)';
const MEDIAN_DEFINITION_LABEL =
  'Nilai tengah dari seluruh pengulangan di luar warm-up';

function escapeCsvCell(value: string | number | boolean | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }
  const text = String(value);
  if (
    text.includes(',') ||
    text.includes('"') ||
    text.includes('\n') ||
    text.includes('\r')
  ) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

/**
 * Mengekspor hasil benchmark ke format CSV dengan UTF-8 BOM, header standar
 * PRD Bagian 17, serta kolom satuan dan definisi median di tiap baris.
 */
export function exportResultsToCSV(results: readonly BenchmarkResultRecord[]): string {
  const lines: string[] = [CSV_HEADERS.join(',')];

  for (const record of results) {
    const row = [
      record.id,
      record.timestamp,
      record.mode,
      record.scenario,
      record.datasetSize,
      record.seed,
      record.distribution,
      record.algorithm,
      record.algorithmName,
      record.field,
      record.order,
      record.targetCase,
      record.targetValue,
      record.repeats,
      record.warmups,
      record.medianMs,
      record.minMs,
      record.maxMs,
      record.setupMs,
      DURATION_UNIT_LABEL,
      MEDIAN_DEFINITION_LABEL,
      record.correctness,
      record.found === undefined ? '' : String(record.found),
      record.matchedIndex === undefined ? '' : String(record.matchedIndex),
      record.matchedCode ?? '',
      record.timeoutMs,
      record.browser,
      record.platform,
      record.notes,
    ].map(escapeCsvCell);

    lines.push(row.join(','));
  }

  return `\uFEFF${lines.join('\n')}`;
}

/**
 * Mengekspor hasil benchmark ke dokumen JSON terstruktur beserta metadata satuan,
 * metodologi pengukuran, dan informasi lingkungan eksekusi.
 */
export function exportResultsToJSON(
  results: readonly BenchmarkResultRecord[],
  envInfo?: EnvironmentInfo,
): string {
  const payload = {
    exportedAt: new Date().toISOString(),
    application: 'GudangKita',
    units: {
      duration: 'ms (milidetik)',
      setupMs: 'ms (persiapan prasyarat di luar waktu inti)',
    },
    methodologyNote:
      'Setiap pengukuran dilakukan di luar proses kloning dan persiapan prasyarat, didahului warm-up, lalu dirangkum menggunakan median, minimum, dan maksimum dari seluruh pengulangan.',
    environment: envInfo ?? null,
    results,
  };

  return JSON.stringify(payload, null, 2);
}

/**
 * Memicu pengunduhan file teks di browser secara aman.
 */
export function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string,
): void {
  if (typeof document === 'undefined' || typeof URL === 'undefined') {
    return;
  }

  const blob = new Blob([content], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = filename;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => {
    URL.revokeObjectURL(objectUrl);
  }, 1000);
}
