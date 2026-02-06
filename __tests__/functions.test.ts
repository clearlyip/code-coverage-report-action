import {
  addOverallRow,
  aggregateCoverageByTopDir,
  generateMarkdown
} from '../src/functions'
import {
  expect,
  test,
  beforeEach,
  afterEach,
  beforeAll,
  afterAll,
  jest
} from '@jest/globals'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import {loadJSONFixture} from './utils'

let originalWriteFunction: (str: string) => boolean
const env: NodeJS.ProcessEnv = JSON.parse(JSON.stringify(process.env))
let testEnv: NodeJS.ProcessEnv = {}

beforeAll(async () => {
  originalWriteFunction = process.stdout.write
  process.stdout.write = jest.fn((str: string) => {
    //originalWriteFunction(str)
    return true
  }) as any

  const tempFileName = path.join(
    __dirname,
    `temp-${crypto.randomBytes(4).toString('hex')}.md`
  )
  await fs.promises.writeFile(tempFileName, '')
  process.env.GITHUB_STEP_SUMMARY = tempFileName
  process.env.INPUT_GITHUB_TOKEN = 'token'
  process.env.GITHUB_OUTPUT = ''
  process.env.INPUT_FILENAME = 'filename.xml'
  process.env.INPUT_ARTIFACT_NAME = 'coverage-%name%'
})

afterAll(async () => {
  process.stdout.write = originalWriteFunction as unknown as (
    str: string
  ) => boolean
  await fs.promises.unlink(process.env.GITHUB_STEP_SUMMARY as string)
  process.env = {...env}
})

beforeEach(async () => {
  testEnv = {...process.env}
  await fs.promises.writeFile(process.env.GITHUB_STEP_SUMMARY as string, '')
})

afterEach(async () => {
  process.env = {...testEnv}
  await fs.promises.writeFile(process.env.GITHUB_STEP_SUMMARY as string, '')
})

test('add overall row without base coverage', async () => {
  const coverage = await loadJSONFixture('clover-parsed.json')
  const out = addOverallRow(coverage)

  expect(out).toStrictEqual({
    package: 'Overall Coverage',
    base_coverage: '🟢 50.51%'
  })
})

test('add overall row with base coverage', async () => {
  const coverage = await loadJSONFixture('clover-parsed.json')
  const out = addOverallRow(coverage, coverage)

  expect(out).toStrictEqual({
    package: 'Overall Coverage',
    base_coverage: '🟢 50.51%',
    new_coverage: '🟢 50.51%',
    difference: '⚪ 0%'
  })
})

test('aggregateCoverageByTopDir without base: groups by first path segment', async () => {
  const coverage = await loadJSONFixture('clover-parsed.json')
  const out = aggregateCoverageByTopDir(coverage, null, 75, 50)

  expect(out).toHaveLength(2)
  expect(out.map((r) => r.package).sort()).toEqual(['(root)', 'reports/'])
  expect(out.find((r) => r.package === '(root)')?.base_coverage).toContain('%')
  expect(out.find((r) => r.package === 'reports/')?.base_coverage).toContain('%')
})

test('aggregateCoverageByTopDir with base: includes difference', async () => {
  const coverage = await loadJSONFixture('clover-parsed.json')
  const out = aggregateCoverageByTopDir(coverage, coverage, 75, 50)

  expect(out).toHaveLength(2)
  const rootRow = out.find((r) => r.package === '(root)')
  expect(rootRow?.base_coverage).toBeDefined()
  expect(rootRow?.new_coverage).toBeDefined()
  expect(rootRow?.difference).toBeDefined()
})

test('aggregateCoverageByTopDir with Cobertura data uses line-weighted aggregation', async () => {
  const coverage = await loadJSONFixture('cobertura-parsed.json')
  const out = aggregateCoverageByTopDir(coverage, null, 75, 50)

  expect(out.length).toBeGreaterThan(0)
  const reportsRow = out.find((r) => r.package === 'reports/')
  expect(reportsRow).toBeDefined()
  expect(reportsRow?.base_coverage).toBeDefined()
  const rootRow = out.find((r) => r.package === '(root)')
  expect(rootRow).toBeDefined()
})

test('Generate markdown with base coverage and show_coverage_by_top_dir shows top-dir table and threshold', async () => {
  process.env.INPUT_SHOW_COVERAGE_BY_TOP_DIR = 'true'
  process.env.INPUT_NEGATIVE_DIFFERENCE_THRESHOLD = '5'
  const coverage = await loadJSONFixture('clover-parsed.json')
  await generateMarkdown(coverage, coverage)
  const summary = await getGithubStepSummary()
  expect(summary).toContain('Coverage by top-level directory')
  expect(summary).toContain('_Maximum allowed coverage drop is_')
  delete process.env.INPUT_SHOW_COVERAGE_BY_TOP_DIR
  delete process.env.INPUT_NEGATIVE_DIFFERENCE_THRESHOLD
})

test('Generate markdown without coverage by top dir when show_coverage_by_top_dir is false (default)', async () => {
  process.env.INPUT_SHOW_COVERAGE_BY_TOP_DIR = 'false'
  const coverage = await loadJSONFixture('clover-parsed.json')
  await generateMarkdown(coverage)
  const summary = await getGithubStepSummary()
  expect(summary).not.toContain('Coverage by top-level directory')
  expect(summary).toContain('main.ts')
  delete process.env.INPUT_SHOW_COVERAGE_BY_TOP_DIR
})

test('Generate markdown with coverage by top dir only when show_coverage_by_top_dir is true', async () => {
  process.env.INPUT_SHOW_COVERAGE_BY_TOP_DIR = 'true'
  const coverage = await loadJSONFixture('clover-parsed.json')
  await generateMarkdown(coverage)
  const summary = await getGithubStepSummary()
  expect(summary).toContain('Coverage by top-level directory')
  expect(summary).toContain('(root)')
  expect(summary).toContain('reports/')
  expect(summary).not.toContain('main.ts')
  delete process.env.INPUT_SHOW_COVERAGE_BY_TOP_DIR
})

test('Generate Base Clover Markdown', async () => {
  const coverage = await loadJSONFixture('clover-parsed.json')
  await generateMarkdown(coverage)
  expect(getStdoutWriteCalls()).toMatchSnapshot()
  expect(await getGithubStepSummary()).toMatchSnapshot()
})

test('Generate Base Cobertura Markdown', async () => {
  const coverage = await loadJSONFixture('cobertura-parsed.json')
  await generateMarkdown(coverage)
  expect(getStdoutWriteCalls()).toMatchSnapshot()
  expect(await getGithubStepSummary()).toMatchSnapshot()
})

test('Generate Diffed Clover Markdown', async () => {
  const coverage = await loadJSONFixture('clover-parsed.json')
  await generateMarkdown(coverage, coverage)
  expect(getStdoutWriteCalls()).toMatchSnapshot()
  expect(await getGithubStepSummary()).toMatchSnapshot()
})

test('Generate Diffed Cobertura Markdown', async () => {
  const coverage = await loadJSONFixture('cobertura-parsed.json')
  await generateMarkdown(coverage, coverage)
  expect(getStdoutWriteCalls()).toMatchSnapshot()
  expect(await getGithubStepSummary()).toMatchSnapshot()
})

test('Fail if overall coverage is below fail threshold', async () => {
  process.env.INPUT_OVERALL_COVERAGE_FAIL_THRESHOLD = '99'

  const coverage = await loadJSONFixture('clover-parsed.json')
  await generateMarkdown(coverage, coverage)
  expect(getStdoutWriteCalls()).toMatchSnapshot()
  expect(await getGithubStepSummary()).toMatchSnapshot()
})

test('Fail on negative difference', async () => {
  process.env.INPUT_FAIL_ON_NEGATIVE_DIFFERENCE = 'true'

  const coverage = await loadJSONFixture('clover-parsed.json')
  const coverageFail = JSON.parse(JSON.stringify(coverage))
  coverageFail.files[
    '7583809507a13391057c3aee722e422d50d961a87e2a3dbf05ea492dc6465c94'
  ].coverage = 69
  coverageFail.coverage = 49

  await generateMarkdown(coverageFail, coverage)
  expect(getStdoutWriteCalls()).toMatchSnapshot()
  expect(await getGithubStepSummary()).toMatchSnapshot()
})

test('Dont Fail on negative difference if negative_difference_threshold is set', async () => {
  process.env.INPUT_FAIL_ON_NEGATIVE_DIFFERENCE = 'true'
  process.env.INPUT_NEGATIVE_DIFFERENCE_THRESHOLD = '10'

  const coverage = await loadJSONFixture('clover-parsed.json')
  const coverageFail = JSON.parse(JSON.stringify(coverage))
  coverageFail.files[
    '7583809507a13391057c3aee722e422d50d961a87e2a3dbf05ea492dc6465c94'
  ].coverage = 69
  coverageFail.coverage = 49

  await generateMarkdown(coverageFail, coverage)
  expect(getStdoutWriteCalls()).toMatchSnapshot()
  expect(await getGithubStepSummary()).toMatchSnapshot()
})

test('Fail if negative_difference_threshold is set and exceeded', async () => {
  process.env.INPUT_FAIL_ON_NEGATIVE_DIFFERENCE = 'true'
  process.env.INPUT_NEGATIVE_DIFFERENCE_THRESHOLD = '1'

  const coverage = await loadJSONFixture('clover-parsed.json')
  const coverageFail = JSON.parse(JSON.stringify(coverage))
  coverageFail.files[
    '7583809507a13391057c3aee722e422d50d961a87e2a3dbf05ea492dc6465c94'
  ].coverage = 69
  coverageFail.coverage = 49

  await generateMarkdown(coverageFail, coverage)
  expect(getStdoutWriteCalls()).toMatchSnapshot()
  expect(await getGithubStepSummary()).toMatchSnapshot()
})

test('Only list changed files', async () => {
  process.env.INPUT_ONLY_LIST_CHANGED_FILES = 'true'

  const coverage = await loadJSONFixture('clover-parsed.json')
  const coverageFail = JSON.parse(JSON.stringify(coverage))
  coverageFail.files[
    '7583809507a13391057c3aee722e422d50d961a87e2a3dbf05ea492dc6465c94'
  ].coverage = 69
  coverageFail.coverage = 49

  await generateMarkdown(coverageFail, coverage)
  expect(getStdoutWriteCalls()).toMatchSnapshot()
  expect(await getGithubStepSummary()).toMatchSnapshot()
})

async function getGithubStepSummary(): Promise<string> {
  const tempFileName = process.env.GITHUB_STEP_SUMMARY as string
  return fs.promises.readFile(tempFileName, 'utf8')
}

function getStdoutWriteCalls(): string[] {
  const f = process.stdout.write as any

  return f.mock.calls.map((call: any) =>
    JSON.stringify(call[0], null, 2).replace(/^"|"$/g, '')
  )
}
