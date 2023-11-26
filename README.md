# Code Coverage Report

[![ci](https://github.com/tm1000/code-coverage-report-action/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/tm1000/code-coverage-report-action/actions/workflows/ci.yml)

This action looks for a defined `clover` or `cobertura` file and parses that to give you feedback not only about current coverage but also coverage against the base a pull request might be merging into. It uses Github's workflow artifacts to store the raw coverage files for later comparison and it generates a markdown file that is appended to the [job summary](https://github.com/tm1000/code-coverage-report-action/actions/runs/3109427303) and that can also be used in something like [marocchino/sticky-pull-request-comment](https://github.com/marocchino/sticky-pull-request-comment). (See our workflows for examples)

![Example Comment](/images/image1.png?raw=true 'Example Comment')

## Why this action?

I couldn't find any action that did comparisons between branches in a pull request (without committing back to the repository). Plus I like the idea of this being written in typescript which compiles down to javascript since it's supported in all of Github's runner environments

## Usage

#### Default Usage

This example will execute when any pull request is made against the branch `main` or if any code is pushed to the branch `main`. It then uses `marocchino/sticky-pull-request-comment` to post a comment with the coverage back to the Pull Request

**ci.yml**

```yml
name: 'ci'
on:
  pull_request:
    branches:
      - main
  push:
    branches:
      - main

#Cancel previous run multiple runs
concurrency:
  group: ${{ github.ref }}
  cancel-in-progress: true

#https://github.com/marocchino/sticky-pull-request-comment/tree/v2/#basic
permissions: write-all
jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      #Step to generate coverage file
      - name: Generate Coverage Report
        uses: clearlyip/code-coverage-report-action@v4
        id: code_coverage_report_action
        #Dont run for dependabot unless you fix PR comment permissions
        if: ${{ github.actor != 'dependabot[bot]'}}
        with:
          #Location of the generate coverage file
          filename: 'coverage/clover.xml'
          fail_on_negative_difference: true
          artifact_download_workflow_names: 'ci,cron'
      - name: Add Coverage PR Comment
        uses: marocchino/sticky-pull-request-comment@v2
        #Make sure the report was generated and that the event is actually a pull request, run if failed or success
        if: steps.code_coverage_report_action.outputs.file != '' && github.event_name == 'pull_request' && (success() || failure())
        with:
          recreate: true
          path: code-coverage-results.md
```

**cron.yml**

```yml
name: 'cron'
on:
  #Allows for manual runs
  workflow_dispatch:
  #Runs at 00:00, on day 1 of the month (every ~30 days)
  schedule:
    - cron: '0 0 1 * *'

jobs:
  cron:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      #Step to generate coverage file
      - uses: clearlyip/code-coverage-report-action@v4
        with:
          #Location of the generated coverage file
          filename: 'coverage/clover.xml'
```

### Inputs

See [action.yml](action.yml)

### Outputs

The following outputs are returned from the action. You can utilize these outputs in other steps as long as you set an `id` against the step that uses this action (see the `Default Usage` example)

#### file

The generated markdown file path

#### coverage

The overall coverage of the project as a percentage

## Development

### Installation

```shell
npm install
```

### Dev Watch

```shell
make watch
```

### Test Drive using ACT (https://github.com/nektos/act)

```shell
make act
```

### Packaging for marketplace

```shell
make
```

## FAQ

### Artifacts

This action uses artifacts to store the coverage files so they can be referenced later for differences when using pull requests. The benefits of this are that you don't have to run any type of hosted server. However Github has retenion limits on artifacts. As a result there are a couple of things you need to know

#### Retention

Github states the following:

- The retention period for artifacts for public repositories is anywhere **_between 1 day or 90 days_**.
- The retention period for artifacts for private repositories is _**between 1 day or 400 days**_.

As a result of this you will need to setup a job to run that will process your coverage files less than your retention period. Otherwise you wont get diffs when made against branches.

The example below uses two workflow actions. `workflow_dispatch` which allows you to manually run this workflow and `schedule` which is set to run monthly (~30 days).

In the job steps we setup our environment and then we run our test suite which generates our coverage file, then we process this file. Since the event name is not `pull_request` the action simply takes the coverage file and places it inside the artifact

```yml
name: 'cron'
on:
  #Allows for manual runs
  workflow_dispatch:
  #Runs at 00:00, on day 1 of the month (every ~30 days)
  schedule:
    - cron: '0 0 1 * *'

jobs:
  cron:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      #Step to generate coverage file
      - uses: clearlyip/code-coverage-report-action@v4
        with:
          #Location of the generated coverage file
          filename: 'coverage/clover.xml'
```

After this is done you will need to modify any job that uses this action to reference itself and additionally the `cron` workflow above by name using `artifact_download_workflow_names`:

```yml
- uses: clearlyip/code-coverage-report-action@v4
  with:
    filename: 'coverage/clover.xml'
    fail_on_negative_difference: true
    artifact_download_workflow_names: 'ci,cron'
```
