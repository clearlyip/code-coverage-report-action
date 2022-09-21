export interface Cobertura {
  '?xml': XML
  coverage: Coverage
}

export interface XML {
  '@_version': string
  '@_encoding': string
}

export interface Coverage {
  sources: Sources
  packages: Packages
  '@_line-rate': string
  '@_branch-rate': string
  '@_version': string
  '@_timestamp': string
  '@_lines-covered': string
  '@_lines-valid': string
  '@_branches-covered': string
  '@_branches-valid': string
}

export interface Packages {
  package: Package[]
}

export interface Package {
  classes: Classes
  '@_name': string
  '@_line-rate': string
  '@_branch-rate': string
  '@_complexity': string
}

export interface Classes {
  class: Class[]
}

export interface Class {
  methods: Methods
  lines: Lines
  '@_name': string
  '@_filename': string
  '@_line-rate': string
  '@_branch-rate': string
  '@_complexity': string
}

export interface Lines {
  line: LineElement[] | PurpleLine
}

export interface LineElement {
  '@_number': string
  '@_hits': string
  '@_branch'?: Boolean
  conditions?: Conditions
  '@_condition-coverage'?: string
}

export enum Boolean {
  False = 'False',
  True = 'True'
}

export interface Conditions {
  condition: ConditionElement[] | ConditionElement
}

export interface ConditionElement {
  '@_number': string
  '@_type'?: Type
  '@_coverage': string
}

export enum Type {
  Jump = 'jump',
  Switch = 'switch',
  Method = 'method',
  Statement = 'statement'
}

export interface PurpleLine {
  '@_number': string
  '@_hits': string
  '@_branch'?: Boolean
}

export interface Methods {
  method: MethodElement[] | MethodElement
}

export interface MethodElement {
  lines: Lines
  '@_name': string
  '@_signature': string
  '@_line-rate': string
  '@_branch-rate': string
  '@_complexity': string
}

export interface Sources {
  source: string
}
