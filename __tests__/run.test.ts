import * as core from '@actions/core'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import {
  expect,
  test,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  jest
} from '@jest/globals'

// Static imports of the real utils functions that should NOT be mocked.
// These are resolved before jest.unstable_mockModule runs, so they reference
// the actual implementations. We then pass them into the mock factory so that
// functions.ts (loaded dynamically after the mock is set up) gets the real
// implementations for everything except the four controlled mocks below.
import {
  colorizePercentageByThreshold,
  filterCoverageByExcludePaths,
  filterCoverageZeroLineFiles,
  getInputs,
  getParentDirFromFile,
  getPathAtDepth,
  getTopDirFromFile,
  roundPercentage
} from '../src/utils'

// @actions/core is provided by moduleNameMapper → __mocks__/@actions/core.ts.
// That stub exports jest.fn() mocks with real default implementations, so
// jest.mocked(core.setFailed) is directly usable without a per-file factory.

// jest.fn() mock controls for the four functions we want to intercept.
const mockCheckFileExists = jest.fn<(...args: unknown[]) => Promise<boolean>>()
const mockDownloadArtifacts = jest.fn<(...args: unknown[]) => Promise<string | null>>()
const mockParseCoverage = jest.fn<(...args: unknown[]) => Promise<unknown>>()
const mockUploadArtifacts = jest.fn<(...args: unknown[]) => Promise<unknown>>()

// For the local utils module, jest.requireActual cannot load ESM modules
// synchronously inside a jest.mock() factory.  jest.unstable_mockModule uses
// an async factory which IS safe in ESM mode.  We deliberately do NOT call
// import('../src/utils') inside the factory (that would trigger a circular
// load and OOM).  Instead we pass in the real functions via closures from the
// static imports above.
jest.unstable_mockModule('../src/utils', async () => ({
  colorizePercentageByThreshold,
  filterCoverageByExcludePaths,
  filterCoverageZeroLineFiles,
  getInputs,
  getParentDirFromFile,
  getPathAtDepth,
  getTopDirFromFile,
  roundPercentage,
  checkFileExists: mockCheckFileExists,
  downloadArtifacts: mockDownloadArtifacts,
  parseCoverage: mockParseCoverage,
  uploadArtifacts: mockUploadArtifacts
}))

// Dynamic import MUST come after jest.unstable_mockModule so that when
// functions.ts loads utils.ts, it gets the mocked version.
let run: () => Promise<void>

const mockCoverage = {
  files: {
    abc123: {
      relative: 'src/foo.ts',
      absolute: '/repo/src/foo.ts',
      coverage: 80,
      lines_covered: 8,
      lines_valid: 10
    }
  },
  coverage: 80,
  timestamp: 0,
  basePath: '/repo/src'
}

let originalWriteFunction: (str: string) => boolean
const savedEnv: NodeJS.ProcessEnv = JSON.parse(JSON.stringify(process.env))
let tempSummaryFile: string
let tempOutputFile: string

beforeAll(async () => {
  originalWriteFunction = process.stdout.write
  process.stdout.write = jest.fn(() => true) as any

  tempSummaryFile = path.join(
    import.meta.dirname,
    `temp-run-summary-${crypto.randomBytes(4).toString('hex')}.md`
  )
  tempOutputFile = path.join(
    import.meta.dirname,
    `temp-run-output-${crypto.randomBytes(4).toString('hex')}.txt`
  )
  await fs.promises.writeFile(tempSummaryFile, '')
  await fs.promises.writeFile(tempOutputFile, '')

  // Import functions AFTER the mock is registered so utils imports are mocked
  ;({ run } = await import('../src/functions'))
})

afterAll(async () => {
  process.stdout.write = originalWriteFunction as any
  try {
    await fs.promises.unlink(tempSummaryFile)
  } catch {}
  try {
    await fs.promises.unlink(tempOutputFile)
  } catch {}
  process.env = { ...savedEnv }
})

beforeEach(async () => {
  process.env = {
    ...JSON.parse(JSON.stringify(savedEnv)),
    GITHUB_STEP_SUMMARY: tempSummaryFile,
    GITHUB_OUTPUT: tempOutputFile,
    INPUT_GITHUB_TOKEN: 'token',
    INPUT_FILENAME: 'coverage.xml',
    INPUT_ARTIFACT_NAME: 'coverage-%name%',
    // Use a unique filename to avoid colliding with functions.test.ts parallel runs
    INPUT_MARKDOWN_FILENAME: 'run-test-coverage-results'
  }
  await fs.promises.writeFile(tempSummaryFile, '')
  await fs.promises.writeFile(tempOutputFile, '')

  mockCheckFileExists.mockReset().mockResolvedValue(true)
  mockDownloadArtifacts.mockReset().mockResolvedValue(null)
  mockParseCoverage.mockReset().mockResolvedValue(mockCoverage as any)
  mockUploadArtifacts
    .mockReset()
    .mockResolvedValue({ id: 1, size: 100, artifactItems: [] } as any)
})

afterEach(async () => {
  try {
    await fs.promises.unlink('run-test-coverage-results.md')
  } catch {}
})

test('run: missing file calls setFailed', async () => {
  mockCheckFileExists.mockResolvedValue(false)

  await run()

  expect(jest.mocked(core.setFailed)).toHaveBeenCalledWith(
    expect.stringContaining('Unable to access')
  )
})

test('run: pull_request with base artifact generates markdown with both coverages', async () => {
  process.env.GITHUB_EVENT_NAME = 'pull_request'
  process.env.GITHUB_BASE_REF = 'main'

  mockDownloadArtifacts.mockResolvedValue('/tmp/test-artifacts')
  mockParseCoverage
    .mockResolvedValueOnce(mockCoverage as any)
    .mockResolvedValueOnce(mockCoverage as any)

  await run()

  expect(mockDownloadArtifacts).toHaveBeenCalledWith('main')
  expect(mockParseCoverage).toHaveBeenCalledTimes(2)
})

test('run: pull_request without base artifact warns and generates markdown with head only', async () => {
  process.env.GITHUB_EVENT_NAME = 'pull_request'
  process.env.GITHUB_BASE_REF = 'main'

  mockDownloadArtifacts.mockResolvedValue(null)
  mockParseCoverage.mockResolvedValue(mockCoverage as any)

  await run()

  expect(jest.mocked(core.warning)).toHaveBeenCalledWith(expect.stringContaining('missing'))
  expect(mockParseCoverage).toHaveBeenCalledTimes(1)
})

test('run: pull_request_target works like pull_request', async () => {
  process.env.GITHUB_EVENT_NAME = 'pull_request_target'
  process.env.GITHUB_BASE_REF = 'develop'

  mockDownloadArtifacts.mockResolvedValue(null)
  mockParseCoverage.mockResolvedValue(mockCoverage as any)

  await run()

  expect(mockDownloadArtifacts).toHaveBeenCalledWith('develop')
})

test('run: pull_request with null head coverage calls setFailed', async () => {
  process.env.GITHUB_EVENT_NAME = 'pull_request'
  process.env.GITHUB_BASE_REF = 'main'

  mockDownloadArtifacts.mockResolvedValue(null)
  mockParseCoverage.mockResolvedValue(null)

  await run()

  expect(jest.mocked(core.setFailed)).toHaveBeenCalledWith(
    expect.stringContaining('Unable to process')
  )
})

test('run: pull_request with excludePaths filters both coverages', async () => {
  process.env.GITHUB_EVENT_NAME = 'pull_request'
  process.env.GITHUB_BASE_REF = 'main'
  process.env.INPUT_EXCLUDE_PATHS = 'tests/'

  mockDownloadArtifacts.mockResolvedValue('/tmp/artifacts')
  mockParseCoverage
    .mockResolvedValueOnce(mockCoverage as any)
    .mockResolvedValueOnce(mockCoverage as any)

  await run()

  expect(mockParseCoverage).toHaveBeenCalledTimes(2)
})

test('run: push event uploads artifacts and generates markdown', async () => {
  process.env.GITHUB_EVENT_NAME = 'push'
  process.env.GITHUB_REF_NAME = 'main'
  process.env.GITHUB_WORKFLOW = 'CI'

  mockParseCoverage.mockResolvedValue(mockCoverage as any)

  await run()

  expect(mockUploadArtifacts).toHaveBeenCalledWith(['coverage.xml'], 'main')
  expect(mockParseCoverage).toHaveBeenCalledTimes(1)
})

test('run: schedule event uploads and generates markdown', async () => {
  process.env.GITHUB_EVENT_NAME = 'schedule'
  process.env.GITHUB_REF_NAME = 'release/1.0'

  mockParseCoverage.mockResolvedValue(mockCoverage as any)

  await run()

  expect(mockUploadArtifacts).toHaveBeenCalledWith(
    ['coverage.xml'],
    'release/1.0'
  )
})

test('run: workflow_dispatch event uploads and generates markdown', async () => {
  process.env.GITHUB_EVENT_NAME = 'workflow_dispatch'
  process.env.GITHUB_REF_NAME = 'main'

  mockParseCoverage.mockResolvedValue(mockCoverage as any)

  await run()

  expect(mockUploadArtifacts).toHaveBeenCalled()
})

test('run: push with null head coverage skips generateMarkdown', async () => {
  process.env.GITHUB_EVENT_NAME = 'push'
  process.env.GITHUB_REF_NAME = 'main'

  mockParseCoverage.mockResolvedValue(null)

  await run()

  expect(mockUploadArtifacts).toHaveBeenCalled()
  // Should complete without error
})

test('run: push with excludePaths filters head coverage', async () => {
  process.env.GITHUB_EVENT_NAME = 'push'
  process.env.GITHUB_REF_NAME = 'main'
  process.env.INPUT_EXCLUDE_PATHS = 'tests/, e2e/'

  mockParseCoverage.mockResolvedValue(mockCoverage as any)

  await run()

  expect(mockParseCoverage).toHaveBeenCalled()
  expect(mockUploadArtifacts).toHaveBeenCalled()
})

test('run: unknown event does nothing', async () => {
  process.env.GITHUB_EVENT_NAME = 'repository_dispatch'

  await run()

  expect(mockDownloadArtifacts).not.toHaveBeenCalled()
  expect(mockUploadArtifacts).not.toHaveBeenCalled()
  expect(mockParseCoverage).not.toHaveBeenCalled()
})

test('run: exception from uploadArtifacts calls setFailed', async () => {
  process.env.GITHUB_EVENT_NAME = 'push'
  process.env.GITHUB_REF_NAME = 'main'

  mockUploadArtifacts.mockRejectedValue(new Error('Network error'))

  await run()

  expect(jest.mocked(core.setFailed)).toHaveBeenCalledWith('Network error')
})

test('run: exception from downloadArtifacts calls setFailed', async () => {
  process.env.GITHUB_EVENT_NAME = 'pull_request'
  process.env.GITHUB_BASE_REF = 'main'

  mockDownloadArtifacts.mockRejectedValue(new Error('Download failed'))

  await run()

  expect(jest.mocked(core.setFailed)).toHaveBeenCalledWith('Download failed')
})

