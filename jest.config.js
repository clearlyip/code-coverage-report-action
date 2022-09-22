module.exports = {
	clearMocks: true,
	moduleFileExtensions: ['js', 'ts'],
	testMatch: ['**/*.test.ts'],
	transform: {
	  '^.+\\.ts$': 'ts-jest'
	},
	verbose: true,
	collectCoverage: true,
	collectCoverageFrom: ['src/**/*.{js,ts}'],
	coverageReporters: ['clover']
  }