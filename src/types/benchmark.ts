import type { SortOrder, SortableField } from './item';

export type SortingAlgorithmId =
  | 'bubble'
  | 'selection'
  | 'insertion'
  | 'merge'
  | 'quick'
  | 'native';

export type SearchingAlgorithmId = 'linear' | 'binary';

export type AlgorithmId = SortingAlgorithmId | SearchingAlgorithmId;

export type DatasetScenario = 'kecil' | 'menengah' | 'besar' | 'kustom';

export type InputDistribution = 'random' | 'sorted' | 'reversed';

export type TargetCase =
  | 'found-start'
  | 'found-middle'
  | 'found-end'
  | 'not-found'
  | 'custom';

export type BenchmarkMode = 'sorting' | 'searching';

export type CorrectnessStatus =
  | 'valid'
  | 'failed'
  | 'timeout'
  | 'precondition-error';

export interface AlgorithmMetadata {
  id: AlgorithmId;
  name: string;
  mode: BenchmarkMode;
  bestComplexity: string;
  averageComplexity: string;
  worstComplexity: string;
  spaceComplexity: string;
  stable?: boolean;
  isQuadratic?: boolean;
  isOptionalBaseline?: boolean;
  prerequisite: string;
  description: string;
}

export type Comparator<T> = (a: T, b: T) => number;

export type KeyAccessor<T> = (item: T) => string | number;

export interface SearchOutput<T> {
  found: boolean;
  index: number;
  item: T | null;
  preconditionError?: string;
}

export interface SortBenchmarkConfig {
  algorithms: SortingAlgorithmId[];
  datasetSize: number;
  seed: string;
  distribution: InputDistribution;
  field: SortableField;
  order: SortOrder;
  warmups: number;
  repeats: number;
  timeoutMs: number;
}

export interface SearchBenchmarkConfig {
  algorithms: SearchingAlgorithmId[];
  datasetSize: number;
  seed: string;
  field: SortableField;
  targetCases: TargetCase[];
  customTarget?: string;
  autoSortForBinary: boolean;
  warmups: number;
  repeats: number;
  timeoutMs: number;
}

export interface BenchmarkResultRecord {
  id: string;
  timestamp: string;
  mode: BenchmarkMode;
  scenario: DatasetScenario;
  datasetSize: number;
  seed: string;
  distribution: InputDistribution | 'unsorted-snapshot';
  algorithm: AlgorithmId;
  algorithmName: string;
  field: SortableField;
  order: SortOrder | 'ascending-key';
  targetCase: TargetCase | '';
  targetValue: string;
  repeats: number;
  warmups: number;
  medianMs: number | null;
  minMs: number | null;
  maxMs: number | null;
  samplesMs: number[];
  setupMs: number;
  correctness: CorrectnessStatus;
  found?: boolean;
  matchedIndex?: number;
  matchedCode?: string;
  timeoutMs: number;
  browser: string;
  platform: string;
  notes: string;
}

export interface BenchmarkProgress {
  mode: BenchmarkMode;
  currentAlgorithm: AlgorithmId;
  currentAlgorithmName: string;
  currentStep: number;
  totalSteps: number;
  currentIteration: number;
  totalIterations: number;
  phase: 'preparing' | 'warmup' | 'measuring' | 'validating';
  message: string;
}

export interface EnvironmentInfo {
  browser: string;
  platform: string;
  userAgent: string;
  hardwareConcurrency: number | null;
  language: string;
  timerNote: string;
}

export type WorkerRequest =
  | {
      type: 'START_SORT_BENCHMARK';
      requestId: string;
      config: SortBenchmarkConfig;
      envInfo: EnvironmentInfo;
    }
  | {
      type: 'START_SEARCH_BENCHMARK';
      requestId: string;
      config: SearchBenchmarkConfig;
      envInfo: EnvironmentInfo;
    };

export type WorkerResponse =
  | {
      type: 'PROGRESS';
      requestId: string;
      progress: BenchmarkProgress;
    }
  | {
      type: 'RESULT';
      requestId: string;
      results: BenchmarkResultRecord[];
    }
  | {
      type: 'ERROR';
      requestId: string;
      error: string;
    };
