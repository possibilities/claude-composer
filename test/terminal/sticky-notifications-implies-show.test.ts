import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { runPreflight } from '../../src/core/preflight'

describe('Sticky notifications implies show notifications', () => {
  let tempDir: string
  let configPath: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-composer-test-'))
    configPath = path.join(tempDir, 'config.yaml')
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('should enable show_notifications when --sticky-notifications is used', async () => {
    // Valid empty config
    fs.writeFileSync(configPath, '{}')

    const result = await runPreflight(
      [
        'node',
        'claude-composer',
        '--sticky-notifications',
        '--', // Use -- to avoid subcommand detection
        'some-prompt',
      ],
      {
        configPath,
      },
    )

    expect(result.appConfig.sticky_notifications).toBe(true)
    expect(result.appConfig.show_notifications).toBe(true)
  })

  it('should not disable show_notifications when --no-sticky-notifications is used', async () => {
    // Valid empty config
    fs.writeFileSync(configPath, '{}')

    const result = await runPreflight(
      [
        'node',
        'claude-composer',
        '--no-sticky-notifications',
        '--',
        'some-prompt',
      ],
      {
        configPath,
      },
    )

    expect(result.appConfig.sticky_notifications).toBe(false)
    // show_notifications should remain at its default (true)
    expect(result.appConfig.show_notifications).toBe(true)
  })

  it('should enable show_notifications even if config has it disabled', async () => {
    const configContent = `
show_notifications: false
`
    fs.writeFileSync(configPath, configContent)

    const result = await runPreflight(
      [
        'node',
        'claude-composer',
        '--sticky-notifications',
        '--',
        'some-prompt',
      ],
      {
        configPath,
      },
    )

    expect(result.appConfig.sticky_notifications).toBe(true)
    expect(result.appConfig.show_notifications).toBe(true)
  })

  it('should respect explicit --no-show-notifications even with --sticky-notifications', async () => {
    fs.writeFileSync(configPath, '{}')

    const result = await runPreflight(
      [
        'node',
        'claude-composer',
        '--sticky-notifications',
        '--no-show-notifications',
        '--',
        'some-prompt',
      ],
      {
        configPath,
      },
    )

    expect(result.appConfig.sticky_notifications).toBe(true)
    // Explicit --no-show-notifications should take precedence
    expect(result.appConfig.show_notifications).toBe(false)
  })

  it('should handle flag order correctly', async () => {
    fs.writeFileSync(configPath, '{}')

    // Test 1: --sticky-notifications alone enables notifications
    const result1 = await runPreflight(
      [
        'node',
        'claude-composer',
        '--sticky-notifications',
        '--',
        'some-prompt',
      ],
      {
        configPath,
      },
    )
    expect(result1.appConfig.sticky_notifications).toBe(true)
    expect(result1.appConfig.show_notifications).toBe(true)

    // Test 2: --no-show-notifications after --sticky-notifications should disable
    const result2 = await runPreflight(
      [
        'node',
        'claude-composer',
        '--sticky-notifications',
        '--no-show-notifications',
        '--',
        'some-prompt',
      ],
      {
        configPath,
      },
    )
    expect(result2.appConfig.sticky_notifications).toBe(true)
    expect(result2.appConfig.show_notifications).toBe(false)

    // Test 3: When both are present, last one wins for show_notifications
    const result3 = await runPreflight(
      [
        'node',
        'claude-composer',
        '--no-show-notifications',
        '--sticky-notifications',
        '--',
        'some-prompt',
      ],
      {
        configPath,
      },
    )
    expect(result3.appConfig.sticky_notifications).toBe(true)
    // Since we process sticky first (which enables) then showNotifications (which was set to false)
    expect(result3.appConfig.show_notifications).toBe(false)
  })

  it('should work with config file having sticky_notifications: true', async () => {
    const configContent = `
sticky_notifications: true
`
    fs.writeFileSync(configPath, configContent)

    const result = await runPreflight(
      ['node', 'claude-composer', '--', 'some-prompt'],
      {
        configPath,
      },
    )

    // Config file sticky_notifications doesn't auto-enable show_notifications
    // Only the CLI flag does
    expect(result.appConfig.sticky_notifications).toBe(true)
    expect(result.appConfig.show_notifications).toBe(true) // default is true
  })
})
