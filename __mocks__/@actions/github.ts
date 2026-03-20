/**
 * ESM TypeScript stub for @actions/github.
 *
 * moduleNameMapper redirects '@actions/github' here so Jest's resolver always
 * finds a local .ts file instead of the ESM-only npm package.
 * getOctokit is exported as jest.fn() so tests can call .mockReturnValue()
 * without needing per-test jest.mock factories.
 */

import { jest } from '@jest/globals'

export const getOctokit = jest.fn()

export const context = {
  job: 'test-job',
  runId: 0,
  runNumber: 0,
  actor: '',
  workflow: '',
  action: '',
  eventName: '',
  ref: '',
  sha: '',
  repo: { owner: '', repo: '' },
  issue: { owner: '', repo: '', number: 0 },
  payload: {} as Record<string, unknown>
}
