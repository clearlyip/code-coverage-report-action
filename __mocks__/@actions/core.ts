/**
 * ESM TypeScript stub for @actions/core.
 *
 * moduleNameMapper redirects '@actions/core' here so Jest's resolver always
 * finds a local .ts file instead of the ESM-only npm package.  All commonly-
 * used exports are jest.fn() with their real default implementations, so:
 *   - snapshot tests capture the same ::command::message stdout format
 *   - tests can call jest.mocked(core.fn).mockImplementation() to override
 *   - tests can call jest.mocked(core.fn).toHaveBeenCalledWith() to verify
 *
 * Note: setFailed intentionally does NOT set process.exitCode so that Jest's
 * own exit-code handling is not disrupted by the tests.
 */

import { EOL } from 'os'
import * as fs from 'fs'
import * as pathModule from 'path'
import { jest } from '@jest/globals'

export const ExitCode = Object.freeze({ Success: 0, Failure: 1 })

function escapeData(s: unknown): string {
  const str = s == null ? '' : typeof s === 'string' ? s : JSON.stringify(s)
  return str.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
}

function issueCommand(command: string, message: unknown): void {
  process.stdout.write(`::${command}::${escapeData(message)}${EOL}`)
}

export const getInput = jest
  .fn()
  .mockImplementation(function (
    name: string,
    options?: { required?: boolean; trimWhitespace?: boolean }
  ): string {
    const val =
      process.env[`INPUT_${name.replace(/ /g, '_').toUpperCase()}`] || ''
    if (options?.required && !val) {
      throw new Error(`Input required and not supplied: ${name}`)
    }
    if (options?.trimWhitespace === false) {
      return val
    }
    return val.trim()
  } as unknown as (...args: unknown[]) => unknown)

export function getMultilineInput(
  name: string,
  options?: { required?: boolean; trimWhitespace?: boolean }
): string[] {
  return (getInput as (n: string, o?: object) => string)(name, options)
    .split('\n')
    .filter(x => x !== '')
    .map(x => (options?.trimWhitespace === false ? x : x.trim()))
}

export function getBooleanInput(
  name: string,
  options?: { required?: boolean }
): boolean {
  const trueValue = ['true', 'True', 'TRUE']
  const falseValue = ['false', 'False', 'FALSE']
  const val = (getInput as (n: string, o?: object) => string)(name, options)
  if (trueValue.includes(val)) return true
  if (falseValue.includes(val)) return false
  throw new TypeError(
    `Input does not meet YAML 1.2 "Core Schema" specification: ${name}`
  )
}

export const setOutput = jest
  .fn()
  .mockImplementation(function (name: string, value: unknown): void {
    const filePath = process.env['GITHUB_OUTPUT'] || ''
    if (filePath) {
      const val = value != null ? String(value) : ''
      fs.appendFileSync(filePath, `${name}=${val}${EOL}`)
      return
    }
    // Two separate writes to match the original @actions/core output format
    // captured in snapshot tests.
    process.stdout.write(EOL)
    process.stdout.write(`::set-output name=${name}::${value}${EOL}`)
  } as unknown as (...args: unknown[]) => unknown)

// setFailed intentionally does NOT set process.exitCode — only writes the
// ::error:: command — so that Jest's own exit-code handling is unaffected.
export const setFailed = jest
  .fn()
  .mockImplementation(function (message: string | Error): void {
    const msg = message instanceof Error ? message.toString() : message
    issueCommand('error', msg)
  } as unknown as (...args: unknown[]) => unknown)

export function isDebug(): boolean {
  return process.env['RUNNER_DEBUG'] === '1'
}

export const debug = jest
  .fn()
  .mockImplementation(function (message: string): void {
    issueCommand('debug', message)
  } as unknown as (...args: unknown[]) => unknown)

export const error = jest
  .fn()
  .mockImplementation(function (message: string | Error): void {
    issueCommand(
      'error',
      message instanceof Error ? message.toString() : message
    )
  } as unknown as (...args: unknown[]) => unknown)

export const warning = jest
  .fn()
  .mockImplementation(function (message: string | Error): void {
    issueCommand(
      'warning',
      message instanceof Error ? message.toString() : message
    )
  } as unknown as (...args: unknown[]) => unknown)

export const notice = jest
  .fn()
  .mockImplementation(function (message: string | Error): void {
    issueCommand(
      'notice',
      message instanceof Error ? message.toString() : message
    )
  } as unknown as (...args: unknown[]) => unknown)

export const info = jest
  .fn()
  .mockImplementation(function (message: string): void {
    process.stdout.write(`${message}${EOL}`)
  } as unknown as (...args: unknown[]) => unknown)

export function startGroup(name: string): void {
  issueCommand('group', name)
}

export function endGroup(): void {
  process.stdout.write(`::endgroup::${EOL}`)
}

export async function group<T>(name: string, fn: () => Promise<T>): Promise<T> {
  startGroup(name)
  try {
    return await fn()
  } finally {
    endGroup()
  }
}

export function saveState(name: string, value: unknown): void {
  const filePath = process.env['GITHUB_STATE'] || ''
  if (filePath) {
    fs.appendFileSync(filePath, `${name}=${String(value)}${EOL}`)
  }
}

export function getState(name: string): string {
  return process.env[`STATE_${name}`] || ''
}

export function exportVariable(name: string, val: unknown): void {
  const convertedVal =
    typeof val === 'string' ? val : JSON.stringify(val)
  process.env[name] = convertedVal
  const filePath = process.env['GITHUB_ENV'] || ''
  if (filePath) {
    fs.appendFileSync(filePath, `${name}=${convertedVal}${EOL}`)
  }
}

export function addPath(inputPath: string): void {
  const filePath = process.env['GITHUB_PATH'] || ''
  if (filePath) {
    fs.appendFileSync(filePath, `${inputPath}${EOL}`)
  }
  process.env['PATH'] =
    inputPath + pathModule.delimiter + (process.env['PATH'] || '')
}

export function setSecret(_secret: string): void {
  // no-op in tests
}

export function setCommandEcho(enabled: boolean): void {
  process.stdout.write(`::echo::${enabled ? 'on' : 'off'}${EOL}`)
}

class Summary {
  private _buffer = ''
  private _filePath: string | null = null

  private getFilePath(): string {
    if (this._filePath) return this._filePath
    const p = process.env['GITHUB_STEP_SUMMARY']
    if (!p) {
      throw new Error(
        'Unable to find environment variable for $GITHUB_STEP_SUMMARY.'
      )
    }
    this._filePath = p
    return p
  }

  async filePath(): Promise<string> {
    return this.getFilePath()
  }

  stringify(): string {
    return this._buffer
  }

  isEmptyBuffer(): boolean {
    return this._buffer.length === 0
  }

  emptyBuffer(): this {
    this._buffer = ''
    return this
  }

  addRaw(text: string, addEOL = false): this {
    this._buffer += text + (addEOL ? EOL : '')
    return this
  }

  addEOL(): this {
    return this.addRaw(EOL)
  }

  async write(options?: { overwrite?: boolean }): Promise<this> {
    const overwrite = !!options?.overwrite
    const fp = this.getFilePath()
    const writeFn = overwrite ? fs.promises.writeFile : fs.promises.appendFile
    await writeFn(fp, this._buffer, { encoding: 'utf8' })
    return this.emptyBuffer()
  }

  async clear(): Promise<this> {
    return this.emptyBuffer().write({ overwrite: true })
  }
}

export const summary = new Summary()
export const markdownSummary = summary
