module.exports = {
	clearMocks: true,
	resetModules: true,
	moduleFileExtensions: ['js', 'ts'],
	testMatch: ['**/*.test.ts'],
	transform: {
	  '^.+\\.ts$': ['ts-jest', {
	    tsconfig: 'tsconfig.test.json'
	  }]
	},
	moduleNameMapper: {
	  '^@actions/core$': '<rootDir>/__mocks__/@actions/core.js',
	  '^@actions/artifact$': '<rootDir>/__mocks__/@actions/artifact.js',
	  '^@actions/github$': '<rootDir>/__mocks__/@actions/github.js'
	},
	verbose: true,
	collectCoverage: true,
	collectCoverageFrom: ['src/**/*.{js,ts}'],
	coveragePathIgnorePatterns: ['/node_modules/', '<rootDir>/src/main.ts'],
	coverageReporters: ['clover', 'cobertura', ['text', {skipFull: true}]]
  }