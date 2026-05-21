<div align="center">

# code-coverage-report-action

**Parse coverage reports, compare branches, and generate colorized markdown for your PRs.**

[![ci](https://github.com/clearlyip/code-coverage-report-action/actions/workflows/code-coverage-report.yml/badge.svg?branch=main)](https://github.com/clearlyip/code-coverage-report-action/actions/workflows/code-coverage-report.yml)
[![GitHub release](https://img.shields.io/github/v/release/clearlyip/code-coverage-report-action?style=flat-square)](https://github.com/clearlyip/code-coverage-report-action/releases)
[![Node.js](https://img.shields.io/badge/Node.js-24-3c873a?style=flat-square)](https://nodejs.org)
[![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)](LICENSE)

</div>

---

## Overview

This GitHub Action parses **Clover** and **Cobertura** XML coverage files and generates a colorized markdown report. On pull requests, it compares the current coverage against a stored baseline from the target branch, showing per-file differences. Reports are written to the [job summary](https://docs.github.com/en/actions/managing-workflow-runs/viewing-a-summary-of-a-workflow-run) and can be posted as a PR comment using an action like [marocchino/sticky-pull-request-comment](https://github.com/marocchino/sticky-pull-request-comment).

Baseline coverage is stored as GitHub workflow artifacts, so no external server or database is needed.

![Example report](/images/image1.png?raw=true)

## Features

- **Clover & Cobertura** -- auto-detects and parses both XML coverage formats
- **Branch comparison** -- compares PR head coverage against a baseline artifact from the base branch
- **Colorized reports** -- per-file coverage with green/orange/red indicators based on configurable thresholds
- **Job summary & PR comments** -- writes to GitHub's job summary and generates a markdown file for PR comment actions
- **Failure gates** -- configurable thresholds to fail the workflow on coverage drops or low overall coverage
- **Flexible aggregation** -- per-file, by top-level directory, by parent directory, or by configurable path depth
- **Path exclusion** -- exclude directories from coverage calculations
- **Custom templates** -- bring your own Handlebars templates for full report customization
- **Shields.io badge** -- optional inline coverage badge in the generated report

## Quick start

### 1. Upload a baseline on push

Run this action on pushes to your default branch so that a baseline artifact is available for PR comparisons.

```yaml
name: 'coverage-baseline'
on:
  push:
    branches: [main]

jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test -- --coverage
      - uses: clearlyip/code-coverage-report-action@v7
        with:
          filename: coverage/clover.xml
```

### 2. Compare on pull requests

```yaml
name: 'ci'
on:
  pull_request:
    branches: [main]

permissions:
  pull-requests: write
  contents: read

jobs:
  coverage:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test -- --coverage
      - uses: clearlyip/code-coverage-report-action@v7
        id: coverage
        with:
          filename: coverage/clover.xml
          fail_on_negative_difference: true
          overall_coverage_fail_threshold: 70
          artifact_download_workflow_names: 'coverage-baseline'
      - name: Post Coverage Comment
        uses: marocchino/sticky-pull-request-comment@v3
        if: steps.coverage.outputs.file != '' && (success() || failure())
        with:
          recreate: true
          path: code-coverage-results.md
```

## Inputs

| Input | Required | Default | Description |
| --- | --- | --- | --- |
| `filename` | yes | -- | Path to the coverage XML file (Clover or Cobertura) |
| `github_token` | no | `${{ github.token }}` | GitHub token (needed for private repos) |
| `markdown_filename` | no | `code-coverage-results` | Output markdown filename (without `.md` extension) |
| `badge` | no | `false` | Include a shields.io coverage badge in the report |
| `overall_coverage_fail_threshold` | no | `0` | Fail if overall coverage falls below this percentage |
| `file_coverage_error_min` | no | `50` | Coverage below this is marked red |
| `file_coverage_warning_max` | no | `75` | Coverage below this is marked orange; above is green |
| `fail_on_negative_difference` | no | `false` | Fail if any file's coverage decreases |
| `negative_difference_by` | no | `package` | How to evaluate negative difference: `overall` or `package` |
| `negative_difference_threshold` | no | `0` | Allowed coverage drop percentage (e.g. `-2` means 2% drop is OK) |
| `artifact_download_workflow_names` | no | current job | Comma-separated workflow names to search for baseline artifacts |
| `artifact_name` | no | `coverage-%name%` | Artifact name pattern (%name% is replaced with the branch name) |
| `retention_days` | no | -- | Artifact retention period in days |
| `show_coverage_by_top_dir` | no | `false` | Aggregate coverage by first path segment |
| `coverage_depth` | no | -- | Aggregate by path to the specified depth |
| `show_coverage_by_parent_dir` | no | `false` | Aggregate by each file's parent directory |
| `only_list_changed_files` | no | `false` | Only show files whose coverage changed |
| `exclude_paths` | no | -- | Comma-separated path prefixes to exclude from the report |
| `with_base_coverage_template` | no | -- | Path to a custom Handlebars template for reports with baseline |
| `without_base_coverage_template` | no | -- | Path to a custom Handlebars template for reports without baseline |

## Outputs

| Output | Description |
| --- | --- |
| `file` | Path to the generated markdown file |
| `coverage` | Overall coverage percentage |

## How it works

The action behaves differently depending on the GitHub event:

1. **`push` / `schedule` / `workflow_dispatch`** -- parses the coverage file, generates a report, and uploads the coverage file as an artifact keyed by branch name. This serves as the baseline for future PR comparisons.

2. **`pull_request`** -- downloads the baseline artifact from the target branch, parses both the baseline and current coverage files, computes per-file differences, generates a comparison report, and writes it to the job summary.

### Artifact retention

GitHub artifacts have a limited retention period (1-90 days for public repos, 1-400 days for private repos). To ensure baselines are available, schedule a periodic run on your default branch:

```yaml
name: 'coverage-refresh'
on:
  workflow_dispatch:
  schedule:
    - cron: '0 0 1 * *'  # Monthly

jobs:
  refresh:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test -- --coverage
      - uses: clearlyip/code-coverage-report-action@v7
        with:
          filename: coverage/clover.xml
```

> [!IMPORTANT]
> Set `artifact_download_workflow_names` in your PR workflow to include the name of this refresh workflow so the action can find the baseline artifact.

## Development

```bash
npm install
```

### Build

```bash
make build
```

### Watch mode

```bash
make watch
```

### Test

```bash
make test
```

### Local testing with [act](https://github.com/nektos/act)

```bash
make act
```

## FAQ

### Why artifacts instead of storing coverage in the repo?

Artifacts avoid polluting your git history with coverage data. The trade-off is that GitHub's artifact retention is limited, so you need a periodic refresh job on your default branch (see above).

### Can I use this with any language?

Yes. The action only cares about the XML coverage file. Any tool that produces Clover or Cobertura output (Jest, Istanbul, PHPUnit, OpenCover, etc.) will work.

### How do I customize the report format?

Use the `with_base_coverage_template` and `without_base_coverage_template` inputs to provide your own Handlebars templates. See the [default templates](templates/) for reference.
