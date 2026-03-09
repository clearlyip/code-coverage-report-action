import { Coverage, CoverageFile, Files } from '../../../interfaces';
import {
  createHash,
  determineCommonBasePath,
  escapeRegExp,
  roundPercentage
} from '../../../utils';
import { Cobertura, Package, Class, Lines } from '../types';

export default async function parse(cobertura: Cobertura): Promise<Coverage> {
  const files: Files = await parsePackages(cobertura.coverage.packages.package);

  const fileList = Object.values(files).map((file) => file.absolute);
  const basePath = `${determineCommonBasePath(fileList)}`;
  const regExp = new RegExp(`^${escapeRegExp(`${basePath}/`)}`);

  return {
    files: Object.entries(files).reduce((previous, [, file]) => {
      file.relative = file.absolute.replace(regExp, '');
      return { ...previous, [createHash(file.relative)]: file };
    }, {}),
    coverage: roundPercentage(
      parseFloat(cobertura.coverage['@_line-rate']) * 100
    ),
    timestamp: parseInt(cobertura.coverage['@_timestamp']),
    basePath
  };
}

/**
 * Parse Packages
 *
 * @param {Package[]} packages
 * @returns {Promise<Files>}
 */
/**
 * Merge two file entries for the same path (e.g. multiple classes per file or same file in multiple packages).
 * Sums lines_covered and lines_valid; recomputes coverage from aggregated lines when both have line counts.
 */
function mergeFileEntry(
  existing: CoverageFile,
  incoming: CoverageFile
): CoverageFile {
  const covered = (existing.lines_covered ?? 0) + (incoming.lines_covered ?? 0);
  const valid = (existing.lines_valid ?? 0) + (incoming.lines_valid ?? 0);
  const coverage =
    valid > 0 ? roundPercentage((covered / valid) * 100) : incoming.coverage;
  return {
    relative: existing.relative,
    absolute: existing.absolute,
    coverage,
    lines_covered: covered,
    lines_valid: valid
  };
}

async function parsePackages(packages?: Package[]): Promise<Files> {
  const allFiles: Files = {};
  for await (const p of packages || []) {
    if (!p.classes) {
      continue;
    }
    const files = await parseClasses(p.classes.class);

    for (const [hash, file] of Object.entries(files)) {
      if (allFiles[hash]) {
        allFiles[hash] = mergeFileEntry(allFiles[hash], file);
      } else {
        allFiles[hash] = file;
      }
    }
  }
  return allFiles;
}

/**
 * Count lines_covered and lines_valid from a class's lines array
 */
function countLines(lines: Lines): {
  lines_covered: number;
  lines_valid: number;
} {
  const lineArray = lines?.line;
  if (!lineArray) {
    return { lines_covered: 0, lines_valid: 0 };
  }
  const arr = Array.isArray(lineArray) ? lineArray : [lineArray];
  let lines_covered = 0;
  for (const line of arr) {
    const hits = parseInt((line as { '@_hits'?: string })['@_hits'] ?? '0', 10);
    if (hits > 0) {
      lines_covered += 1;
    }
  }
  return { lines_covered, lines_valid: arr.length };
}

/**
 * Process into an object. When multiple classes share the same filename (e.g. inner classes),
 * aggregate their lines_covered and lines_valid and compute coverage from the aggregated totals.
 *
 * @param {Class[]} classes
 * @returns {Promise<Files>}
 */
async function parseClasses(classes?: Class[]): Promise<Files> {
  const byPath = new Map<
    string,
    {
      relative: string;
      absolute: string;
      lines_covered: number;
      lines_valid: number;
    }
  >();

  for (const cls of classes || []) {
    const path = cls['@_filename'];
    const lineRate = cls['@_line-rate'];
    const { lines_covered, lines_valid } = countLines(cls.lines);
    const key = path;

    if (byPath.has(key)) {
      const cur = byPath.get(key)!;
      cur.lines_covered += lines_covered;
      cur.lines_valid += lines_valid;
    } else {
      byPath.set(key, {
        relative: path,
        absolute: `${path}`,
        lines_covered,
        lines_valid
      });
    }
  }

  const result: Files = {};
  for (const [
    path,
    { relative, absolute, lines_covered, lines_valid }
  ] of byPath) {
    const coverage =
      lines_valid > 0
        ? roundPercentage((lines_covered / lines_valid) * 100)
        : 0;
    result[createHash(path)] = {
      relative,
      absolute,
      coverage,
      lines_covered,
      lines_valid
    };
  }
  return result;
}
