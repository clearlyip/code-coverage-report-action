import {
  formatArtifactName,
  checkFileExists,
  createHash,
  roundPercentage,
  determineCommonBasePath,
  escapeRegExp,
  colorizePercentageByThreshold,
  getInputs
} from '../src/utils'
import {
  expect,
  test,
  beforeEach,
  afterEach,
  describe,
  jest
} from '@jest/globals'

const env = process.env

beforeEach(() => {
  jest.resetModules()
  process.env = {...env}
})

afterEach(() => {
  process.env = env
})

test('formats the artifact name', async () => {
  process.env.INPUT_GITHUB_TOKEN = 'token'
  process.env.INPUT_FILENAME = 'filename.xml'
  process.env.INPUT_ARTIFACT_NAME = 'coverage-%name%'
  const name = formatArtifactName('bar')
  expect(name).toBe('coverage-bar')
})

test('files exists', async () => {
  const ret = await checkFileExists(__filename)
  expect(ret).toBeTruthy()

  const ret1 = await checkFileExists(__filename + 'bar')
  expect(ret1).toBeFalsy()
})

test('created hash', () => {
  const hash = createHash('foo')
  expect(hash).toBeDefined()
})

test('round percentage', () => {
  const a = roundPercentage(45.51234565)
  expect(a).toBe(45.51)

  const b = roundPercentage(45.51634565)
  expect(b).toBe(45.52)
})

test('determine common base path from list of paths', () => {
  const path = determineCommonBasePath([
    '/usr/src/app/foo.js',
    '/usr/src/app/foo/bar.js'
  ])

  expect(path).toBe('/usr/src/app')
})

test('escaping regular expression input', () => {
  const output = escapeRegExp('\\^$.|?*+{}[]()')
  expect(output).toBe('\\\\\\^\\$\\.\\|\\?\\*\\+\\{\\}\\[\\]\\(\\)')
})

test('colorize percentage by threshold', () => {
  const shouldBeNA = colorizePercentageByThreshold(null)
  expect(shouldBeNA).toBe('N/A')

  const shouldBeGrey = colorizePercentageByThreshold(0)
  expect(shouldBeGrey).toBe('⚪ 0%')

  const shouldBeRed = colorizePercentageByThreshold(20, 50)
  expect(shouldBeRed).toBe('🔴 20%')

  const shouldBeGreen = colorizePercentageByThreshold(70, 50)
  expect(shouldBeGreen).toBe('🟢 70%')

  const shouldBeRedA = colorizePercentageByThreshold(20, 75, 30)
  expect(shouldBeRedA).toBe('🔴 20%')

  const shouldBeOrangeA = colorizePercentageByThreshold(40, 75, 30)
  expect(shouldBeOrangeA).toBe('🟠 40%')

  const shouldBeGreenA = colorizePercentageByThreshold(80, 75, 30)
  expect(shouldBeGreenA).toBe('🟢 80%')
})

test('getInputs', () => {
  process.env.INPUT_GITHUB_TOKEN = 'token'
  process.env.INPUT_FILENAME = 'filename.xml'

  const f = getInputs()
  expect(f).toStrictEqual({
    token: 'token',
    filename: 'filename.xml',
    badge: false,
    overallCoverageFailThreshold: 0,
    fileCoverageErrorMin: 50,
    fileCoverageWarningMax: 75,
    failOnNegativeDifference: false,
    markdownFilename: 'code-coverage-results',
    artifactDownloadWorkflowNames: null,
    artifactName: 'coverage-%name%'
  })
})
