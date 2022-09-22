import {promises as fs, constants as fsConstants} from 'fs'
import {XMLParser} from 'fast-xml-parser'
import * as artifact from '@actions/artifact'
import * as core from '@actions/core'
import * as github from '@actions/github'
import {Clover, parse as parseClover} from './reports/clover'
import {Cobertura, parse as parseCobertura} from './reports/cobertura'
import path from 'path'
import {Coverage, Inputs} from './interfaces'
import crypto from 'crypto'
import AdmZip from 'adm-zip'

const {access, readFile, mkdir} = fs

/**
 * Check if a file exists
 * @param {string} filename
 * @returns {Promise<boolean>}
 */
export async function checkFileExists(filename: string): Promise<boolean> {
  try {
    await access(filename, fsConstants.F_OK)
    return true
    // eslint-disable-next-line no-empty
  } catch (e) {}
  return false
}

/**
 * Parse XML
 * @param {string} filename
 * @returns {Promise<T | null>}
 */
export async function parseXML<T>(filename: string): Promise<T | null> {
  if (!(await checkFileExists(filename))) {
    return null
  }

  const contents = await readFile(filename, 'binary')

  return new XMLParser({
    ignoreAttributes: false,
    isArray: (name, jpath, isLeafNode, isAttribute) => {
      if (isAttribute) {
        return false
      }
      return inArray(jpath, [
        'coverage.project.package',
        'coverage.project.package.file'
      ])
    }
  }).parse(contents)
}

/**
 * Download Artifacts
 *
 * @param {string} name
 * @param {string} base
 * @returns {Promise<string|null>}
 */
export async function downloadArtifacts(
  name: string,
  base = 'artifacts'
): Promise<string | null> {
  const {token} = getInputs()
  const client = github.getOctokit(token)

  const {GITHUB_BASE_REF = '', GITHUB_REPOSITORY = ''} = process.env

  const [owner, repo] = GITHUB_REPOSITORY.split('/')

  for await (const runs of client.paginate.iterator(
    client.rest.actions.listWorkflowRunsForRepo,
    {
      owner,
      repo,
      branch: GITHUB_BASE_REF,
      status: 'success'
    }
  )) {
    for await (const run of runs.data) {
      if (run.name !== github.context.job) {
        continue
      }

      const artifacts = await client.rest.actions.listWorkflowRunArtifacts({
        owner,
        repo,
        run_id: run.id
      })
      if (artifacts.data.artifacts.length === 0) {
        continue
      }
      for await (const art of artifacts.data.artifacts) {
        if (art.expired) {
          continue
        }

        if (art.name !== formatArtifactName(GITHUB_BASE_REF)) {
          continue
        }

        const zip = await client.rest.actions.downloadArtifact({
          owner,
          repo,
          artifact_id: art.id,
          archive_format: 'zip'
        })

        const dir = path.join(__dirname, base)
        await mkdir(dir, {recursive: true})

        const adm = new AdmZip(Buffer.from(zip.data as string))
        adm.extractAllTo(dir, true)
        return dir
      }
    }
  }
  return null
}

/**
 * Upload Artifacts
 * @param {string[]} files
 * @param {string} name
 * @returns {Promise<artifact.UploadResponse>}
 */
export async function uploadArtifacts(
  files: string[],
  name: string
): Promise<artifact.UploadResponse> {
  const artifactClient = artifact.create()
  const artifactName = formatArtifactName(name)

  const rootDirectory = '.'
  const options = {
    continueOnError: false
  }

  return await artifactClient.uploadArtifact(
    artifactName,
    files,
    rootDirectory,
    options
  )
}

/**
 * Parse Coverage file
 * @param {string} filename
 * @returns {Promise<Coverage | null>}
 */
export async function parseCoverage(
  filename: string
): Promise<Coverage | null> {
  if (!(await checkFileExists(filename))) {
    return null
  }

  const ext = path.extname(filename)

  switch (ext) {
    case '.xml':
      {
        const xml = await parseXML<Cobertura | Clover>(filename)

        if (instanceOfCobertura(xml)) {
          return await parseCobertura(xml)
        } else if (instanceOfClover(xml)) {
          return await parseClover(xml)
        }
      }
      break
    default:
  }

  return null
}

export function createHash(data: crypto.BinaryLike): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

/**
 * Round a percentage
 * @param {number} percentage
 * @returns {number}
 */
export function roundPercentage(percentage: number): number {
  return Math.round((percentage + Number.EPSILON) * 100) / 100
}

export function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // $& means the whole matched string
}

export function colorizePercentageByThreshold(
  percentage: number | null,
  threshold = 0,
  equalColor = 'grey'
): string {
  if (percentage === null) {
    return 'N/A'
  }
  if (percentage > threshold) {
    return `$\\textcolor{green}{\\text{${percentage.toString()}}}$%`
  } else if (percentage < threshold) {
    return `$\\textcolor{red}{\\text{${percentage.toString()}}}$%`
  }

  return `$\\textcolor{${equalColor}}{\\text{${percentage.toString()}}}$%`
}

/**
 * Determine a common base path
 *
 * @param {string[]} files
 * @param {string} separator
 * @returns {string}
 */
export function determineCommonBasePath(
  files: string[],
  separator = '/'
): string {
  /**
   * Given an index number, return a function that takes an array and returns the
   * element at the given index
   * @param {number} i
   * @return {function(!Array<*>): *}
   */
  const elAt = (i: number) => (a: string[]) => a[i]

  /**
   * Given an array of strings, return an array of arrays, containing the
   * strings split at the given separator
   */
  const splitStrings = files.map(i => i.split(separator))
  /**
   * Transpose an array of arrays:
   * Example:
   * [['a', 'b', 'c'], ['A', 'B', 'C'], [1, 2, 3]] ->
   * [['a', 'A', 1], ['b', 'B', 2], ['c', 'C', 3]]
   */
  const rotated = splitStrings[0].map((e, i) => splitStrings.map(elAt(i)))

  return (
    rotated
      //Checks of all the elements in the array are the same.
      .filter(arr => arr.every(e => e === arr[0]))
      .map(elAt(0))
      .join(separator)
  )
}

export function getInputs(): Inputs {
  const token = core.getInput('github_token', {required: true})
  const filename = core.getInput('filename')
  const markdownFilename = core.getInput('markdown_filename')
  const badge = core.getInput('badge') === 'true' ? true : false
  const overallFailThreshold = parseInt(core.getInput('overall_fail_threshold'))
  const coverageColorRedMin = parseInt(core.getInput('coverage_color_red_min'))
  const coverageColorOrangeMax = parseInt(
    core.getInput('coverage_color_orange_max')
  )
  const failOnNegativeDifference =
    core.getInput('fail_on_negative_difference') === 'true' ? true : false

  return {
    token,
    filename,
    badge,
    overallFailThreshold,
    coverageColorRedMin,
    coverageColorOrangeMax,
    failOnNegativeDifference,
    markdownFilename
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function instanceOfCobertura(object: any): object is Cobertura {
  return 'coverage' in object && 'packages' in object.coverage
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function instanceOfClover(object: any): object is Clover {
  return 'coverage' in object && 'project' in object.coverage
}

/**
 * Format Artifact Name
 * @param {string} name
 * @returns {string}
 */
export function formatArtifactName(name: string): string {
  return `coverage-${name}`.replace(/\//g, '-')
}

function inArray(needle: string, haystack: string[]): boolean {
  const length = haystack.length
  for (let i = 0; i < length; i++) {
    if (haystack[i] === needle) return true
  }
  return false
}
