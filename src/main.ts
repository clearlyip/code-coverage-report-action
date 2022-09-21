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

async function run(): Promise<void> {
  const filename = core.getInput('filename')

  if (!(await checkFileExists(filename))) {
    core.setFailed(`Unable to access ${filename}`)
    return
  }

  switch (process.env.GITHUB_EVENT_NAME) {
    case 'pull_request': {
      const {GITHUB_BASE_REF = ''} = process.env
      const coverage = await downloadArtifacts(GITHUB_BASE_REF)
      const baseCoverage =
        coverage !== null
          ? await parseCoverage(`${coverage.downloadPath}/${filename}`)
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
    const differencePercentage =
      baseCoverage !== null && baseCoverage.files[hash] !== null
        ? headCoverage.files[hash].coverage - baseCoverage.files[hash].coverage
        : null

    if (
      failOnNegativeDifference &&
      differencePercentage !== null &&
      differencePercentage < 0
    ) {
      core.setFailed(
        `${headCoverage.files[hash].relative} coverage difference was negative`
      )
    }

    return [
      file.relative,
      `${colorizePercentageByThreshold(file.coverage, 50, 'green')}`,
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

  if (badge) {
    summary.addImage(
      `https://img.shields.io/badge/${encodeURIComponent(
        `Code Coverage-${headCoverage.coverage}%-${color}`
      )}?style=flat`,
      'Code Coverage'
    )
  }
  summary
    .addTable([
      [
        {data: 'Package', header: true},
        {data: 'Coverage', header: true},
        {data: 'Difference', header: true}
      ],
      ...map
    ])
    .addBreak()
    .addRaw(
      `_Minimum allowed coverage is \`${overallFailThreshold}%\`, this run produced \`${headCoverage.coverage}%\`_`
    )

  if (
    process.env.GITHUB_STEP_SUMMARY &&
    process.env.GITHUB_STEP_SUMMARY !== ''
  ) {
    await summary.write()
  }

  core.info(`Writing results: ${__dirname}/code-coverage-results.md`)
  await writeFile(`${__dirname}/code-coverage-results.md`, summary.stringify())
}

run()
