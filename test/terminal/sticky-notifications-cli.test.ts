import { describe, it, expect } from 'vitest'
import { parseCommandLineArgs } from '../../src/cli/parser'

describe('Sticky notifications CLI flags', () => {
  it('should parse --sticky-notifications flag', () => {
    const argv = [
      'node',
      'claude-composer',
      '--sticky-notifications',
      'some',
      'args',
    ]
    const { options } = parseCommandLineArgs(argv)

    expect(options.stickyNotifications).toBe(true)
  })

  it('should parse --no-sticky-notifications flag', () => {
    const argv = [
      'node',
      'claude-composer',
      '--no-sticky-notifications',
      'some',
      'args',
    ]
    const { options } = parseCommandLineArgs(argv)

    expect(options.stickyNotifications).toBe(false)
  })

  it('should not set stickyNotifications when no flag is provided', () => {
    const argv = ['node', 'claude-composer', 'some', 'args']
    const { options } = parseCommandLineArgs(argv)

    expect(options.stickyNotifications).toBeUndefined()
  })

  it('should handle --sticky-notifications with other flags', () => {
    const argv = [
      'node',
      'claude-composer',
      '--show-notifications',
      '--sticky-notifications',
      '--quiet',
      'chat',
    ]
    const { options, args } = parseCommandLineArgs(argv)

    expect(options.showNotifications).toBe(true)
    expect(options.stickyNotifications).toBe(true)
    expect(options.quiet).toBe(true)
    expect(args).toEqual(['chat'])
  })

  it('should respect last flag when both are provided', () => {
    // --sticky-notifications followed by --no-sticky-notifications
    const argv1 = [
      'node',
      'claude-composer',
      '--sticky-notifications',
      '--no-sticky-notifications',
    ]
    const { options: options1 } = parseCommandLineArgs(argv1)
    expect(options1.stickyNotifications).toBe(false)

    // --no-sticky-notifications followed by --sticky-notifications
    const argv2 = [
      'node',
      'claude-composer',
      '--no-sticky-notifications',
      '--sticky-notifications',
    ]
    const { options: options2 } = parseCommandLineArgs(argv2)
    expect(options2.stickyNotifications).toBe(true)
  })
})
