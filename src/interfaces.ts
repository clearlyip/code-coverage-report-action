export interface Coverage {
  files: Files
  coverage: number
  timestamp: number
  basePath: string
}

export interface CoverageFile {
  relative: string
  absolute: string
  coverage: number
}

export interface Inputs {
  token: string
  filename: string
  badge: boolean
  overallCoverageFailThreshold: number
  fileCoverageErrorMin: number
  fileCoverageWarningMax: number
  failOnNegativeDifference: boolean
  markdownFilename: string
  artifactDownloadWorkflowNames: string[] | null
  artifactName: string
  negativeDifferenceBy: string
  retention: number | undefined
}

export interface Files {
  [key: string]: CoverageFile
}
