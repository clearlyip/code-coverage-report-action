/**
 * ESM TypeScript stub for adm-zip.
 *
 * moduleNameMapper redirects 'adm-zip' here so Jest resolves it to a local
 * .ts file before the module graph is built, ensuring the mock is always in
 * place even when utils.ts imports adm-zip via a static import chain.
 *
 * The default mockImplementation returns an object with extractAllTo: jest.fn()
 * so utils.ts's downloadArtifacts does not throw when it extracts archives.
 */

import { jest } from '@jest/globals'

const AdmZip = jest.fn().mockImplementation(() => ({
  extractAllTo: jest.fn()
}))

export default AdmZip
