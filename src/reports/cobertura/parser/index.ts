import {Coverage, Files} from '../../../interfaces'
import {
  createHash,
  determineCommonBasePath,
  escapeRegExp,
  roundPercentage
} from '../../../utils'
import {Cobertura, Package, Class} from '../types'

export default async function parse(cobertura: Cobertura): Promise<Coverage> {
  const sources = cobertura.coverage.sources.source
  const files: Files = await parsePackages(
    cobertura.coverage.packages.package,
    sources
  )

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
 * @param {string[]} sources
 * @returns {Promise<Files>}
 */
async function parsePackages(
  packages: Package[],
  sources: string[]
): Promise<Files> {
  let allFiles: Files = {}
  for await (const p of packages) {
    if (!p.classes) {
      continue
    }
    const files = await parseClasses(p.classes.class, sources)

    allFiles = {...allFiles, ...files}
  }
  return allFiles
}

/**
 * Process into an object
 *
 * @param {Class[]} classes
 * @param {string[]} sources
 * @returns {Promise<Files>}
 */
async function parseClasses(
  classes: Class[],
  sources: string[]
): Promise<Files> {
  return classes.reduce(
    (previous, {'@_filename': path, '@_line-rate': lineRate}: Class) => ({
      ...previous,
      [createHash(`${sources[0]}/${path}`)]: {
        relative: path,
        absolute: `${sources[0]}/${path}`,
        coverage: roundPercentage(parseFloat(lineRate) * 100)
      }
    }),
    {}
  )
}
