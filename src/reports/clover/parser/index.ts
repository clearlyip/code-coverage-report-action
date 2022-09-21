import {Clover, File, FileMetrics} from '../types'
import {Coverage} from '../../../interfaces'
import {
  determineCommonBasePath,
  roundPercentage,
  createHash,
  escapeRegExp
} from '../../../utils'

export default async function parse(clover: Clover): Promise<Coverage> {
  const fileList = clover.coverage.project.file.map(({'@_name': name}) => {
    return name
  })

  const basePath = `${determineCommonBasePath(fileList)}`
  const r = new RegExp(`^${escapeRegExp(`${basePath}/`)}`)

  const {metrics, '@_timestamp': timestamp} = clover.coverage.project

  return {
    files: clover.coverage.project.file.reduce(
      (previous, {'@_name': name, metrics: fileMetrics}: File) => ({
        ...previous,
        [createHash(name)]: {
          relative: name.replace(r, ''),
          absolute: name,
          coverage: processCoverageMetrics(fileMetrics)
        }
      }),
      {}
    ),
    coverage: processCoverageMetrics(metrics),
    timestamp: parseInt(timestamp),
    basePath
  }
}

/**
 * Process Coverage Metrics from Clover
 *
 * See: https://confluence.atlassian.com/clover/how-are-the-clover-coverage-percentages-calculated-79986990.html
 *
 * @param metrics
 * @returns
 */
function processCoverageMetrics(metrics: FileMetrics): number {
  const coveredConditionals = parseInt(metrics['@_coveredconditionals'])
  const coveredStatements = parseInt(metrics['@_coveredstatements'])
  const coveredMethods = parseInt(metrics['@_coveredmethods'])
  const conditionals = parseInt(metrics['@_conditionals'])
  const statements = parseInt(metrics['@_statements'])
  const methods = parseInt(metrics['@_methods'])

  const coveredSum = coveredConditionals + coveredStatements + coveredMethods
  const codeSum = conditionals + statements + methods

  const codeCoveragePercentage =
    codeSum > 0 ? (100.0 * coveredSum) / codeSum : 0

  return roundPercentage(codeCoveragePercentage)
}
