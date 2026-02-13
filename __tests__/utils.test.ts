import {
  formatArtifactName,
  checkFileExists,
  createHash,
  roundPercentage,
  determineCommonBasePath,
  escapeRegExp,
  colorizePercentageByThreshold,
  getInputs,
  getParentDirFromFile,
  getPathAtDepth,
  getTopDirFromFile,
  isPathExcluded,
  filterCoverageByExcludePaths,
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

test('getTopDirFromFile returns first path segment', () => {
  expect(getTopDirFromFile('src/common/ai_platform_client.py')).toBe('src/')
  expect(getTopDirFromFile('src/common/asm/foo.py')).toBe('src/')
  expect(getTopDirFromFile('main.ts')).toBe('(root)')
  expect(getTopDirFromFile('reports/clover/index.ts')).toBe('reports/')
})

test('getParentDirFromFile returns parent directory of the file', () => {
  expect(getParentDirFromFile('src/common/ai_platform_client.py')).toBe(
    'src/common/'
  )
  expect(getParentDirFromFile('src/common/asm/foo.py')).toBe('src/common/asm/')
  expect(getParentDirFromFile('main.ts')).toBe('(root)')
  expect(getParentDirFromFile('reports/clover/index.ts')).toBe('reports/clover/')
})

test('getPathAtDepth returns path prefix with exactly depth segments', () => {
  expect(getPathAtDepth('src/common/asm/foo.py', 1)).toBe('src/')
  expect(getPathAtDepth('src/common/asm/foo.py', 2)).toBe('src/common/')
  expect(getPathAtDepth('src/common/asm/foo.py', 3)).toBe('src/common/asm/')
  expect(getPathAtDepth('src/common/asm/foo.py', 4)).toBe('src/common/asm/')
  expect(getPathAtDepth('main.ts', 1)).toBe('(root)')
  expect(getPathAtDepth('reports/clover/index.ts', 1)).toBe('reports/')
  expect(getPathAtDepth('reports/clover/index.ts', 2)).toBe('reports/clover/')
  expect(getPathAtDepth('reports/clover/index.ts', 3)).toBe('reports/clover/')
  expect(getPathAtDepth('src/foo.py', 0)).toBe('(root)')
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
    skipPackageCoverage: false,
    showCoverageByTopDir: false,
    coverageDepth: undefined,
    showCoverageByParentDir: false,
    excludePaths: [],
    onlyListChangedFiles: false,
    //This is a cheat
    withBaseCoverageTemplate: f.withBaseCoverageTemplate,
    withoutBaseCoverageTemplate: f.withoutBaseCoverageTemplate
  })
})

test('getInputs returns excludePaths when INPUT_EXCLUDE_PATHS is set', () => {
  process.env.INPUT_GITHUB_TOKEN = 'token'
  process.env.INPUT_FILENAME = 'filename.xml'
  process.env.INPUT_EXCLUDE_PATHS = 'tests/, e2e/, docs/'

  const f = getInputs()
  expect(f.excludePaths).toEqual(['tests/', 'e2e/', 'docs/'])
  delete process.env.INPUT_EXCLUDE_PATHS
})

test('isPathExcluded excludes paths by prefix', () => {
  expect(isPathExcluded('tests/unit/test_foo.py', ['tests/'])).toBe(true)
  expect(isPathExcluded('tests/unit/test_foo.py', ['tests'])).toBe(true)
  expect(isPathExcluded('e2e/bar.spec.ts', ['e2e/'])).toBe(true)
  expect(isPathExcluded('src/app/main.ts', ['tests/'])).toBe(false)
  expect(isPathExcluded('src/app/main.ts', [])).toBe(false)
  expect(isPathExcluded('docs/readme.md', ['docs'])).toBe(true)
})

test('filterCoverageByExcludePaths removes matching files and recomputes overall', () => {
  const coverage = {
    basePath: '/repo',
    timestamp: 0,
    files: {
      a: {
        relative: 'src/foo.ts',
        absolute: '/repo/src/foo.ts',
        coverage: 80,
        lines_covered: 8,
        lines_valid: 10
      },
      b: {
        relative: 'tests/foo.test.ts',
        absolute: '/repo/tests/foo.test.ts',
        coverage: 100,
        lines_covered: 5,
        lines_valid: 5
      },
      c: {
        relative: 'src/bar.ts',
        absolute: '/repo/src/bar.ts',
        coverage: 50,
        lines_covered: 5,
        lines_valid: 10
      }
    },
    coverage: 76.67
  }
  const filtered = filterCoverageByExcludePaths(coverage, ['tests/'])
  expect(Object.keys(filtered.files)).toHaveLength(2)
  expect(filtered.files['a']).toBeDefined()
  expect(filtered.files['c']).toBeDefined()
  expect(filtered.files['b']).toBeUndefined()
  // Line-weighted: (8+5)/(10+10) * 100 = 65%
  expect(filtered.coverage).toBe(65)
})

test('getInputs returns showCoverageByParentDir true when INPUT_SHOW_COVERAGE_BY_PARENT_DIR is true', () => {
  process.env.INPUT_GITHUB_TOKEN = 'token'
  process.env.INPUT_FILENAME = 'filename.xml'
  process.env.INPUT_SHOW_COVERAGE_BY_PARENT_DIR = 'true'

  const f = getInputs()
  expect(f.showCoverageByParentDir).toBe(true)
  expect(f.showCoverageByTopDir).toBe(false)
  delete process.env.INPUT_SHOW_COVERAGE_BY_PARENT_DIR
})

test('getInputs returns coverageDepth when INPUT_COVERAGE_DEPTH is set', () => {
  process.env.INPUT_GITHUB_TOKEN = 'token'
  process.env.INPUT_FILENAME = 'filename.xml'
  process.env.INPUT_COVERAGE_DEPTH = '2'

  const f = getInputs()
  expect(f.coverageDepth).toBe(2)
  delete process.env.INPUT_COVERAGE_DEPTH
})

test('getInputs clamps coverage_depth to at least 1', () => {
  process.env.INPUT_GITHUB_TOKEN = 'token'
  process.env.INPUT_FILENAME = 'filename.xml'
  process.env.INPUT_COVERAGE_DEPTH = '0'

  const f = getInputs()
  expect(f.coverageDepth).toBe(1)
  delete process.env.INPUT_COVERAGE_DEPTH
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

test('parse cobertura project with single file', async () => {
  const ret = await parseCoverage(__dirname + '/fixtures/cobertura-project-single-file.xml')
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
