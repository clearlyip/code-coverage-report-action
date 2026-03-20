'use strict';
// CJS stub for @actions/core that implements the real env-var based behaviour.
// This exists because @actions/core v3+ is ESM-only and Jest runs in CJS mode.

const os = require('os');
const fs = require('fs');
const path = require('path');

const ExitCode = Object.freeze({ Success: 0, Failure: 1 });

// Mirrors @actions/core command encoding: % \r \n are percent-encoded
function escapeData(s) {
  const str = s == null ? '' : typeof s === 'string' ? s : JSON.stringify(s);
  return str
    .replace(/%/g, '%25')
    .replace(/\r/g, '%0D')
    .replace(/\n/g, '%0A');
}

function issueCommand(command, message) {
  process.stdout.write(`::${command}::${escapeData(message)}${os.EOL}`);
}

function getInput(name, options) {
  const val =
    process.env['INPUT_' + name.replace(/ /g, '_').toUpperCase()] || '';
  if (options && options.required && !val) {
    throw new Error('Input required and not supplied: ' + name);
  }
  if (options && options.trimWhitespace === false) {
    return val;
  }
  return val.trim();
}

function getMultilineInput(name, options) {
  return getInput(name, options)
    .split('\n')
    .filter(x => x !== '')
    .map(x => (options && options.trimWhitespace === false ? x : x.trim()));
}

function getBooleanInput(name, options) {
  const trueValue = ['true', 'True', 'TRUE'];
  const falseValue = ['false', 'False', 'FALSE'];
  const val = getInput(name, options);
  if (trueValue.includes(val)) return true;
  if (falseValue.includes(val)) return false;
  throw new TypeError('Input does not meet YAML 1.2 "Core Schema" specification: ' + name);
}

function setOutput(name, value) {
  const filePath = process.env['GITHUB_OUTPUT'] || '';
  if (filePath) {
    const val = value !== null && value !== undefined ? String(value) : '';
    fs.appendFileSync(filePath, name + '=' + val + os.EOL);
    return;
  }
  // The original @actions/core writes EOL then the command as two separate stdout.write calls.
  // Tests capture each call individually, so the two-call format must be preserved.
  process.stdout.write(os.EOL);
  process.stdout.write(`::set-output name=${name}::${value}${os.EOL}`);
}

function setFailed(message) {
  process.exitCode = ExitCode.Failure;
  error(message);
}

function isDebug() {
  return process.env['RUNNER_DEBUG'] === '1';
}

function debug(message) {
  issueCommand('debug', message);
}

function error(message) {
  const msg = message instanceof Error ? message.toString() : message;
  issueCommand('error', msg);
}

function warning(message) {
  const msg = message instanceof Error ? message.toString() : message;
  issueCommand('warning', msg);
}

function notice(message) {
  const msg = message instanceof Error ? message.toString() : message;
  issueCommand('notice', msg);
}

function info(message) {
  process.stdout.write(message + os.EOL);
}

function startGroup(name) {
  issueCommand('group', name);
}

function endGroup() {
  process.stdout.write(`::endgroup::${os.EOL}`);
}

function saveState(name, value) {
  const filePath = process.env['GITHUB_STATE'] || '';
  if (filePath) {
    fs.appendFileSync(filePath, name + '=' + String(value) + os.EOL);
  }
}

function getState(name) {
  return process.env['STATE_' + name] || '';
}

function exportVariable(name, val) {
  const convertedVal = typeof val === 'string' ? val : JSON.stringify(val);
  process.env[name] = convertedVal;
  const filePath = process.env['GITHUB_ENV'] || '';
  if (filePath) {
    fs.appendFileSync(filePath, name + '=' + convertedVal + os.EOL);
  }
}

function addPath(inputPath) {
  const filePath = process.env['GITHUB_PATH'] || '';
  if (filePath) {
    fs.appendFileSync(filePath, inputPath + os.EOL);
  }
  process.env['PATH'] = inputPath + path.delimiter + (process.env['PATH'] || '');
}

function setSecret(_secret) {
  // no-op in tests
}

function setCommandEcho(enabled) {
  process.stdout.write('::echo::' + (enabled ? 'on' : 'off') + os.EOL);
}

// Summary class - mirrors @actions/core/lib/summary.js behaviour
class Summary {
  constructor() {
    this._buffer = '';
    this._filePath = null;
  }

  _getFilePath() {
    if (this._filePath) return this._filePath;
    const p = process.env['GITHUB_STEP_SUMMARY'];
    if (!p) {
      throw new Error(
        'Unable to find environment variable for $GITHUB_STEP_SUMMARY.'
      );
    }
    this._filePath = p;
    return p;
  }

  async filePath() {
    return this._getFilePath();
  }

  stringify() {
    return this._buffer;
  }

  isEmptyBuffer() {
    return this._buffer.length === 0;
  }

  emptyBuffer() {
    this._buffer = '';
    return this;
  }

  addRaw(text, addEOL = false) {
    this._buffer += text + (addEOL ? os.EOL : '');
    return this;
  }

  addEOL() {
    return this.addRaw(os.EOL);
  }

  async write(options) {
    const overwrite = !!(options && options.overwrite);
    const fp = this._getFilePath();
    const writeFunc = overwrite
      ? fs.promises.writeFile
      : fs.promises.appendFile;
    await writeFunc(fp, this._buffer, { encoding: 'utf8' });
    return this.emptyBuffer();
  }

  async clear() {
    return this.emptyBuffer().write({ overwrite: true });
  }

  wrap(tag, content, attrs = {}) {
    const htmlAttrs = Object.entries(attrs)
      .map(([key, value]) => ` ${key}="${value}"`)
      .join('');
    if (!content) {
      return `<${tag}${htmlAttrs}>`;
    }
    return `<${tag}${htmlAttrs}>${content}</${tag}>`;
  }

  addTable(rows) {
    const tableBody = rows
      .map(row => {
        const cells = row
          .map(cell => {
            if (typeof cell === 'string') return `<td>${cell}</td>`;
            const { data, header, colspan, rowspan } = cell;
            const tag = header ? 'th' : 'td';
            const attrs = {};
            if (colspan) attrs.colspan = colspan;
            if (rowspan) attrs.rowspan = rowspan;
            return this.wrap(tag, data, attrs);
          })
          .join('');
        return this.wrap('tr', cells);
      })
      .join('');
    return this.addRaw(this.wrap('table', tableBody)).addEOL();
  }

  addDetails(label, content) {
    return this.addRaw(
      this.wrap('details', this.wrap('summary', label) + content)
    ).addEOL();
  }

  addImage(src, alt, options) {
    const { width, height } = options || {};
    const attrs = {};
    if (width) attrs.width = width;
    if (height) attrs.height = height;
    return this.addRaw(this.wrap('img', null, { src, alt, ...attrs })).addEOL();
  }

  addHeading(text, level) {
    const tag = `h${level}`;
    return this.addRaw(this.wrap(tag, text)).addEOL();
  }

  addSeparator() {
    return this.addRaw(this.wrap('hr', null)).addEOL();
  }

  addBreak() {
    return this.addRaw(this.wrap('br', null)).addEOL();
  }

  addQuote(text, cite) {
    const attrs = cite ? { cite } : {};
    return this.addRaw(this.wrap('blockquote', text, attrs)).addEOL();
  }

  addLink(text, href) {
    return this.addRaw(this.wrap('a', text, { href })).addEOL();
  }
}

const summary = new Summary();

module.exports = {
  ExitCode,
  getInput,
  getMultilineInput,
  getBooleanInput,
  setOutput,
  setFailed,
  isDebug,
  debug,
  error,
  warning,
  notice,
  info,
  startGroup,
  endGroup,
  group: async (name, fn) => { startGroup(name); try { return await fn(); } finally { endGroup(); } },
  saveState,
  getState,
  exportVariable,
  addPath,
  setSecret,
  setCommandEcho,
  summary,
  markdownSummary: summary,
};
