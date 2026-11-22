import {
  SEARCHING_ALGORITHMS,
  binarySearch,
  createKeyAccessor,
  isSortedByKey,
  linearSearch,
  normalizeTargetForField,
} from '../algorithms/searching';
import {
  AlgorithmTimeoutError,
  SORTING_ALGORITHMS,
  createItemComparator,
  createKeySortComparator,
  mergeSortPrepared,
  runPreparedSort,
} from '../algorithms/sorting';
import {
  classifyScenario,
  generateDataset,
  prepareDistribution,
} from '../data/generator';
import type {
  BenchmarkProgress,
  BenchmarkResultRecord,
  EnvironmentInfo,
  SearchBenchmarkConfig,
  SortBenchmarkConfig,
  SortableField,
  TargetCase,
  WarehouseItem,
} from '../types';
import { computeMax, computeMedian, computeMin } from './metrics';
import { validateSearchResult, validateSortResult } from './validators';

export type ProgressCallback = (progress: BenchmarkProgress) => void;

let recordSequence = 0;

function createRecordId(prefix: 'sort' | 'search'): string {
  recordSequence += 1;
  return `${prefix}-${Date.now()}-${recordSequence}`;
}

interface ResolvedSearchTarget {
  targetCase: TargetCase;
  targetDisplay: string;
  normalizedTarget: string | number | null;
  snapshotReferenceIndex: number | null;
  invalidReason?: string;
}

function buildNotFoundRawTarget(
  field: SortableField,
  snapshot: readonly WarehouseItem[],
  keyAccessor: (item: WarehouseItem) => string | number,
): string | number {
  if (field === 'stok' || field === 'harga') {
    let candidate = -999;
    const existingNums = new Set<number>();
    for (let i = 0; i < snapshot.length; i++) {
      const val = keyAccessor(snapshot[i]);
      if (typeof val === 'number') {
        existingNums.add(val);
      }
    }
    while (existingNums.has(candidate)) {
      candidate -= 1;
    }
    return candidate;
  }

  const existingStrings = new Set<string>();
  for (let i = 0; i < snapshot.length; i++) {
    const val = normalizeTargetForField(field, keyAccessor(snapshot[i]));
    if (val !== null) {
      existingStrings.add(String(val).toLowerCase());
    }
  }

  if (field === 'kode') {
    let suffix = 999999;
    let candidate = `BRG-${suffix}`;
    while (existingStrings.has(candidate.toLowerCase())) {
      suffix += 1;
      candidate = `BRG-${suffix}`;
    }
    return candidate;
  }

  let candidate = '__TIDAK_ADA_DI_GUDANG__';
  let attempt = 1;
  while (existingStrings.has(candidate.toLowerCase())) {
    attempt += 1;
    candidate = `__TIDAK_ADA_DI_GUDANG_${attempt}__`;
  }
  return candidate;
}

function resolveSearchTargets(
  config: SearchBenchmarkConfig,
  snapshot: readonly WarehouseItem[],
): ResolvedSearchTarget[] {
  const keyAccessor = createKeyAccessor(config.field);

  // Catat indeks kemunculan pertama di snapshot acak untuk tiap kunci unik.
  const firstOccurrenceList: Array<{
    displayKey: string;
    key: string | number;
    snapshotFirstIndex: number;
  }> = [];
  const seenKeys = new Set<string>();

  for (let i = 0; i < snapshot.length; i++) {
    const rawKey = keyAccessor(snapshot[i]);
    const normalized = normalizeTargetForField(config.field, rawKey);
    const keySignature =
      normalized === null
        ? `raw:${String(rawKey)}`
        : `${typeof normalized}:${String(normalized)}`;

    if (!seenKeys.has(keySignature)) {
      seenKeys.add(keySignature);
      firstOccurrenceList.push({
        displayKey: String(snapshot[i][config.field]),
        key: normalized ?? rawKey,
        snapshotFirstIndex: i,
      });
    }
  }

  return config.targetCases.map((targetCase): ResolvedSearchTarget => {
    if (targetCase === 'not-found') {
      const rawNotFound = buildNotFoundRawTarget(config.field, snapshot, keyAccessor);
      const normalized = normalizeTargetForField(config.field, rawNotFound);
      return {
        targetCase,
        targetDisplay: String(rawNotFound),
        normalizedTarget: normalized,
        snapshotReferenceIndex: null,
      };
    }

    if (targetCase === 'custom') {
      const rawCustom = (config.customTarget ?? '').trim();
      const normalized = normalizeTargetForField(config.field, rawCustom);
      if (!rawCustom || normalized === null) {
        return {
          targetCase,
          targetDisplay: rawCustom,
          normalizedTarget: null,
          snapshotReferenceIndex: null,
          invalidReason: `Target kustom "${rawCustom}" tidak valid untuk kolom "${config.field}".`,
        };
      }
      return {
        targetCase,
        targetDisplay: rawCustom,
        normalizedTarget: normalized,
        snapshotReferenceIndex: null,
      };
    }

    if (firstOccurrenceList.length === 0) {
      return {
        targetCase,
        targetDisplay: '',
        normalizedTarget: null,
        snapshotReferenceIndex: null,
        invalidReason: 'Dataset snapshot kosong sehingga target pencarian tidak dapat dipilih.',
      };
    }

    if (targetCase === 'found-start') {
      const picked = firstOccurrenceList[0];
      return {
        targetCase,
        targetDisplay: picked.displayKey,
        normalizedTarget: picked.key,
        snapshotReferenceIndex: picked.snapshotFirstIndex,
      };
    }

    if (targetCase === 'found-end') {
      const picked = firstOccurrenceList[firstOccurrenceList.length - 1];
      return {
        targetCase,
        targetDisplay: picked.displayKey,
        normalizedTarget: picked.key,
        snapshotReferenceIndex: picked.snapshotFirstIndex,
      };
    }

    // found-middle: pilih kunci yang indeks kemunculan pertamanya paling dekat dengan tengah snapshot.
    const targetMiddleIndex = Math.floor((snapshot.length - 1) / 2);
    let bestPick = firstOccurrenceList[Math.floor(firstOccurrenceList.length / 2)];
    let bestDistance = Math.abs(bestPick.snapshotFirstIndex - targetMiddleIndex);
    for (let i = 0; i < firstOccurrenceList.length; i++) {
      const entry = firstOccurrenceList[i];
      const distance = Math.abs(entry.snapshotFirstIndex - targetMiddleIndex);
      if (distance < bestDistance) {
        bestDistance = distance;
        bestPick = entry;
      }
    }

    return {
      targetCase,
      targetDisplay: bestPick.displayKey,
      normalizedTarget: bestPick.key,
      snapshotReferenceIndex: bestPick.snapshotFirstIndex,
    };
  });
}

/**
 * Menjalankan benchmark algoritma pengurutan (sorting) secara adil:
 * seluruh algoritma menerima snapshot & distribusi awal yang identik,
 * penyalinan dilakukan di luar timer, didahului warm-up, lalu divalidasi.
 */
export function runSortBenchmark(
  config: SortBenchmarkConfig,
  envInfo: EnvironmentInfo,
  onProgress?: ProgressCallback,
): BenchmarkResultRecord[] {
  const scenario = classifyScenario(config.datasetSize);
  const warmups = Math.max(0, Math.floor(config.warmups));
  const repeats = Math.max(1, Math.floor(config.repeats));

  const snapshot = generateDataset(config.datasetSize, config.seed);
  const baseInput = prepareDistribution(
    snapshot,
    config.distribution,
    config.field,
    config.order,
  );
  const comparator = createItemComparator(config.field, config.order);

  const results: BenchmarkResultRecord[] = [];
  const totalSteps = config.algorithms.length;

  for (let algoIdx = 0; algoIdx < config.algorithms.length; algoIdx++) {
    const algo = config.algorithms[algoIdx];
    const meta = SORTING_ALGORITHMS[algo];
    const algorithmName = meta?.name ?? algo;
    const stepNumber = algoIdx + 1;

    onProgress?.({
      mode: 'sorting',
      currentAlgorithm: algo,
      currentAlgorithmName: algorithmName,
      currentStep: stepNumber,
      totalSteps,
      currentIteration: 0,
      totalIterations: warmups + repeats,
      phase: 'preparing',
      message: `Menyiapkan ${algorithmName} (${config.datasetSize} data, distribusi ${config.distribution})...`,
    });

    const samplesMs: number[] = [];
    let lastOutput: WarehouseItem[] = [];
    let timedOut = false;
    let unexpectedError: string | null = null;

    try {
      for (let w = 0; w < warmups; w++) {
        onProgress?.({
          mode: 'sorting',
          currentAlgorithm: algo,
          currentAlgorithmName: algorithmName,
          currentStep: stepNumber,
          totalSteps,
          currentIteration: w + 1,
          totalIterations: warmups,
          phase: 'warmup',
          message: `Warm-up ${w + 1}/${warmups} untuk ${algorithmName}...`,
        });

        const copy = [...baseInput];
        const deadline =
          config.timeoutMs > 0 ? performance.now() + config.timeoutMs : undefined;
        runPreparedSort(copy, algo, comparator, deadline);
      }

      for (let r = 0; r < repeats; r++) {
        onProgress?.({
          mode: 'sorting',
          currentAlgorithm: algo,
          currentAlgorithmName: algorithmName,
          currentStep: stepNumber,
          totalSteps,
          currentIteration: r + 1,
          totalIterations: repeats,
          phase: 'measuring',
          message: `Mengukur ${algorithmName} (pengulangan ${r + 1}/${repeats})...`,
        });

        const copy = [...baseInput];
        const deadline =
          config.timeoutMs > 0 ? performance.now() + config.timeoutMs : undefined;
        const t0 = performance.now();
        lastOutput = runPreparedSort(copy, algo, comparator, deadline);
        const t1 = performance.now();
        samplesMs.push(Math.max(0, t1 - t0));
      }
    } catch (err) {
      if (err instanceof AlgorithmTimeoutError) {
        timedOut = true;
      } else {
        unexpectedError =
          err instanceof Error
            ? err.message
            : 'Terjadi kesalahan tak terduga saat menjalankan pengurutan.';
      }
    }

    if (timedOut) {
      results.push({
        id: createRecordId('sort'),
        timestamp: new Date().toISOString(),
        mode: 'sorting',
        scenario,
        datasetSize: config.datasetSize,
        seed: config.seed,
        distribution: config.distribution,
        algorithm: algo,
        algorithmName,
        field: config.field,
        order: config.order,
        targetCase: '',
        targetValue: '',
        repeats,
        warmups,
        medianMs: null,
        minMs: null,
        maxMs: null,
        samplesMs: [],
        setupMs: 0,
        correctness: 'timeout',
        timeoutMs: config.timeoutMs,
        browser: envInfo.browser,
        platform: envInfo.platform,
        notes: `Eksekusi dihentikan karena melebihi batas waktu ${config.timeoutMs} ms pada ${config.datasetSize} data (distribusi ${config.distribution}).`,
      });
      continue;
    }

    if (unexpectedError !== null) {
      results.push({
        id: createRecordId('sort'),
        timestamp: new Date().toISOString(),
        mode: 'sorting',
        scenario,
        datasetSize: config.datasetSize,
        seed: config.seed,
        distribution: config.distribution,
        algorithm: algo,
        algorithmName,
        field: config.field,
        order: config.order,
        targetCase: '',
        targetValue: '',
        repeats,
        warmups,
        medianMs: null,
        minMs: null,
        maxMs: null,
        samplesMs: [],
        setupMs: 0,
        correctness: 'failed',
        timeoutMs: config.timeoutMs,
        browser: envInfo.browser,
        platform: envInfo.platform,
        notes: `Gagal menjalankan algoritma: ${unexpectedError}`,
      });
      continue;
    }

    onProgress?.({
      mode: 'sorting',
      currentAlgorithm: algo,
      currentAlgorithmName: algorithmName,
      currentStep: stepNumber,
      totalSteps,
      currentIteration: repeats,
      totalIterations: repeats,
      phase: 'validating',
      message: `Memvalidasi kebenaran hasil ${algorithmName}...`,
    });

    const validation = validateSortResult(baseInput, lastOutput, comparator);
    if (!validation.valid) {
      results.push({
        id: createRecordId('sort'),
        timestamp: new Date().toISOString(),
        mode: 'sorting',
        scenario,
        datasetSize: config.datasetSize,
        seed: config.seed,
        distribution: config.distribution,
        algorithm: algo,
        algorithmName,
        field: config.field,
        order: config.order,
        targetCase: '',
        targetValue: '',
        repeats,
        warmups,
        medianMs: null,
        minMs: null,
        maxMs: null,
        samplesMs: [],
        setupMs: 0,
        correctness: 'failed',
        timeoutMs: config.timeoutMs,
        browser: envInfo.browser,
        platform: envInfo.platform,
        notes: validation.reason ?? 'Validasi hasil pengurutan gagal.',
      });
      continue;
    }

    const medianMs = computeMedian(samplesMs);
    const minMs = computeMin(samplesMs);
    const maxMs = computeMax(samplesMs);

    results.push({
      id: createRecordId('sort'),
      timestamp: new Date().toISOString(),
      mode: 'sorting',
      scenario,
      datasetSize: config.datasetSize,
      seed: config.seed,
      distribution: config.distribution,
      algorithm: algo,
      algorithmName,
      field: config.field,
      order: config.order,
      targetCase: '',
      targetValue: '',
      repeats,
      warmups,
      medianMs,
      minMs,
      maxMs,
      samplesMs,
      setupMs: 0,
      correctness: 'valid',
      timeoutMs: config.timeoutMs,
      browser: envInfo.browser,
      platform: envInfo.platform,
      notes: `Validasi lulus (${lastOutput.length} item terurut sesuai komparator dan multiset ID utuh).`,
    });
  }

  return results;
}

/**
 * Menjalankan benchmark algoritma pencarian (Linear Search vs Binary Search)
 * secara jujur: Linear Search berjalan di atas snapshot acak, sedangkan
 * Binary Search memisahkan biaya pengurutan prasyarat ke setupMs atau
 * melaporkan precondition-error bila auto-sort dimatikan pada data belum terurut.
 */
export function runSearchBenchmark(
  config: SearchBenchmarkConfig,
  envInfo: EnvironmentInfo,
  onProgress?: ProgressCallback,
): BenchmarkResultRecord[] {
  const scenario = classifyScenario(config.datasetSize);
  const warmups = Math.max(0, Math.floor(config.warmups));
  const repeats = Math.max(1, Math.floor(config.repeats));

  const snapshot = generateDataset(config.datasetSize, config.seed);
  const keyAccessor = createKeyAccessor(config.field);
  const resolvedTargets = resolveSearchTargets(config, snapshot);

  let sortedForBinary: WarehouseItem[] | null = null;
  let binarySetupMs = 0;
  let binaryPreconditionMet = true;

  if (config.algorithms.includes('binary')) {
    if (config.autoSortForBinary) {
      const sortComparator = createKeySortComparator(config.field);
      const copy = [...snapshot];
      const s0 = performance.now();
      sortedForBinary = mergeSortPrepared(copy, sortComparator);
      binarySetupMs = Math.max(0, performance.now() - s0);
      binaryPreconditionMet = isSortedByKey(sortedForBinary, keyAccessor);
    } else {
      binaryPreconditionMet = isSortedByKey(snapshot, keyAccessor);
      if (binaryPreconditionMet) {
        sortedForBinary = snapshot;
      }
    }
  }

  const results: BenchmarkResultRecord[] = [];
  const totalSteps = config.algorithms.length * resolvedTargets.length;
  let currentStep = 0;

  for (const algo of config.algorithms) {
    const meta = SEARCHING_ALGORITHMS[algo];
    const algorithmName = meta?.name ?? algo;

    for (const target of resolvedTargets) {
      currentStep += 1;

      onProgress?.({
        mode: 'searching',
        currentAlgorithm: algo,
        currentAlgorithmName: algorithmName,
        currentStep,
        totalSteps,
        currentIteration: 0,
        totalIterations: warmups + repeats,
        phase: 'preparing',
        message: `Menyiapkan ${algorithmName} untuk kasus "${target.targetCase}"...`,
      });

      const distribution =
        algo === 'binary'
          ? config.autoSortForBinary || binaryPreconditionMet
            ? 'sorted'
            : 'unsorted-snapshot'
          : 'unsorted-snapshot';

      // Kasus khusus Binary Search tanpa auto-sort pada snapshot belum terurut.
      if (algo === 'binary' && !binaryPreconditionMet) {
        results.push({
          id: createRecordId('search'),
          timestamp: new Date().toISOString(),
          mode: 'searching',
          scenario,
          datasetSize: config.datasetSize,
          seed: config.seed,
          distribution,
          algorithm: algo,
          algorithmName,
          field: config.field,
          order: 'ascending-key',
          targetCase: target.targetCase,
          targetValue: target.targetDisplay,
          repeats,
          warmups,
          medianMs: null,
          minMs: null,
          maxMs: null,
          samplesMs: [],
          setupMs: 0,
          correctness: 'precondition-error',
          timeoutMs: config.timeoutMs,
          browser: envInfo.browser,
          platform: envInfo.platform,
          notes:
            'Prasyarat Binary Search tidak terpenuhi: snapshot dataset belum terurut menaik pada kolom kunci dan opsi urut otomatis (auto-sort) dinonaktifkan.',
        });
        continue;
      }

      if (target.normalizedTarget === null) {
        results.push({
          id: createRecordId('search'),
          timestamp: new Date().toISOString(),
          mode: 'searching',
          scenario,
          datasetSize: config.datasetSize,
          seed: config.seed,
          distribution,
          algorithm: algo,
          algorithmName,
          field: config.field,
          order: 'ascending-key',
          targetCase: target.targetCase,
          targetValue: target.targetDisplay,
          repeats,
          warmups,
          medianMs: null,
          minMs: null,
          maxMs: null,
          samplesMs: [],
          setupMs: algo === 'binary' ? binarySetupMs : 0,
          correctness: 'precondition-error',
          timeoutMs: config.timeoutMs,
          browser: envInfo.browser,
          platform: envInfo.platform,
          notes:
            target.invalidReason ??
            'Target pencarian tidak dapat dinormalisasi untuk kolom yang dipilih.',
        });
        continue;
      }

      const searchDataset =
        algo === 'binary' && sortedForBinary ? sortedForBinary : snapshot;
      const setupMs = algo === 'binary' ? binarySetupMs : 0;
      const searchFn = algo === 'binary' ? binarySearch : linearSearch;

      const samplesMs: number[] = [];
      let lastIndex = -1;

      for (let w = 0; w < warmups; w++) {
        onProgress?.({
          mode: 'searching',
          currentAlgorithm: algo,
          currentAlgorithmName: algorithmName,
          currentStep,
          totalSteps,
          currentIteration: w + 1,
          totalIterations: warmups,
          phase: 'warmup',
          message: `Warm-up ${w + 1}/${warmups} untuk ${algorithmName} (${target.targetCase})...`,
        });
        searchFn(searchDataset, target.normalizedTarget, keyAccessor);
      }

      for (let r = 0; r < repeats; r++) {
        onProgress?.({
          mode: 'searching',
          currentAlgorithm: algo,
          currentAlgorithmName: algorithmName,
          currentStep,
          totalSteps,
          currentIteration: r + 1,
          totalIterations: repeats,
          phase: 'measuring',
          message: `Mengukur ${algorithmName} (${target.targetCase}, pengulangan ${r + 1}/${repeats})...`,
        });
        const t0 = performance.now();
        lastIndex = searchFn(searchDataset, target.normalizedTarget, keyAccessor);
        const t1 = performance.now();
        samplesMs.push(Math.max(0, t1 - t0));
      }

      onProgress?.({
        mode: 'searching',
        currentAlgorithm: algo,
        currentAlgorithmName: algorithmName,
        currentStep,
        totalSteps,
        currentIteration: repeats,
        totalIterations: repeats,
        phase: 'validating',
        message: `Memvalidasi hasil ${algorithmName} (${target.targetCase})...`,
      });

      const validation = validateSearchResult(
        searchDataset,
        target.normalizedTarget,
        keyAccessor,
        lastIndex,
      );

      const found = lastIndex >= 0;
      const matchedItem = found ? searchDataset[lastIndex] : undefined;

      if (!validation.valid) {
        results.push({
          id: createRecordId('search'),
          timestamp: new Date().toISOString(),
          mode: 'searching',
          scenario,
          datasetSize: config.datasetSize,
          seed: config.seed,
          distribution,
          algorithm: algo,
          algorithmName,
          field: config.field,
          order: 'ascending-key',
          targetCase: target.targetCase,
          targetValue: target.targetDisplay,
          repeats,
          warmups,
          medianMs: null,
          minMs: null,
          maxMs: null,
          samplesMs: [],
          setupMs,
          correctness: 'failed',
          found,
          matchedIndex: found ? lastIndex : undefined,
          matchedCode: matchedItem?.kode,
          timeoutMs: config.timeoutMs,
          browser: envInfo.browser,
          platform: envInfo.platform,
          notes: validation.reason ?? 'Validasi hasil pencarian gagal.',
        });
        continue;
      }

      const medianMs = computeMedian(samplesMs);
      const minMs = computeMin(samplesMs);
      const maxMs = computeMax(samplesMs);

      let notes: string;
      if (algo === 'binary') {
        const snapshotPosNote =
          target.snapshotReferenceIndex !== null
            ? `Posisi acuan pada snapshot acak: indeks ${target.snapshotReferenceIndex}.`
            : 'Target ditentukan dari kasus uji langsung.';
        const sortedMatchNote = found
          ? `Ditemukan pada array terurut di indeks ${lastIndex} (${matchedItem?.kode ?? '-'}).`
          : 'Target tidak ditemukan pada array terurut (hasil -1 terverifikasi).';
        const setupNote = config.autoSortForBinary
          ? 'Biaya pengurutan prasyarat dicatat terpisah pada setupMs di luar waktu inti pencarian.'
          : 'Dataset sudah terurut sebelum pengukuran.';
        notes = `${sortedMatchNote} ${snapshotPosNote} ${setupNote}`;
      } else {
        const linearMatchNote = found
          ? `Ditemukan pada snapshot acak di indeks ${lastIndex} (${matchedItem?.kode ?? '-'}).`
          : 'Target tidak ditemukan pada snapshot acak (hasil -1 terverifikasi).';
        const refNote =
          target.snapshotReferenceIndex !== null &&
          found &&
          target.snapshotReferenceIndex !== lastIndex
            ? ` Indeks kemunculan pertama pada snapshot adalah ${lastIndex}.`
            : '';
        notes = `${linearMatchNote}${refNote}`;
      }

      results.push({
        id: createRecordId('search'),
        timestamp: new Date().toISOString(),
        mode: 'searching',
        scenario,
        datasetSize: config.datasetSize,
        seed: config.seed,
        distribution,
        algorithm: algo,
        algorithmName,
        field: config.field,
        order: 'ascending-key',
        targetCase: target.targetCase,
        targetValue: target.targetDisplay,
        repeats,
        warmups,
        medianMs,
        minMs,
        maxMs,
        samplesMs,
        setupMs,
        correctness: 'valid',
        found,
        matchedIndex: found ? lastIndex : undefined,
        matchedCode: matchedItem?.kode,
        timeoutMs: config.timeoutMs,
        browser: envInfo.browser,
        platform: envInfo.platform,
        notes,
      });
    }
  }

  return results;
}
