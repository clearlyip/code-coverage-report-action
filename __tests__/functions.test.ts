import {addOverallRow, generateMarkdown} from '../src/functions'
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
