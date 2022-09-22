import * as core from '@actions/core'
import {
  checkFileExists,
  colorizePercentageByThreshold,
  downloadArtifacts,
  getInputs,
  parseCoverage,
  uploadArtifacts
} from './utils'
import {Coverage} from './interfaces'
import {writeFile} from 'fs/promises'
import path from 'path'

async function run(): Promise<void> {
  const filename = core.getInput('filename')

  if (!(await checkFileExists(filename))) {
    core.setFailed(`Unable to access ${filename}`)
    return
  }

  switch (process.env.GITHUB_EVENT_NAME) {
    case 'pull_request': {
      const {GITHUB_BASE_REF = ''} = process.env
      const artifactPath = await downloadArtifacts(GITHUB_BASE_REF)
      const baseCoverage =
        artifactPath !== null
          ? await parseCoverage(path.join(artifactPath, filename))
          : null
      const headCoverage = await parseCoverage(filename)

      if (headCoverage === null) {
        core.setFailed(`Unable to process ${filename}`)
        return
      }

      //Base doesnt have an artifact
      if (baseCoverage === null) {
        core.warning(
          `${GITHUB_BASE_REF} is missing ${filename}. See documentation on how to add this`
        )
        await generateMarkdown(headCoverage)
        return
      }

      await generateMarkdown(headCoverage, baseCoverage)
      break
    }
    case 'push':
    case 'schedule':
    case 'workflow_dispatch':
      {
        const {GITHUB_REF_NAME = ''} = process.env
        core.info(`Uploading ${filename}`)
        await uploadArtifacts([filename], GITHUB_REF_NAME)
        core.info(`Complete`)
      }
      break
    default:
    //TODO: return something here
  }
}

async function generateMarkdown(
  headCoverage: Coverage,
  baseCoverage: Coverage | null = null
): Promise<void> {
  const {
    overallFailThreshold,
    failOnNegativeDifference,
    coverageColorRedMin,
    coverageColorOrangeMax,
    badge
  } = getInputs()
  const map = Object.entries(headCoverage.files).map(([hash, file]) => {
    if (baseCoverage === null) {
      return [
        file.relative,
        `${colorizePercentageByThreshold(file.coverage, 50, 'green')}`
      ]
    }

    const baseCoveragePercentage =
      baseCoverage.files[hash] !== null
        ? baseCoverage.files[hash].coverage
        : null

    const differencePercentage =
      baseCoverage.files[hash] !== null
        ? headCoverage.files[hash].coverage - baseCoverage.files[hash].coverage
        : null

    if (
      failOnNegativeDifference &&
      differencePercentage !== null &&
      differencePercentage < 0
    ) {
      core.setFailed(
        `${headCoverage.files[hash].relative} coverage difference was ${differencePercentage}%`
      )
    }

    return [
      file.relative,
      `${colorizePercentageByThreshold(file.coverage, 50, 'green')}`,
      `${colorizePercentageByThreshold(baseCoveragePercentage, 50, 'green')}`,
      colorizePercentageByThreshold(differencePercentage)
    ]
  })

  if (overallFailThreshold > headCoverage.coverage) {
    core.setFailed(
      `FAIL: Overall coverage of ${headCoverage.coverage.toString()}% below minimum threshold of ${overallFailThreshold.toString()}%`
    )
  }

  let color = 'grey'
  if (headCoverage.coverage < coverageColorRedMin) {
    color = 'red'
  } else if (
    headCoverage.coverage > coverageColorRedMin &&
    headCoverage.coverage < coverageColorOrangeMax
  ) {
    color = 'yellow'
  } else if (headCoverage.coverage > coverageColorOrangeMax) {
    color = 'green'
  }

  const summary = core.summary.addHeading('Code Coverage Report')

  const headers =
    baseCoverage === null
      ? [
          {data: 'Package', header: true},
          {data: 'Coverage', header: true}
        ]
      : [
          {data: 'Package', header: true},
          {data: 'Coverage', header: true},
          {data: 'Coverage', header: true},
          {data: 'Difference', header: true}
        ]

  if (badge) {
    summary.addImage(
      `https://img.shields.io/badge/${encodeURIComponent(
        `Code Coverage-${headCoverage.coverage}%-${color}`
      )}?style=flat`,
      'Code Coverage'
    )
  }
  summary
    .addTable([headers, ...map])
    .addBreak()
    .addRaw(
      `<i>Minimum allowed coverage is</i> <code>${overallFailThreshold}%</code>, this run produced</i> <code>${headCoverage.coverage}%</code>`
    )

  //If this is run after write the buffer is empty
  core.info(`Writing results`)
  await writeFile('code-coverage-results.md', summary.stringify())

  if (
    process.env.GITHUB_STEP_SUMMARY &&
    process.env.GITHUB_STEP_SUMMARY !== ''
  ) {
    core.info(`Writing summary`)
    await summary.write()
  }
}

run()
