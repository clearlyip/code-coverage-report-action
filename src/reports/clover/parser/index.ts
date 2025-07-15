import { Clover, File, FileMetrics, Package } from '../types';
import { Coverage, Files } from '../../../interfaces';
import {
  determineCommonBasePath,
  roundPercentage,
  createHash,
  escapeRegExp
} from '../../../utils';

export default async function parse(clover: Clover): Promise<Coverage> {
  const { metrics, '@_timestamp': timestamp } = clover.coverage.project;

  let files: Files = {};
  if (clover.coverage.project.package) {
    files = {
      ...files,
      ...(await parsePackages(clover.coverage.project.package))
    };
  }
  if (clover.coverage.project.file) {
    files = { ...files, ...(await parseFiles(clover.coverage.project.file)) };
  }

  const fileList = Object.values(files).map((file) => file.absolute);
  const basePath = `${determineCommonBasePath(fileList)}`;
  const regExp = new RegExp(`^${escapeRegExp(`${basePath}/`)}`);

  return {
    files: Object.entries(files).reduce((previous, [, file]) => {
      file.relative = file.absolute.replace(regExp, '');
      return { ...previous, [createHash(file.relative)]: file };
    }, {}),
    coverage: processCoverageMetrics(metrics),
    timestamp: parseInt(timestamp),
    basePath
  };
}

/**
 * Parse Packages
 *
 * @param {Package[]} packages
 * @returns {Promise<Files>}
 */
async function parsePackages(packages: Package[]): Promise<Files> {
  let allFiles: Files = {};
  for await (const p of packages) {
    if (!p.file) {
      continue;
    }
    const files = await parseFiles(p.file);
    allFiles = { ...allFiles, ...files };
  }
  return allFiles;
}

/**
 * Process into an object
 *
 * @param {File[]|undefined|null} files
 * @returns {Promise<Files>}
 */
async function parseFiles(files: File[] | undefined | null): Promise<Files> {
  if (!files) {
    return {};
  }
  return files.reduce(
    (
      previous,
      { '@_name': name, metrics: fileMetrics, '@_path': path }: File
    ) => ({
      ...previous,
      [createHash(path ?? name)]: {
        relative: path ?? name,
        absolute: path ?? name,
        coverage: processCoverageMetrics(fileMetrics)
      }
    }),
    {}
  );
}

/**
 * Process Coverage Metrics from Clover
 *
 * See: https://confluence.atlassian.com/clover/how-are-the-clover-coverage-percentages-calculated-79986990.html
 *
 * @param metrics
 * @returns
 */
function processCoverageMetrics(metrics: FileMetrics): number {
  const coveredConditionals = parseInt(metrics['@_coveredconditionals']);
  const coveredStatements = parseInt(metrics['@_coveredstatements']);
  const coveredMethods = parseInt(metrics['@_coveredmethods']);
  const conditionals = parseInt(metrics['@_conditionals']);
  const statements = parseInt(metrics['@_statements']);
  const methods = parseInt(metrics['@_methods']);

  const coveredSum = coveredConditionals + coveredStatements + coveredMethods;
  const codeSum = conditionals + statements + methods;

  const codeCoveragePercentage =
    codeSum > 0 ? (100.0 * coveredSum) / codeSum : 0;

  return roundPercentage(codeCoveragePercentage);
}
