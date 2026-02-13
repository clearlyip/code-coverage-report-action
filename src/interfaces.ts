export interface Coverage {
  files: Files;
  coverage: number;
  timestamp: number;
  basePath: string;
}

export interface CoverageFile {
  relative: string;
  absolute: string;
  coverage: number;
  lines_covered?: number;
  lines_valid?: number;
}

export interface Inputs {
  token: string;
  filename: string;
  badge: boolean;
  overallCoverageFailThreshold: number;
  fileCoverageErrorMin: number;
  fileCoverageWarningMax: number;
  failOnNegativeDifference: boolean;
  markdownFilename: string;
  artifactDownloadWorkflowNames: string[] | null;
  artifactName: string;
  negativeDifferenceBy: string;
  retention: number | undefined;
  withBaseCoverageTemplate: string;
  withoutBaseCoverageTemplate: string;
  negativeDifferenceThreshold: number;
  onlyListChangedFiles: boolean;
  skipPackageCoverage: boolean;
  showCoverageByTopDir: boolean;
  coverageDepth: number | undefined;
  showCoverageByParentDir: boolean;
  excludePaths: string[];
}

export interface Files {
  [key: string]: CoverageFile;
}

export interface HandlebarContextCoverage {
  package: string;
  base_coverage: string;
  new_coverage?: string;
  difference?: string;
  /** Plain percentage for summary line only (no emoji), e.g. "0%" or "-1.51%" */
  difference_plain?: string;
}

export interface HandlebarContext {
  coverage_badge?: string;
  show_package_coverage?: boolean;
  minimum_allowed_coverage?: string;
  new_coverage?: string;
  negative_difference_threshold?: string | null;
  coverage: HandlebarContextCoverage[];
  overall_coverage: HandlebarContextCoverage;
  coverage_by_top_dir?: HandlebarContextCoverage[];
  inputs: Inputs;
}
