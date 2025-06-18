import { describe, it, expect } from 'vitest'
import {
  parseCommandLineArgs,
  buildKnownOptionsSet,
} from '../../src/cli/parser'

describe('Output Formatter CLI Parsing', () => {
  it('should parse --output-formatter option with value', () => {
    const argv = [
      'node',
      'script.js',
      '--output-formatter',
      '/path/to/formatter.sh',
    ]
    const result = parseCommandLineArgs(argv)

    expect(result.options.outputFormatter).toBe('/path/to/formatter.sh')

    // Check that --output-formatter is in the known options
    const knownOptions = buildKnownOptionsSet(result.program)
    expect(knownOptions.has('--output-formatter')).toBe(true)
  })

  it('should handle --output-formatter among other options', () => {
    const argv = [
      'node',
      'script.js',
      '--quiet',
      '--output-formatter',
      './formatter.py',
      '--mode',
      'plan',
      'some text',
    ]
    const result = parseCommandLineArgs(argv)

    expect(result.options.outputFormatter).toBe('./formatter.py')
    expect(result.options.quiet).toBe(true)
    expect(result.options.mode).toBe('plan')
    expect(result.args).toEqual(['some text'])
  })

  it('should not include --output-formatter in childArgs', () => {
    const argv = [
      'node',
      'script.js',
      '--output-formatter',
      '/usr/local/bin/formatter',
      '--print',
      'hello world',
    ]
    const result = parseCommandLineArgs(argv)

    expect(result.options.outputFormatter).toBe('/usr/local/bin/formatter')
    expect(result.args).not.toContain('--output-formatter')
    expect(result.args).not.toContain('/usr/local/bin/formatter')
  })
})
