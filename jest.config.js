module.exports = {
	clearMocks: true,
	resetModules: true,
	moduleFileExtensions: ['js', 'ts'],
	testMatch: ['**/*.test.ts'],
	transform: {
	  '^.+\\.ts$': 'ts-jest'
	},
	verbose: true,
	collectCoverage: true,
	collectCoverageFrom: ['src/**/*.{js,ts}'],
	coveragePathIgnorePatterns: ['/node_modules/', '<rootDir>/src/main.ts'],
	coverageReporters: ['clover', 'cobertura', ['text', {skipFull: true}]]
  }