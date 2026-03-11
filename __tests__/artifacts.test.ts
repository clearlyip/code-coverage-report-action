import { uploadArtifacts, downloadArtifacts } from '../src/utils'
import { DefaultArtifactClient } from '@actions/artifact'
import * as github from '@actions/github'
import {
  expect,
  test,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  jest
} from '@jest/globals'

jest.mock('@actions/artifact', () => ({
  DefaultArtifactClient: jest.fn()
}))

jest.mock('@actions/github', () => ({
  getOctokit: jest.fn(),
  context: { job: 'test-job' }
}))

jest.mock('adm-zip', () => {
  return jest.fn().mockImplementation(() => ({
    extractAllTo: jest.fn()
  }))
})

jest.mock('fs', () => {
  const actual = jest.requireActual('fs') as typeof import('fs')
  return {
    ...actual,
    promises: {
      ...actual.promises,
      mkdir: jest.fn().mockResolvedValue(undefined)
    },
    constants: actual.constants
  }
})

const savedEnv = JSON.parse(JSON.stringify(process.env))

beforeAll(() => {
  jest.spyOn(process.stdout, 'write').mockReturnValue(true)
})

afterAll(() => {
  jest.restoreAllMocks()
  process.env = { ...savedEnv }
})

beforeEach(() => {
  process.env = {
    ...JSON.parse(JSON.stringify(savedEnv)),
    INPUT_GITHUB_TOKEN: 'token',
    INPUT_FILENAME: 'coverage.xml',
    INPUT_ARTIFACT_NAME: 'coverage-%name%',
    GITHUB_REPOSITORY: 'owner/repo',
    GITHUB_BASE_REF: 'main'
  }
})

afterEach(() => {
  jest.clearAllMocks()
})

// ── uploadArtifacts ──────────────────────────────────────────────────────────

test('uploadArtifacts calls uploadArtifact with correct artifact name', async () => {
  const mockUploadArtifact = jest
    .fn()
    .mockResolvedValue({ id: 42, size: 1000 })
  ;(DefaultArtifactClient as jest.Mock).mockImplementation(() => ({
    uploadArtifact: mockUploadArtifact
  }))

  const result = await uploadArtifacts(['coverage.xml'], 'main')

  expect(mockUploadArtifact).toHaveBeenCalledWith(
    'coverage-main',
    ['coverage.xml'],
    '.',
    expect.any(Object)
  )
  expect(result).toEqual({ id: 42, size: 1000 })
})

test('uploadArtifacts replaces slashes in branch name', async () => {
  const mockUploadArtifact = jest
    .fn()
    .mockResolvedValue({ id: 1, size: 100 })
  ;(DefaultArtifactClient as jest.Mock).mockImplementation(() => ({
    uploadArtifact: mockUploadArtifact
  }))

  await uploadArtifacts(['coverage.xml'], 'feature/my-branch')

  expect(mockUploadArtifact).toHaveBeenCalledWith(
    'coverage-feature-my-branch',
    expect.any(Array),
    expect.any(String),
    expect.any(Object)
  )
})

test('uploadArtifacts passes retention days when INPUT_RETENTION_DAYS is set', async () => {
  process.env.INPUT_RETENTION_DAYS = '30'
  const mockUploadArtifact = jest
    .fn()
    .mockResolvedValue({ id: 1, size: 100 })
  ;(DefaultArtifactClient as jest.Mock).mockImplementation(() => ({
    uploadArtifact: mockUploadArtifact
  }))

  await uploadArtifacts(['coverage.xml'], 'main')

  expect(mockUploadArtifact).toHaveBeenCalledWith(
    expect.any(String),
    expect.any(Array),
    expect.any(String),
    expect.objectContaining({ retentionDays: 30 })
  )
  delete process.env.INPUT_RETENTION_DAYS
})

// ── downloadArtifacts ────────────────────────────────────────────────────────

function makeAsyncIterator<T>(items: T[]) {
  return (async function* () {
    for (const item of items) {
      yield item
    }
  })()
}

function createMockOctokit({
  runs = [] as any[],
  artifactsMap = {} as Record<number, any[]>
} = {}) {
  return {
    paginate: {
      iterator: jest
        .fn()
        .mockImplementation(() =>
          makeAsyncIterator(runs.map((page: any) => ({ data: page })))
        )
    },
    rest: {
      actions: {
        listWorkflowRunsForRepo: jest.fn(),
        listWorkflowRunArtifacts: jest
          .fn()
          .mockImplementation(({ run_id }: any) =>
            Promise.resolve({
              data: { artifacts: artifactsMap[run_id] ?? [] }
            })
          ),
        downloadArtifact: jest
          .fn()
          .mockResolvedValue({ data: Buffer.alloc(100) })
      }
    }
  }
}

test('downloadArtifacts returns null when no workflow runs found', async () => {
  const mockOctokit = createMockOctokit()
  ;(github.getOctokit as jest.Mock).mockReturnValue(mockOctokit)

  const result = await downloadArtifacts('main')

  expect(result).toBeNull()
})

test('downloadArtifacts returns null and warns when no artifact matches', async () => {
  const runs = [{ id: 1, name: 'test-job' }]
  const mockOctokit = createMockOctokit({
    runs: [runs],
    artifactsMap: { 1: [{ name: 'other-artifact', id: 10, expired: false }] }
  })
  ;(github.getOctokit as jest.Mock).mockReturnValue(mockOctokit)

  const result = await downloadArtifacts('main')

  expect(result).toBeNull()
})

test('downloadArtifacts skips runs with no name', async () => {
  const runs = [{ id: 1, name: null }]
  const mockOctokit = createMockOctokit({
    runs: [runs],
    artifactsMap: { 1: [{ name: 'coverage-main', id: 10, expired: false }] }
  })
  ;(github.getOctokit as jest.Mock).mockReturnValue(mockOctokit)

  const result = await downloadArtifacts('main')

  expect(result).toBeNull()
})

test('downloadArtifacts skips runs whose name does not match workflow names', async () => {
  const runs = [{ id: 1, name: 'other-workflow' }]
  const mockOctokit = createMockOctokit({
    runs: [runs],
    artifactsMap: { 1: [{ name: 'coverage-main', id: 10, expired: false }] }
  })
  ;(github.getOctokit as jest.Mock).mockReturnValue(mockOctokit)

  const result = await downloadArtifacts('main')

  expect(result).toBeNull()
})

test('downloadArtifacts skips runs with empty artifacts list', async () => {
  const runs = [{ id: 1, name: 'test-job' }]
  const mockOctokit = createMockOctokit({
    runs: [runs],
    artifactsMap: { 1: [] }
  })
  ;(github.getOctokit as jest.Mock).mockReturnValue(mockOctokit)

  const result = await downloadArtifacts('main')

  expect(result).toBeNull()
})

test('downloadArtifacts skips expired artifacts', async () => {
  const runs = [{ id: 1, name: 'test-job' }]
  const mockOctokit = createMockOctokit({
    runs: [runs],
    artifactsMap: { 1: [{ name: 'coverage-main', id: 10, expired: true }] }
  })
  ;(github.getOctokit as jest.Mock).mockReturnValue(mockOctokit)

  const result = await downloadArtifacts('main')

  expect(result).toBeNull()
})

test('downloadArtifacts downloads and extracts matching artifact', async () => {
  const runs = [{ id: 1, name: 'test-job' }]
  const mockOctokit = createMockOctokit({
    runs: [runs],
    artifactsMap: { 1: [{ name: 'coverage-main', id: 10, expired: false }] }
  })
  ;(github.getOctokit as jest.Mock).mockReturnValue(mockOctokit)

  const result = await downloadArtifacts('main')

  expect(result).not.toBeNull()
  expect(mockOctokit.rest.actions.downloadArtifact).toHaveBeenCalledWith(
    expect.objectContaining({ artifact_id: 10, archive_format: 'zip' })
  )
})

test('downloadArtifacts uses artifact_download_workflow_names input when set', async () => {
  process.env.INPUT_ARTIFACT_DOWNLOAD_WORKFLOW_NAMES = 'my-custom-workflow'
  const runs = [{ id: 1, name: 'my-custom-workflow' }]
  const mockOctokit = createMockOctokit({
    runs: [runs],
    artifactsMap: { 1: [{ name: 'coverage-main', id: 20, expired: false }] }
  })
  ;(github.getOctokit as jest.Mock).mockReturnValue(mockOctokit)

  const result = await downloadArtifacts('main')

  expect(result).not.toBeNull()
  delete process.env.INPUT_ARTIFACT_DOWNLOAD_WORKFLOW_NAMES
})
