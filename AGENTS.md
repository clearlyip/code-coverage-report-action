# AGENTS.md

## Project Overview

**code-coverage-report-action** is a GitHub Action that parses XML code coverage reports (Clover and Cobertura formats), compares branch coverage against a stored baseline, and generates colorized markdown reports for pull requests. It writes reports to the GitHub job summary and can optionally post them as PR comments.

On `push`/`schedule`/`workflow_dispatch` events, it uploads coverage as a GitHub artifact (baseline). On `pull_request` events, it downloads the baseline from the target branch, computes per-file differences, and generates a comparison report.

### Architecture

```
src/
  main.ts                          # Entry point -- calls run()
  functions.ts                     # Core logic: generateMarkdown, buildCoverageRows, aggregation
  utils.ts                         # XML parsing, artifact download/upload, input handling, colorization
  interfaces.ts                    # TypeScript interfaces
  reports/
    clover/parser/                 # Clover XML parser
    cobertura/parser/              # Cobertura XML parser
templates/
  with-base-coverage.hbs           # PR comparison report template
  without-base-coverage.hbs        # Standalone report template
```

### Tech Stack

- **Language**: TypeScript (targeting Node.js 24)
- **Runtime**: Node.js 24 (`using: 'node24'` in action.yml)
- **Build**: `@vercel/ncc` bundles TypeScript into a single `dist/index.js`
- **Package manager**: npm
- **Testing**: Jest with ts-jest (ESM mode)
- **Linting**: ESLint with `eslint-plugin-github` and Prettier

## Setup Commands

```bash
npm ci              # Install dependencies
```

## Development Workflow

```bash
npm run package     # Build dist/index.js
npm run watch       # Watch mode for iterative development
npm run lint        # Run ESLint
npm run lint:fix    # Run ESLint with auto-fix
npm run all         # Full pipeline: lint, build, test
```

Makefile aliases are also available:

```bash
make build          # Equivalent to npm run package
make test           # Equivalent to npm run test
make watch          # Equivalent to npm run watch
make lint-fix       # Equivalent to npm run lint:fix
```

## Testing Instructions

```bash
npm test                        # Run all tests
npm test -- --testPathPattern=functions  # Run specific test file
```

Tests use Jest with ESM mode (`NODE_OPTIONS=--experimental-vm-modules`). Coverage is collected from `src/**/*.{js,ts}` (excluding `src/main.ts`) and reported in Clover, Cobertura, and text formats.

Test fixtures are in `__tests__/fixtures/`. Mocks for `@actions/core`, `@actions/artifact`, `@actions/github`, and `adm-zip` live in `__mocks__/`. Snapshot tests are used in `functions.test.ts`.

### Local testing with act

```bash
make act-pull_request   # Simulate pull_request event locally
make act-push           # Simulate push event locally
make act-schedule       # Simulate schedule event locally
```

Requires `gh`, `act`, and `glow` CLI tools installed.

## Code Style

- **TypeScript**: Strict mode, `module: ESNext`, `moduleResolution: Bundler`
- **Linting**: ESLint flat config via `eslint-plugin-github` + Prettier
- **Prettier settings**: single quotes, no trailing commas, 80-char print width, spaces (not tabs)
- **ESLint ignores**: `dist/`, `lib/`, `node_modules/`, `__tests__/`, `__mocks__/`, `jest.config.js`
- Run `npm run lint` before committing; use `npm run lint:fix` for auto-fixes

## Build and Deployment

Build bundles `src/main.ts` and all dependencies into `dist/index.js`:

```bash
npm run package
```

The action runs `dist/index.js` on Node.js 24. It is distributed as a GitHub Action release (e.g., `@v7`). The action is self-hosted -- it generates its own Clover/Cobertura coverage from its test suite and uploads it as a baseline artifact.

## CI/CD

Two workflows in `.github/workflows/`:

- **`code-coverage-report.yml`**: Runs on `push` to `main`, monthly schedule, and `workflow_dispatch`. Establishes the baseline coverage artifact.
- **`pr.yml`**: Runs on `pull_request` to `main`. Executes lint, test, and package checks. Runs the action with `fail_on_negative_difference: true` and `overall_coverage_fail_threshold: 70`.

## Important Patterns

1. **ESM-first**: The project uses `NODE_OPTIONS=--experimental-vm-modules` for Jest. Mocks must be compatible with ESM.
2. **Complex mocking in `run.test.ts`**: Uses `jest.unstable_mockModule` with closures to pass real utility functions into mocks, avoiding circular dependencies in ESM mode.
3. **Coverage hashing**: Files are identified by SHA-256 hash of their relative path, not by path directly.
4. **Artifact-based baselines**: Coverage data is stored as GitHub workflow artifacts, not in the repo. Baselines expire per repository retention settings.
5. **`@actions/core` mock**: The mock in `__mocks__/@actions/core.ts` fully implements real behavior (writing `::command::message` to stdout, handling `GITHUB_STEP_SUMMARY`), so snapshot tests capture realistic output.
6. **Template resolution**: Default templates are resolved relative to `__dirname` in the compiled `dist/` directory. Custom templates can be provided via action inputs.

## Pull Request Guidelines

- Run `npm run all` (lint, build, test) before committing
- Update snapshots if output format changes: `npm test -- -u`
- Include tests for new functionality
- Dependabot PRs skip the coverage report step
