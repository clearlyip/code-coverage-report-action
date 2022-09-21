export interface Coverage {
  files: {[key: string]: CoverageFile}
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
  filename: string
  badge: boolean
  overallFailThreshold: number
  coverageColorRedMin: number
  coverageColorOrangeMax: number
  failOnNegativeDifference: boolean
}
