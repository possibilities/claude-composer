import { describe, it, expect } from 'vitest'
import { parseCommandLineArgs } from '../../src/cli/parser.js'

describe('Short flag support', () => {
  it('should parse short flags correctly', () => {
    const testCases = [
      {
        args: ['node', 'cli.js', '-t', 'test-toolset'],
        expected: { toolset: ['test-toolset'] },
      },
      {
        args: ['node', 'cli.js', '-r', 'test-ruleset'],
        expected: { ruleset: ['test-ruleset'] },
      },
      {
        args: ['node', 'cli.js', '-i'],
        expected: { ignoreGlobalConfig: true },
      },
      { args: ['node', 'cli.js', '-q'], expected: { quiet: true } },
      {
        args: ['node', 'cli.js', '-b'],
        expected: { allowBufferSnapshots: true },
      },
      {
        args: ['node', 'cli.js', '-l'],
        expected: { logAllPatternMatches: true },
      },
      {
        args: ['node', 'cli.js', '-d'],
        expected: { dangerouslyAllowInDirtyDirectory: true },
      },
      {
        args: ['node', 'cli.js', '-D'],
        expected: { dangerouslyAllowWithoutVersionControl: true },
      },
      { args: ['node', 'cli.js', '-n'], expected: { showNotifications: true } },
      {
        args: ['node', 'cli.js', '-N'],
        expected: { stickyNotifications: true },
      },
      {
        args: ['node', 'cli.js', '-R'],
        expected: { sendRemoteNotifications: true },
      },
    ]

    for (const { args, expected } of testCases) {
      const { options } = parseCommandLineArgs(args)
      for (const [key, value] of Object.entries(expected)) {
        expect(options[key]).toStrictEqual(value)
      }
    }
  })

  it('should allow combining short and long flags', () => {
    const { options } = parseCommandLineArgs([
      'node',
      'cli.js',
      '-t',
      'toolset1',
      '--ruleset',
      'ruleset1',
      '-q',
    ])

    expect(options.toolset).toEqual(['toolset1'])
    expect(options.ruleset).toEqual(['ruleset1'])
    expect(options.quiet).toBe(true)
  })

  it('should handle multiple values with short flags', () => {
    const { options } = parseCommandLineArgs([
      'node',
      'cli.js',
      '-t',
      'toolset1',
      'toolset2',
      '-r',
      'ruleset1',
      'ruleset2',
    ])

    expect(options.toolset).toEqual(['toolset1', 'toolset2'])
    expect(options.ruleset).toEqual(['ruleset1', 'ruleset2'])
  })
})
