import {Coverage, Files} from '../../../interfaces'
import {
  createHash,
  determineCommonBasePath,
  escapeRegExp,
  roundPercentage
} from '../../../utils'
import {Cobertura, Package, Class} from '../types'

export default async function parse(cobertura: Cobertura): Promise<Coverage> {
  const files: Files = await parsePackages(cobertura.coverage.packages.package)

  const fileList = Object.values(files).map(file => file.absolute)
  const basePath = `${determineCommonBasePath(fileList)}`
  const regExp = new RegExp(`^${escapeRegExp(`${basePath}/`)}`)

  return {
    files: Object.entries(files).reduce((previous, [, file]) => {
      file.relative = file.absolute.replace(regExp, '')
      return {...previous, [createHash(file.relative)]: file}
    }, {}),
    coverage: roundPercentage(
      parseFloat(cobertura.coverage['@_line-rate']) * 100
    ),
    timestamp: parseInt(cobertura.coverage['@_timestamp']),
    basePath
  }
}

/**
 * Parse Packages
 *
 * @param {Package[]} packages
 * @returns {Promise<Files>}
 */
async function parsePackages(packages?: Package[]): Promise<Files> {
  let allFiles: Files = {}
  for await (const p of packages || []) {
    if (!p.classes) {
      continue
    }
    const files = await parseClasses(p.classes.class)

    allFiles = {...allFiles, ...files}
  }
  return allFiles
}

/**
 * Process into an object
 *
 * @param {Class[]} classes
 * @returns {Promise<Files>}
 */
async function parseClasses(classes?: Class[]): Promise<Files> {
  return (
    classes?.reduce(
      (previous, {'@_filename': path, '@_line-rate': lineRate}: Class) => ({
        ...previous,
        [createHash(`${path}`)]: {
          relative: path,
          absolute: `${path}`,
          coverage: roundPercentage(parseFloat(lineRate) * 100)
        }
      }),
      {}
    ) || {}
  )
}
