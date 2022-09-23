# Code Coverage Report

[![ci](https://github.com/tm1000/code-coverage-report-action/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/tm1000/code-coverage-report-action/actions/workflows/ci.yml)

This action looks for a defined `clover` or `cobertura` file and parses that to give you feedback not only about current coverage but also coverage against the base a pull request might be merging into. It uses Github's workflow artifacts to store the raw coverage files for later comparison and it generates a markdown file that is appended to the [job summary](https://github.com/tm1000/code-coverage-report-action/actions/runs/3109427303) and that can also be used in something like [marocchino/sticky-pull-request-comment](https://github.com/marocchino/sticky-pull-request-comment). (See our workflows for examples)

![Example Comment](/images/image1.png?raw=true "Example Comment")

## Why this action?

I couldn't find any action that did comparisons between branches in a pull request (without commiting back to the repository). Plus I like the idea of this being written in typescript which compiles down to javascript since it's supported in all of Github's runner environments

## Usage

#### Default Usage
This example will execute when any pull request is made against the branch `main` or if any code is pushed to the branch `main`. It then uses `marocchino/sticky-pull-request-comment` to post a comment with the coverage back to the Pull Request

```yml
name: 'ci'
on:
  pull_request:
    branches:
      - main
  push:
    branches:
      - main

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - run: npm run test
      - uses: tm1000/code-coverage-report-action@v1.0.0
        id: code_coverage_report_action
        with:
          filename: 'coverage/clover.xml'
          fail_on_negative_difference: true
          artifact_download_workflow_names: 'ci,cron'
      - name: Add Coverage PR Comment
        uses: marocchino/sticky-pull-request-comment@v2
        if: steps.code_coverage_report_action.outputs.file != '' && github.event_name == 'pull_request' && (success() || failure())
        with:
          recreate: true
          path: code-coverage-results.md
```

### Inputs

See [action.yml](action.yml)

### Outputs

The following outputs are returned from the action. You can utilize these outputs in other steps as long as you set an `id` against the step that uses this action (see the `Default Usage` example)

#### file

The generated markdown file path

#### coverage

The overall coverage of the project as a percentage