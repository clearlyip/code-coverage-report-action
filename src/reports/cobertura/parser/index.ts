import {Coverage} from '../../../interfaces'
import {
  createHash,
  determineCommonBasePath,
  escapeRegExp,
  roundPercentage
} from '../../../utils'
import {Cobertura, Package} from '../types'

export default async function parse(cobertura: Cobertura): Promise<Coverage> {
  const fileList = cobertura.coverage.packages.package.map(
    ({'@_name': name}) => {
      return name
    }
  )

  const basePath = `${determineCommonBasePath(fileList)}`
  const r = new RegExp(`^${escapeRegExp(`${basePath}/`)}`)

  return {
    files: cobertura.coverage.packages.package.reduce(
      (previous, {'@_name': name, '@_line-rate': lineRate}: Package) => ({
        ...previous,
        [createHash(name.replace(r, ''))]: {
          relative: name.replace(r, ''),
          absolute: name,
          coverage: roundPercentage(parseFloat(lineRate) * 100)
        }
      }),
      {}
    ),
    coverage: roundPercentage(
      parseFloat(cobertura.coverage['@_line-rate']) * 100
    ),
    timestamp: parseInt(cobertura.coverage['@_timestamp']),
    basePath
  }
}
