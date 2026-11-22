import { afterEach, describe, expect, it, vi } from 'vitest';
import { createKeyAccessor } from '../../algorithms/searching';
import { createItemComparator } from '../../algorithms/sorting';
import {
  CUSTOM_DATASET_LIMITS,
  DATASET_PRESETS,
  classifyScenario,
  createSeededRng,
  generateDataset,
  generateSeedString,
  prepareDistribution,
} from '../../data/generator';
import { INITIAL_WAREHOUSE_ITEMS } from '../../data/initialItems';
import {
  STORAGE_KEY,
  generateNextKode,
  loadWarehouseItems,
  resetWarehouseItems,
  saveWarehouseItems,
  validateItemInput,
} from '../../data/storage';
import {
  ITEM_CATEGORIES,
  LOW_STOCK_THRESHOLD,
  type ItemInput,
  type WorkerRequest,
  type WorkerResponse,
} from '../../types';
import {
  BenchmarkCancelledError,
  BenchmarkWorkerClient,
} from '../../workers/workerClient';
import { collectEnvironmentInfo } from '../environment';
import { exportResultsToCSV, exportResultsToJSON } from '../exporter';
import {
  computeMax,
  computeMedian,
  computeMin,
  formatDuration,
  formatNumberID,
  formatRupiah,
} from '../metrics';
import { runSearchBenchmark, runSortBenchmark } from '../runner';
import { validateSearchResult, validateSortResult } from '../validators';

describe('INITIAL_WAREHOUSE_ITEMS', () => {
  it('menyediakan 28 item elektronik realistis lintas 7 kategori beserta stok rendah dan duplikat', () => {
    expect(INITIAL_WAREHOUSE_ITEMS).toHaveLength(28);

    const categories = new Set(INITIAL_WAREHOUSE_ITEMS.map((item) => item.kategori));
    for (const cat of ITEM_CATEGORIES) {
      expect(categories.has(cat)).toBe(true);
    }

    const lowStockItems = INITIAL_WAREHOUSE_ITEMS.filter(
      (item) => item.stok <= LOW_STOCK_THRESHOLD,
    );
    expect(lowStockItems.length).toBeGreaterThanOrEqual(6);
    expect(INITIAL_WAREHOUSE_ITEMS.some((item) => item.stok === 0)).toBe(true);

    const uniquePrices = new Set(INITIAL_WAREHOUSE_ITEMS.map((item) => item.harga));
    const uniqueStocks = new Set(INITIAL_WAREHOUSE_ITEMS.map((item) => item.stok));
    expect(uniquePrices.size).toBeLessThan(INITIAL_WAREHOUSE_ITEMS.length);
    expect(uniqueStocks.size).toBeLessThan(INITIAL_WAREHOUSE_ITEMS.length);
  });
});

describe('generator.ts', () => {
  it('createSeededRng menghasilkan deret deterministik pada [0, 1)', () => {
    const rngA = createSeededRng('GK-2026-TEST');
    const rngB = createSeededRng('GK-2026-TEST');
    const rngC = createSeededRng('GK-2026-LAIN');

    const seqA = Array.from({ length: 15 }, () => rngA());
    const seqB = Array.from({ length: 15 }, () => rngB());
    const seqC = Array.from({ length: 15 }, () => rngC());

    expect(seqA).toEqual(seqB);
    expect(seqA).not.toEqual(seqC);
    for (const val of seqA) {
      expect(val).toBeGreaterThanOrEqual(0);
      expect(val).toBeLessThan(1);
    }
  });

  it('memiliki preset dan klasifikasi skenario sesuai PRD Bagian 9', () => {
    expect(DATASET_PRESETS.kecil.defaultSize).toBe(500);
    expect(DATASET_PRESETS.menengah.defaultSize).toBe(3000);
    expect(DATASET_PRESETS.besar.defaultSize).toBe(10000);
    expect(DATASET_PRESETS.besar.quickOptions).toEqual([10000, 20000]);
    expect(CUSTOM_DATASET_LIMITS).toEqual({ min: 100, max: 50000 });

    expect(classifyScenario(500)).toBe('kecil');
    expect(classifyScenario(999)).toBe('kecil');
    expect(classifyScenario(1000)).toBe('menengah');
    expect(classifyScenario(5000)).toBe('menengah');
    expect(classifyScenario(7500)).toBe('kustom');
    expect(classifyScenario(10000)).toBe('besar');
    expect(classifyScenario(25000)).toBe('besar');
    expect(generateSeedString()).toMatch(/^GK-2026-[A-Z0-9]{4}$/);
  });

  it('generateDataset bersifat deterministik, teracak Fisher-Yates, dan mengandung duplikat', () => {
    const dataset1 = generateDataset(250, 'SEED-ALPHA');
    const dataset2 = generateDataset(250, 'SEED-ALPHA');
    const dataset3 = generateDataset(250, 'SEED-BETA');

    expect(dataset1).toHaveLength(250);
    expect(dataset1).toEqual(dataset2);
    expect(dataset1).not.toEqual(dataset3);

    // Pastikan kode unik tetapi posisinya teracak (tidak sudah terurut menaik/menurun).
    const codes = dataset1.map((item) => item.kode);
    expect(new Set(codes).size).toBe(250);
    const sortedAsc = [...codes].sort();
    expect(codes).not.toEqual(sortedAsc);

    // Pastikan terdapat duplikat pada nama, kategori, stok, dan harga.
    expect(new Set(dataset1.map((i) => i.nama)).size).toBeLessThan(250);
    expect(new Set(dataset1.map((i) => i.kategori)).size).toBeLessThanOrEqual(
      ITEM_CATEGORIES.length,
    );
    expect(new Set(dataset1.map((i) => i.stok)).size).toBeLessThan(250);
    expect(new Set(dataset1.map((i) => i.harga)).size).toBeLessThan(250);
  });

  it('prepareDistribution menyiapkan salinan random, sorted, dan reversed dengan benar', () => {
    const base = generateDataset(120, 'DIST-SEED');
    const randomCopy = prepareDistribution(base, 'random', 'harga', 'asc');
    expect(randomCopy).toEqual(base);
    expect(randomCopy).not.toBe(base);

    const sortedCopy = prepareDistribution(base, 'sorted', 'harga', 'asc');
    const ascComp = createItemComparator('harga', 'asc');
    for (let i = 1; i < sortedCopy.length; i++) {
      expect(ascComp(sortedCopy[i - 1], sortedCopy[i])).toBeLessThanOrEqual(0);
    }

    const reversedCopy = prepareDistribution(base, 'reversed', 'harga', 'asc');
    const descComp = createItemComparator('harga', 'desc');
    for (let i = 1; i < reversedCopy.length; i++) {
      expect(descComp(reversedCopy[i - 1], reversedCopy[i])).toBeLessThanOrEqual(0);
    }
  });
});

describe('metrics.ts', () => {
  it('menghitung median, min, dan max dengan tepat', () => {
    expect(computeMedian([])).toBeNull();
    expect(computeMedian([Number.NaN])).toBeNull();
    expect(computeMedian([9, 1, 5])).toBe(5);
    expect(computeMedian([10, 2, 4, 8])).toBe(6);

    expect(computeMin([])).toBeNull();
    expect(computeMin([12.5, 3.2, 99.1])).toBe(3.2);

    expect(computeMax([])).toBeNull();
    expect(computeMax([12.5, 3.2, 99.1])).toBe(99.1);
  });

  it('memformat durasi, Rupiah, dan angka Indonesia secara akurat', () => {
    expect(formatDuration(null)).toBe('-');
    expect(formatDuration(undefined)).toBe('-');
    expect(formatDuration(Number.NaN)).toBe('-');
    expect(formatDuration(0)).toBe('< 0,01 ms');
    expect(formatDuration(0.0042)).toBe('< 0,01 ms (~4,2 µs)');
    expect(formatDuration(0.142)).toBe('0,142 ms');
    expect(formatDuration(14.52)).toBe('14,52 ms');
    expect(formatDuration(1425.3)).toBe('1.425,30 ms (1,43 dtk)');

    expect(formatRupiah(150000)).toBe('Rp 150.000');
    expect(formatRupiah(0)).toBe('Rp 0');
    expect(formatNumberID(10000)).toBe('10.000');
  });
});

describe('validators.ts', () => {
  it('validateSortResult memvalidasi panjang, multiset ID, dan urutan monoton', () => {
    const input = generateDataset(60, 'VAL-SORT');
    const comp = createItemComparator('stok', 'asc');
    const sorted = [...input].sort(comp);

    expect(validateSortResult(input, sorted, comp)).toEqual({ valid: true });
    expect(validateSortResult(input, sorted.slice(0, 59), comp).valid).toBe(false);

    const duplicatedId = [...sorted];
    duplicatedId[0] = { ...duplicatedId[1] };
    expect(validateSortResult(input, duplicatedId, comp).valid).toBe(false);

    expect(validateSortResult(input, input, comp).valid).toBe(false);
  });

  it('validateSearchResult memeriksa kecocokan pertama dan kasus tidak ditemukan', () => {
    const items = [
      { ...INITIAL_WAREHOUSE_ITEMS[0], stok: 10 },
      { ...INITIAL_WAREHOUSE_ITEMS[1], stok: 20 },
      { ...INITIAL_WAREHOUSE_ITEMS[2], stok: 20 },
      { ...INITIAL_WAREHOUSE_ITEMS[3], stok: 30 },
    ];
    const accessor = createKeyAccessor('stok');

    expect(validateSearchResult(items, 20, accessor, 1)).toEqual({ valid: true });
    expect(validateSearchResult(items, 20, accessor, 2).valid).toBe(false);
    expect(validateSearchResult(items, 20, accessor, 0).valid).toBe(false);
    expect(validateSearchResult(items, 999, accessor, -1)).toEqual({ valid: true });
    expect(validateSearchResult(items, 20, accessor, -1).valid).toBe(false);
    expect(validateSearchResult(items, 20, accessor, 10).valid).toBe(false);
  });
});

describe('storage.ts', () => {
  it('validateItemInput memvalidasi seluruh aturan formulir dalam Bahasa Indonesia', () => {
    const existing = INITIAL_WAREHOUSE_ITEMS;
    const validInput: ItemInput = {
      kode: 'BRG-000999',
      nama: 'Kabel USB4 Braided 1m',
      kategori: ITEM_CATEGORIES[0],
      stok: 15,
      harga: 125000,
      lokasi: 'ELEK-A-02-04',
    };
    expect(validateItemInput(validInput, existing)).toEqual({});

    const duplicateErrors = validateItemInput(
      { ...validInput, kode: '  brg-000001  ' },
      existing,
    );
    expect(duplicateErrors.kode).toBeDefined();

    // Saat mengedit item yang sama, kode sendiri diperbolehkan.
    const selfEditErrors = validateItemInput(
      { ...validInput, kode: 'BRG-000001' },
      existing,
      existing[0].id,
    );
    expect(selfEditErrors.kode).toBeUndefined();

    const invalidErrors = validateItemInput(
      {
        kode: 'AB',
        nama: 'X',
        kategori: '   ',
        stok: 2.5,
        harga: -100,
        lokasi: 'R'.repeat(51),
      },
      existing,
    );
    expect(invalidErrors.kode).toBeDefined();
    expect(invalidErrors.nama).toBeDefined();
    expect(invalidErrors.kategori).toBeDefined();
    expect(invalidErrors.stok).toBeDefined();
    expect(invalidErrors.harga).toBeDefined();
    expect(invalidErrors.lokasi).toBeDefined();

    const negativeStock = validateItemInput({ ...validInput, stok: -1 }, existing);
    expect(negativeStock.stok).toBeDefined();
  });

  it('generateNextKode dan loadWarehouseItems bekerja aman di lingkungan Node', () => {
    expect(generateNextKode(INITIAL_WAREHOUSE_ITEMS)).toBe('BRG-000029');
    expect(generateNextKode([])).toBe('BRG-000001');

    const loaded = loadWarehouseItems();
    expect(loaded).toHaveLength(28);
    expect(loaded).not.toBe(INITIAL_WAREHOUSE_ITEMS);
  });
});

describe('exporter.ts', () => {
  it('exportResultsToCSV dan exportResultsToJSON menghasilkan format lengkap sesuai PRD', () => {
    const envInfo = collectEnvironmentInfo();
    const results = runSortBenchmark(
      {
        algorithms: ['merge', 'native'],
        datasetSize: 100,
        seed: 'EXP-SEED',
        distribution: 'random',
        field: 'harga',
        order: 'asc',
        warmups: 1,
        repeats: 3,
        timeoutMs: 2000,
      },
      envInfo,
    );

    // Tambahkan satu baris simulasi timeout dengan catatan mengandung koma & kutip.
    const withTimeout = [
      ...results,
      {
        ...results[0],
        id: 'sort-timeout-test',
        algorithm: 'bubble' as const,
        algorithmName: 'Bubble Sort',
        medianMs: null,
        minMs: null,
        maxMs: null,
        samplesMs: [],
        correctness: 'timeout' as const,
        notes: 'Melebihi batas waktu, uji "kutip" CSV',
      },
    ];

    const csv = exportResultsToCSV(withTimeout);
    expect(csv.startsWith('\uFEFF')).toBe(true);
    const lines = csv.slice(1).split('\n');
    expect(lines).toHaveLength(4);
    expect(lines[0]).toBe(
      'id,timestamp,mode,scenario,datasetSize,seed,distribution,algorithm,algorithmName,field,order,targetCase,targetValue,repeats,warmups,medianMs,minMs,maxMs,setupMs,unit,medianDefinition,correctness,found,matchedIndex,matchedCode,timeoutMs,browser,platform,notes',
    );
    expect(lines[1]).toContain('ms (milidetik)');
    expect(lines[1]).toContain(
      'Nilai tengah dari seluruh pengulangan di luar warm-up',
    );
    expect(lines[3]).toContain('"Melebihi batas waktu, uji ""kutip"" CSV"');

    const jsonText = exportResultsToJSON(withTimeout, envInfo);
    const parsed = JSON.parse(jsonText) as {
      application: string;
      units: { duration: string; setupMs: string };
      environment: { browser: string };
      results: unknown[];
    };
    expect(parsed.application).toBe('GudangKita');
    expect(parsed.units.duration).toBe('ms (milidetik)');
    expect(parsed.environment.browser).toBe(envInfo.browser);
    expect(parsed.results).toHaveLength(3);
  });
});

describe('runner.ts', () => {
  const envInfo = collectEnvironmentInfo();

  it('runSortBenchmark menjalankan beberapa algoritma dan memvalidasi hasilnya', () => {
    const progressPhases: string[] = [];
    const results = runSortBenchmark(
      {
        algorithms: ['bubble', 'selection', 'insertion', 'merge', 'quick', 'native'],
        datasetSize: 150,
        seed: 'SORT-RUN-1',
        distribution: 'random',
        field: 'nama',
        order: 'asc',
        warmups: 1,
        repeats: 3,
        timeoutMs: 3000,
      },
      envInfo,
      (progress) => {
        progressPhases.push(progress.phase);
      },
    );

    expect(results).toHaveLength(6);
    for (const record of results) {
      expect(record.mode).toBe('sorting');
      expect(record.scenario).toBe('kecil');
      expect(record.correctness).toBe('valid');
      expect(record.samplesMs).toHaveLength(3);
      expect(record.medianMs).not.toBeNull();
      expect(record.minMs).not.toBeNull();
      expect(record.maxMs).not.toBeNull();
      expect(record.setupMs).toBe(0);
    }

    expect(progressPhases).toContain('preparing');
    expect(progressPhases).toContain('warmup');
    expect(progressPhases).toContain('measuring');
    expect(progressPhases).toContain('validating');
  });

  it('runSortBenchmark menangani timeout algoritma kuadratik pada dataset terbalik', () => {
    const results = runSortBenchmark(
      {
        algorithms: ['bubble'],
        datasetSize: 4000,
        seed: 'TIMEOUT-SEED',
        distribution: 'reversed',
        field: 'kode',
        order: 'asc',
        warmups: 0,
        repeats: 1,
        timeoutMs: 1,
      },
      envInfo,
    );

    expect(results).toHaveLength(1);
    expect(results[0].correctness).toBe('timeout');
    expect(results[0].medianMs).toBeNull();
    expect(results[0].minMs).toBeNull();
    expect(results[0].maxMs).toBeNull();
    expect(results[0].notes).toContain('1 ms');
  });

  it('runSearchBenchmark membandingkan Linear Search & Binary Search (auto-sort vs tanpa auto-sort)', () => {
    const autoSortResults = runSearchBenchmark(
      {
        algorithms: ['linear', 'binary'],
        datasetSize: 300,
        seed: 'SEARCH-SEED-1',
        field: 'kode',
        targetCases: [
          'found-start',
          'found-middle',
          'found-end',
          'not-found',
          'custom',
        ],
        customTarget: 'BRG-000042',
        autoSortForBinary: true,
        warmups: 1,
        repeats: 5,
        timeoutMs: 2000,
      },
      envInfo,
    );

    expect(autoSortResults).toHaveLength(10);

    const linearRecords = autoSortResults.filter((r) => r.algorithm === 'linear');
    const binaryRecords = autoSortResults.filter((r) => r.algorithm === 'binary');

    expect(linearRecords).toHaveLength(5);
    expect(binaryRecords).toHaveLength(5);

    for (let i = 0; i < 5; i++) {
      const lin = linearRecords[i];
      const bin = binaryRecords[i];

      expect(lin.correctness).toBe('valid');
      expect(bin.correctness).toBe('valid');
      expect(lin.distribution).toBe('unsorted-snapshot');
      expect(bin.distribution).toBe('sorted');
      expect(lin.setupMs).toBe(0);
      expect(bin.setupMs).toBeGreaterThanOrEqual(0);
      expect(lin.targetValue).toBe(bin.targetValue);
      expect(lin.found).toBe(bin.found);

      if (lin.targetCase === 'not-found') {
        expect(lin.found).toBe(false);
        expect(bin.found).toBe(false);
        expect(lin.matchedIndex).toBeUndefined();
      } else {
        expect(lin.found).toBe(true);
        expect(bin.found).toBe(true);
        expect(lin.matchedCode).toBe(bin.matchedCode);
      }
    }

    // Tanpa auto-sort pada snapshot acak, Binary Search wajib melapor precondition-error.
    const noAutoSortResults = runSearchBenchmark(
      {
        algorithms: ['binary'],
        datasetSize: 200,
        seed: 'SEARCH-SEED-2',
        field: 'kode',
        targetCases: ['found-start', 'custom'],
        customTarget: 'tidak-valid-untuk-stok',
        autoSortForBinary: false,
        warmups: 1,
        repeats: 3,
        timeoutMs: 2000,
      },
      envInfo,
    );

    expect(noAutoSortResults).toHaveLength(2);
    for (const rec of noAutoSortResults) {
      expect(rec.correctness).toBe('precondition-error');
      expect(rec.medianMs).toBeNull();
      expect(rec.setupMs).toBe(0);
    }

    // Target kustom tidak valid pada kolom numerik menghasilkan precondition-error.
    const invalidCustom = runSearchBenchmark(
      {
        algorithms: ['linear'],
        datasetSize: 100,
        seed: 'SEARCH-SEED-3',
        field: 'harga',
        targetCases: ['custom'],
        customTarget: 'bukan-angka',
        autoSortForBinary: true,
        warmups: 1,
        repeats: 3,
        timeoutMs: 2000,
      },
      envInfo,
    );

    expect(invalidCustom).toHaveLength(1);
    expect(invalidCustom[0].correctness).toBe('precondition-error');
    expect(invalidCustom[0].medianMs).toBeNull();
  });

  it('runSearchBenchmark memvalidasi lower-bound dan kecocokan pertama pada kolom berduplikat (stok)', () => {
    const results = runSearchBenchmark(
      {
        algorithms: ['linear', 'binary'],
        datasetSize: 250,
        seed: 'SEARCH-DUP-STOK',
        field: 'stok',
        targetCases: ['found-start', 'found-middle', 'found-end', 'not-found'],
        autoSortForBinary: true,
        warmups: 1,
        repeats: 3,
        timeoutMs: 2000,
      },
      envInfo,
    );

    expect(results).toHaveLength(8);
    for (const rec of results) {
      expect(rec.correctness).toBe('valid');
      if (rec.targetCase === 'not-found') {
        expect(rec.found).toBe(false);
      } else {
        expect(rec.found).toBe(true);
        expect(rec.matchedIndex).toBeGreaterThanOrEqual(0);
      }
    }
  });
});

describe('storage.ts dengan mock localStorage', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('saveWarehouseItems, loadWarehouseItems, dan resetWarehouseItems mengelola data di localStorage', () => {
    const store = new Map<string, string>();
    const mockStorage: Storage = {
      get length() {
        return store.size;
      },
      clear: () => store.clear(),
      getItem: (key: string) => store.get(key) ?? null,
      key: (index: number) => Array.from(store.keys())[index] ?? null,
      removeItem: (key: string) => {
        store.delete(key);
      },
      setItem: (key: string, value: string) => {
        store.set(key, value);
      },
    };
    vi.stubGlobal('localStorage', mockStorage);

    const customItems = INITIAL_WAREHOUSE_ITEMS.slice(0, 3);
    saveWarehouseItems(customItems);
    expect(store.has(STORAGE_KEY)).toBe(true);

    const loaded = loadWarehouseItems();
    expect(loaded).toHaveLength(3);
    expect(loaded[0].kode).toBe('BRG-000001');

    // Data JSON rusak harus jatuh kembali ke 28 item awal.
    store.set(STORAGE_KEY, '{rusak-json');
    expect(loadWarehouseItems()).toHaveLength(28);

    const reset = resetWarehouseItems();
    expect(reset).toHaveLength(28);
    expect(loadWarehouseItems()).toHaveLength(28);
  });
});

describe('BenchmarkWorkerClient', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('mengelola runSort, progress, pembatalan, error worker, dan pencegahan eksekusi ganda', async () => {
    const envInfo = collectEnvironmentInfo();
    const instances: MockWorker[] = [];

    class MockWorker {
      public onmessage: ((event: MessageEvent<WorkerResponse>) => void) | null = null;
      public onerror: ((event: ErrorEvent) => void) | null = null;
      public onmessageerror: ((event: MessageEvent) => void) | null = null;
      public terminated = false;
      public lastRequest: WorkerRequest | null = null;

      constructor() {
        instances.push(this);
      }

      public postMessage(data: WorkerRequest): void {
        this.lastRequest = data;
      }

      public terminate(): void {
        this.terminated = true;
      }

      public emitMessage(payload: WorkerResponse): void {
        this.onmessage?.({ data: payload } as MessageEvent<WorkerResponse>);
      }
    }

    vi.stubGlobal('Worker', MockWorker);

    const client = new BenchmarkWorkerClient();
    expect(client.isRunning()).toBe(false);

    const progressSeen: string[] = [];
    const sortPromise = client.runSort(
      {
        algorithms: ['merge'],
        datasetSize: 100,
        seed: 'WORKER-1',
        distribution: 'random',
        field: 'kode',
        order: 'asc',
        warmups: 1,
        repeats: 2,
        timeoutMs: 1000,
      },
      envInfo,
      (p) => progressSeen.push(p.phase),
    );

    expect(client.isRunning()).toBe(true);
    await expect(
      client.runSearch(
        {
          algorithms: ['linear'],
          datasetSize: 100,
          seed: 'WORKER-2',
          field: 'kode',
          targetCases: ['found-start'],
          autoSortForBinary: true,
          warmups: 1,
          repeats: 2,
          timeoutMs: 1000,
        },
        envInfo,
      ),
    ).rejects.toThrow(/masih berjalan/i);

    const worker1 = instances[0];
    expect(worker1.lastRequest?.type).toBe('START_SORT_BENCHMARK');
    const reqId1 = worker1.lastRequest!.requestId;

    worker1.emitMessage({
      type: 'PROGRESS',
      requestId: reqId1,
      progress: {
        mode: 'sorting',
        currentAlgorithm: 'merge',
        currentAlgorithmName: 'Merge Sort',
        currentStep: 1,
        totalSteps: 1,
        currentIteration: 1,
        totalIterations: 2,
        phase: 'measuring',
        message: 'Mengukur Merge Sort...',
      },
    });

    const expectedResults = runSortBenchmark(
      {
        algorithms: ['merge'],
        datasetSize: 100,
        seed: 'WORKER-1',
        distribution: 'random',
        field: 'kode',
        order: 'asc',
        warmups: 1,
        repeats: 2,
        timeoutMs: 1000,
      },
      envInfo,
    );

    worker1.emitMessage({
      type: 'RESULT',
      requestId: reqId1,
      results: expectedResults,
    });

    const resolved = await sortPromise;
    expect(resolved).toEqual(expectedResults);
    expect(progressSeen).toEqual(['measuring']);
    expect(client.isRunning()).toBe(false);
    expect(worker1.terminated).toBe(true);

    // Uji pembatalan (cancel)
    const cancelPromise = client.runSearch(
      {
        algorithms: ['binary'],
        datasetSize: 100,
        seed: 'WORKER-3',
        field: 'kode',
        targetCases: ['found-start'],
        autoSortForBinary: true,
        warmups: 1,
        repeats: 2,
        timeoutMs: 1000,
      },
      envInfo,
    );
    const worker2 = instances[1];
    expect(client.isRunning()).toBe(true);
    client.cancel();
    expect(client.isRunning()).toBe(false);
    expect(worker2.terminated).toBe(true);
    await expect(cancelPromise).rejects.toBeInstanceOf(BenchmarkCancelledError);

    // Uji pesan ERROR dari worker
    const errorPromise = client.runSort(
      {
        algorithms: ['quick'],
        datasetSize: 100,
        seed: 'WORKER-4',
        distribution: 'random',
        field: 'harga',
        order: 'desc',
        warmups: 1,
        repeats: 2,
        timeoutMs: 1000,
      },
      envInfo,
    );
    const worker3 = instances[2];
    worker3.emitMessage({
      type: 'ERROR',
      requestId: worker3.lastRequest!.requestId,
      error: 'Simulasi galat worker',
    });
    await expect(errorPromise).rejects.toThrow('Simulasi galat worker');
    expect(client.isRunning()).toBe(false);
    expect(worker3.terminated).toBe(true);
  });
});
