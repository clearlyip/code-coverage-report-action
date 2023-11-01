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
import {
  Coverage,
  HandlebarContext,
  HandlebarContextCoverage
} from './interfaces'
import {writeFile} from 'fs/promises'
import path from 'path'
import * as handlebars from 'handlebars'
import {readFile} from 'node:fs/promises'

async function run(): Promise<void> {
  try {
    const filename = core.getInput('filename')

    if (!(await checkFileExists(filename))) {
      core.setFailed(`Unable to access ${filename}`)
      return
    }

    core.debug(`filename: ${filename}`)

    switch (process.env.GITHUB_EVENT_NAME) {
      case 'pull_request': {
        const {GITHUB_BASE_REF = ''} = process.env
        core.debug(`GITHUB_BASE_REF: ${GITHUB_BASE_REF}`)
        const artifactPath = await downloadArtifacts(GITHUB_BASE_REF)
        core.debug(`artifactPath: ${artifactPath}`)
        const baseCoverage =
          artifactPath !== null
            ? await parseCoverage(path.join(artifactPath, filename))
            : null

        core.info(`Parsing coverage file: ${filename}...`)
        const headCoverage = await parseCoverage(filename)

        if (headCoverage === null) {
          core.setFailed(`Unable to process ${filename}`)
          return
        }

        core.info(`Complete`)

        //Base doesn't have an artifact
        if (baseCoverage === null) {
          core.warning(
            `${GITHUB_BASE_REF} is missing ${filename}. See documentation on how to add this`
          )

          core.info(`Generating markdown from ${headCoverage.basePath}...`)
          await generateMarkdown(headCoverage)
          core.info(`Complete`)

          return
        }

        core.info(
          `Generating markdown between ${headCoverage.basePath} and ${baseCoverage.basePath}...`
        )
        await generateMarkdown(headCoverage, baseCoverage)
        core.info(`Complete`)
        break
      }
      case 'push':
      case 'schedule':
      case 'workflow_dispatch':
        {
          const {GITHUB_REF_NAME = ''} = process.env
          core.info(`Uploading ${filename}...`)
          await uploadArtifacts([filename], GITHUB_REF_NAME)
          core.debug(
            `GITHUB_REF_NAME: ${GITHUB_REF_NAME}, filename: ${filename}`
          )
          core.info(`Complete`)

          core.info(`Parsing coverage file: ${filename}...`)
          const headCoverage = await parseCoverage(filename)
          core.info(`Complete`)

          if (headCoverage != null) {
            core.info(`Generating markdown from ${headCoverage.basePath}...`)
            await generateMarkdown(headCoverage)
            core.info(`Complete`)
          }
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
    negativeDifferenceBy,
    withBaseCoverageTemplate,
    withoutBaseCoverageTemplate
  } = getInputs()
  const overallDifferencePercentage = baseCoverage
    ? roundPercentage(headCoverage.coverage - baseCoverage.coverage)
    : null

  core.debug(`headCoverage: ${headCoverage.coverage}`)
  core.debug(`baseCoverage: ${baseCoverage?.coverage}`)
  core.debug(`overallDifferencePercentage: ${overallDifferencePercentage}`)

  if (
    failOnNegativeDifference &&
    negativeDifferenceBy === 'overall' &&
    overallDifferencePercentage !== null &&
    overallDifferencePercentage < 0 &&
    baseCoverage
  ) {
    core.setFailed(
      `FAIL: Overall coverage of dropped ${overallDifferencePercentage}%, from ${baseCoverage.coverage}% to ${headCoverage.coverage}%.`
    )
  }

  if (overallCoverageFailThreshold > headCoverage.coverage) {
    core.setFailed(
      `FAIL: Overall coverage of ${headCoverage.coverage.toString()}% below minimum threshold of ${overallCoverageFailThreshold.toString()}%.`
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

  const templatePath =
    baseCoverage === null
      ? withoutBaseCoverageTemplate
      : withBaseCoverageTemplate

  if (!(await checkFileExists(templatePath))) {
    core.setFailed(`Unable to access template ${templatePath}`)
    return
  }

  const contents = await readFile(templatePath, {
    encoding: 'utf8'
  })
  const compiledTemplate = handlebars.compile(contents)

  const context: HandlebarContext = {
    minimum_allowed_coverage: `${overallCoverageFailThreshold}%`,
    new_coverage: `${headCoverage.coverage}%`,
    coverage: Object.entries(headCoverage.files)
      .map(([hash, file]) => {
        if (baseCoverage === null) {
          return {
            package: file.relative,
            base_coverage: `${colorizePercentageByThreshold(
              file.coverage,
              fileCoverageWarningMax,
              fileCoverageErrorMin
            )}`
          }
        }

        const baseCoveragePercentage = baseCoverage.files[hash]
          ? baseCoverage.files[hash].coverage
          : 0

        const differencePercentage = baseCoveragePercentage
          ? roundPercentage(file.coverage - baseCoveragePercentage)
          : roundPercentage(file.coverage)

        if (
          failOnNegativeDifference &&
          negativeDifferenceBy === 'package' &&
          differencePercentage !== null &&
          differencePercentage < 0
        ) {
          core.setFailed(
            `${headCoverage.files[hash].relative} coverage difference was ${differencePercentage}%`
          )
        }

        return {
          package: file.relative,
          base_coverage: `${colorizePercentageByThreshold(
            baseCoveragePercentage,
            fileCoverageWarningMax,
            fileCoverageErrorMin
          )}`,
          new_coverage: `${colorizePercentageByThreshold(
            file.coverage,
            fileCoverageWarningMax,
            fileCoverageErrorMin
          )}`,
          difference: colorizePercentageByThreshold(differencePercentage)
        }
      })
      .sort((a, b) =>
        a.package < b.package ? -1 : a.package > b.package ? 1 : 0
      ),
    overall_coverage: addOverallRow(headCoverage, baseCoverage)
  }

  if (badge) {
    context.coverage_badge = `https://img.shields.io/badge/${encodeURIComponent(
      `Code Coverage-${headCoverage.coverage}%-${color}?style=for-the-badge`
    )}`
  }

  const markdown = compiledTemplate(context)

  const summary = core.summary.addRaw(markdown)

  //If this is run after write the buffer is empty
  core.info(`Writing results to ${markdownFilename}.md`)
  await writeFile(`${markdownFilename}.md`, summary.stringify())
  core.setOutput('file', `${markdownFilename}.md`)
  core.setOutput('coverage', headCoverage.coverage)

  core.info(`Writing job summary`)
  await summary.write()
}

/**
 * Generate overall coverage row
 */
function addOverallRow(
  headCoverage: Coverage,
  baseCoverage: Coverage | null = null
): HandlebarContextCoverage {
  const {overallCoverageFailThreshold} = getInputs()

  const overallDifferencePercentage = baseCoverage
    ? roundPercentage(headCoverage.coverage - baseCoverage.coverage)
    : null

  if (baseCoverage === null) {
    return {
      package: 'Overall Coverage',
      base_coverage: `${colorizePercentageByThreshold(
        headCoverage.coverage,
        0,
        overallCoverageFailThreshold
      )}`
    }
  }

  return {
    package: 'Overall Coverage',
    base_coverage: `${colorizePercentageByThreshold(
      baseCoverage.coverage,
      0,
      overallCoverageFailThreshold
    )}`,
    new_coverage: `${colorizePercentageByThreshold(
      headCoverage.coverage,
      0,
      overallCoverageFailThreshold
    )}`,
    difference: `${colorizePercentageByThreshold(overallDifferencePercentage)}`
  }
}

run()
