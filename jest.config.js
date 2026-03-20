module.exports = {
	clearMocks: true,
	moduleFileExtensions: ['js', 'mjs', 'cjs', 'ts', 'json', 'node'],
	testMatch: ['**/*.test.ts'],
	extensionsToTreatAsEsm: ['.ts'],
	transform: {
	  '^.+\\.ts$': ['ts-jest', {
	    useESM: true,
	    tsconfig: 'tsconfig.test.json'
	  }]
	},
	moduleNameMapper: {
	  '^@actions/core$': '<rootDir>/__mocks__/@actions/core.ts',
	  '^@actions/artifact$': '<rootDir>/__mocks__/@actions/artifact.ts',
	  '^@actions/github$': '<rootDir>/__mocks__/@actions/github.ts',
	  '^adm-zip$': '<rootDir>/__mocks__/adm-zip.ts'
	},
	verbose: true,
	collectCoverage: true,
	collectCoverageFrom: ['src/**/*.{js,ts}'],
	coveragePathIgnorePatterns: ['/node_modules/', '<rootDir>/src/main.ts'],
	coverageReporters: ['clover', 'cobertura', ['text', {skipFull: true}]]
  }