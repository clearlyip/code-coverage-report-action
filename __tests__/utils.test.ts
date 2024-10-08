import {
  formatArtifactName,
  checkFileExists,
  createHash,
  roundPercentage,
  determineCommonBasePath,
  escapeRegExp,
  colorizePercentageByThreshold,
  getInputs,
  parseXML,
  parseCoverage
} from '../src/utils'
import {
  expect,
  test,
  beforeEach,
  afterEach,
  jest,
  beforeAll,
  afterAll
} from '@jest/globals'
import {loadJSONFixture} from './utils'

let originalWriteFunction: (str: string) => boolean
const env = JSON.parse(JSON.stringify(process.env))

beforeAll(async () => {
  originalWriteFunction = process.stdout.write
  process.stdout.write = jest.fn((str: string) => {
    //originalWriteFunction(str)
    return true
  }) as any
})

afterAll(async () => {
  process.stdout.write = originalWriteFunction as unknown as (
    str: string
  ) => boolean
})

beforeEach(async () => {
  process.env = {...env}
})

afterEach(async () => {
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
  const shouldBeZero = colorizePercentageByThreshold(null)
  expect(shouldBeZero).toBe('⚪ 0%')

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

test('parse xml', async () => {
  const ret = await parseXML(__filename)
  expect(ret).toBeTruthy()

  const ret1 = await parseXML(__filename + 'bar')
  expect(ret1).toBeFalsy()
})

test('parse coverage', async () => {
  const ret = await parseCoverage(__filename)
  expect(ret).not.toBeNull

  const ret1 = await parseCoverage(__filename + 'bar')
  expect(ret1).toBeNull
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
    artifactName: 'coverage-%name%',
    negativeDifferenceBy: 'package',
    negativeDifferenceThreshold: -0,
    retention: undefined,
    onlyListChangedFiles: false,
    //This is a cheat
    withBaseCoverageTemplate: f.withBaseCoverageTemplate,
    withoutBaseCoverageTemplate: f.withoutBaseCoverageTemplate
  })
})

test('parse clover into file format', async () => {
  const ret = await parseCoverage(__dirname + '/fixtures/clover.xml')

  const loadedFixture = await loadJSONFixture('clover-parsed.json')
  expect(loadedFixture).toEqual(ret)
})

test('parse cobertura file format', async () => {
  const ret = await parseCoverage(__dirname + '/fixtures/cobertura.xml')

  const loadedFixture = await loadJSONFixture('cobertura-parsed.json')
  expect(loadedFixture).toEqual(ret)
})

test('parse empty cobertura file', async () => {
  const ret = await parseCoverage(__dirname + '/fixtures/cobertura-empty.xml')
  expect(ret).toMatchSnapshot()
})

test('parse cobertura file with empty packages', async () => {
  const ret = await parseCoverage(__dirname + '/fixtures/cobertura-empty-packages.xml')
  expect(ret).toMatchSnapshot()
})

test('parse cobertura file with empty classes', async () => {
  const ret = await parseCoverage(__dirname + '/fixtures/cobertura-empty-classes.xml')
  expect(ret).toMatchSnapshot()
})

test('parse cobertura file with empty lines', async () => {
  const ret = await parseCoverage(__dirname + '/fixtures/cobertura-empty-lines.xml')
  expect(ret).toMatchSnapshot()
})

test('parse cobertura file with empty methods', async () => {
  const ret = await parseCoverage(__dirname + '/fixtures/cobertura-empty-methods.xml')
  expect(ret).toMatchSnapshot()
})

test('parse many sources cobertura file', async () => {
  const ret = await parseCoverage(
    __dirname + '/fixtures/cobertura-many-sources.xml'
  )
  expect(ret).toMatchSnapshot()
})
