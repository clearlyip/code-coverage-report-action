export interface Clover {
  '?xml': XML
  coverage: Coverage
}

export interface XML {
  '@_version': string
  '@_encoding': string
}

export interface Coverage {
  project: Project
  '@_generated': string
}

export interface Project {
  file: File[]
  metrics: FileMetrics
  '@_timestamp': string
}

export interface File {
  class?: Class
  line?: Line[]
  metrics: FileMetrics
  '@_name': string
}

export interface Class {
  metrics: ClassMetrics
  '@_name': string
  '@_namespace': Namespace
}

export enum Namespace {
  Global = 'global'
}

export interface ClassMetrics {
  '@_complexity': string
  '@_methods': string
  '@_coveredmethods': string
  '@_conditionals': string
  '@_coveredconditionals': string
  '@_statements': string
  '@_coveredstatements': string
  '@_elements': string
  '@_coveredelements': string
}

export interface Line {
  '@_num': string
  '@_type': Type
  '@_name'?: string
  '@_visibility'?: Visibility
  '@_complexity'?: string
  '@_crap'?: string
  '@_count': string
}

export enum Type {
  Method = 'method',
  Stmt = 'stmt'
}

export enum Visibility {
  Private = 'private',
  Protected = 'protected',
  Public = 'public'
}

export interface FileMetrics {
  '@_loc': string
  '@_ncloc': string
  '@_classes': string
  '@_methods': string
  '@_coveredmethods': string
  '@_conditionals': string
  '@_coveredconditionals': string
  '@_statements': string
  '@_coveredstatements': string
  '@_elements': string
  '@_coveredelements': string
  '@_files'?: string
}
