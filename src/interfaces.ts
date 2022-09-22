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
  overallFailThreshold: number
  coverageColorRedMin: number
  coverageColorOrangeMax: number
  failOnNegativeDifference: boolean
  markdownFilename: string
}

export interface Files {
  [key: string]: CoverageFile
}
