import {
  formatArtifactName,
  checkFileExists,
  createHash,
  roundPercentage,
  determineCommonBasePath,
  escapeRegExp,
  colorizePercentageByThreshold
} from '../src/utils'
import {expect, test} from '@jest/globals'

test('formats the artifact name', async () => {
  process.env.INPUT_GITHUB_TOKEN = 'abc'
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
  //colorizePercentageByThreshold
})
