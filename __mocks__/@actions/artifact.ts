/**
 * ESM TypeScript stub for @actions/artifact.
 *
 * moduleNameMapper redirects '@actions/artifact' here so Jest's resolver
 * always finds a local .ts file instead of the ESM-only npm package.
 * DefaultArtifactClient is exported as jest.fn() so tests can call
 * .mockImplementation() on it without needing per-test jest.mock factories.
 */

import { jest } from '@jest/globals'

export const DefaultArtifactClient = jest.fn()
