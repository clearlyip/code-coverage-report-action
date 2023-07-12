import * as core from '@actions/core'
import {
  checkFileExists,
  colorizePercentageByThreshold,
  downloadArtifacts,
  getInputs,
  parseCoverage,
  roundPercentage,
  uploadArtifacts
} from './utils'
import {Coverage} from './interfaces'
import {writeFile} from 'fs/promises'
import path from 'path'

async function run(): Promise<void> {
  try {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } catch (err: any) {
    core.setFailed(err.message)
  }
}

async function generateMarkdown(
  headCoverage: Coverage,
  baseCoverage: Coverage | null = null
): Promise<void> {
  const {
    overallCoverageFailThreshold,
    failOnNegativeDifference,
    fileCoverageErrorMin,
    fileCoverageWarningMax,
    badge,
    markdownFilename,
    diffOverallCoverage
  } = getInputs()
  core.info(`diffOverallCoverage: ${diffOverallCoverage}`)

  const map = Object.entries(headCoverage.files).map(([hash, file]) => {
    if (baseCoverage === null) {
      return [
        file.relative,
        `${colorizePercentageByThreshold(
          file.coverage,
          fileCoverageWarningMax,
          fileCoverageErrorMin
        )}`
      ]
    }

    const baseCoveragePercentage = baseCoverage.files[hash]
      ? baseCoverage.files[hash].coverage
      : null

    const differencePercentage = baseCoveragePercentage
      ? roundPercentage(file.coverage - baseCoveragePercentage)
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
      `${colorizePercentageByThreshold(
        baseCoveragePercentage,
        fileCoverageWarningMax,
        fileCoverageErrorMin
      )}`,
      `${colorizePercentageByThreshold(
        file.coverage,
        fileCoverageWarningMax,
        fileCoverageErrorMin
      )}`,
      colorizePercentageByThreshold(differencePercentage)
    ]
  })

  if (overallCoverageFailThreshold > headCoverage.coverage) {
    core.setFailed(
      `FAIL: Overall coverage of ${headCoverage.coverage.toString()}% below minimum threshold of ${overallCoverageFailThreshold.toString()}%`
    )
  }

  let color = 'grey'
  if (headCoverage.coverage < fileCoverageErrorMin) {
    color = 'red'
  } else if (
    headCoverage.coverage > fileCoverageErrorMin &&
    headCoverage.coverage < fileCoverageWarningMax
  ) {
    color = 'orange'
  } else if (headCoverage.coverage > fileCoverageWarningMax) {
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
          {data: 'Base Coverage', header: true},
          {data: 'New Coverage', header: true},
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

  if (diffOverallCoverage === true) {
    core.info(`diffOverallCoverage: ${diffOverallCoverage}`)
    const overallDiffPercentage = baseCoverage
      ? roundPercentage(headCoverage.coverage - baseCoverage.coverage)
      : null

    if (
      failOnNegativeDifference &&
      overallDiffPercentage !== null &&
      overallDiffPercentage < 0
    ) {
      core.setFailed(
        `Overall coverage difference was ${overallDiffPercentage}%`
      )
    }

    core.info(`diffOverallCoverage: ${overallDiffPercentage}`)
    const overallResults = [
      {data: 'Base Coverage', header: true},
      {data: 'New Coverage', header: true},
      {data: 'Difference', header: true},
      {
        data: `${colorizePercentageByThreshold(
          baseCoverage ? baseCoverage.coverage : null,
          headCoverage.coverage,
          overallDiffPercentage
        )}`
      }
    ]

    core.info(`diffOverallCoverage: ${overallResults}`)
    summary.addTable([overallResults]).addBreak()
  }
  summary
    .addTable([headers, ...map])
    .addBreak()
    .addRaw(
      `<i>Minimum allowed coverage is</i> <code>${overallCoverageFailThreshold}%</code>, this run produced</i> <code>${headCoverage.coverage}%</code>`
    )

  //If this is run after write the buffer is empty
  core.info(`Writing results to ${markdownFilename}.md`)
  await writeFile(`${markdownFilename}.md`, summary.stringify())
  core.setOutput('file', `${markdownFilename}.md`)
  core.setOutput('coverage', headCoverage.coverage)

  core.info(`Writing job summary`)
  await summary.write()
}

run()
