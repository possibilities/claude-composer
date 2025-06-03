import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { loadConfigFile } from '../../src/config/loader'
import { AppConfig } from '../../src/config/schemas'

describe('Sticky notifications config file', () => {
  let tempDir: string
  let configPath: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-composer-test-'))
    configPath = path.join(tempDir, 'config.yaml')
  })

  afterEach(() => {
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('should load sticky_notifications from config file', async () => {
    const configContent = `
show_notifications: true
sticky_notifications: true
`
    fs.writeFileSync(configPath, configContent)

    const config = await loadConfigFile(configPath)

    expect(config.show_notifications).toBe(true)
    // After migration, boolean true becomes { global: true }
    expect(config.sticky_notifications).toEqual({ global: true })
  })

  it('should handle sticky_notifications: false in config', async () => {
    const configContent = `
sticky_notifications: false
`
    fs.writeFileSync(configPath, configContent)

    const config = await loadConfigFile(configPath)

    // After migration, boolean false becomes { global: false }
    expect(config.sticky_notifications).toEqual({ global: false })
  })

  it('should handle missing sticky_notifications in config', async () => {
    const configContent = `
show_notifications: true
`
    fs.writeFileSync(configPath, configContent)

    const config = await loadConfigFile(configPath)

    expect(config.show_notifications).toBe(true)
    expect(config.sticky_notifications).toBeUndefined()
  })

  it('should validate sticky_notifications type', async () => {
    const configContent = `
sticky_notifications: "yes"  # Should be boolean
`
    fs.writeFileSync(configPath, configContent)

    await expect(loadConfigFile(configPath)).rejects.toThrow()
  })

  it('should work with all notification-related settings', async () => {
    const configContent = `
show_notifications: false
sticky_notifications: true
`
    fs.writeFileSync(configPath, configContent)

    const config = await loadConfigFile(configPath)

    expect(config.show_notifications).toBe(false)
    // After migration, boolean true becomes { global: true }
    expect(config.sticky_notifications).toEqual({ global: true })
  })

  it('should handle object format sticky_notifications directly', async () => {
    const configContent = `
sticky_notifications:
  global: true
  work_complete: false
  terminal_snapshot: true
`
    fs.writeFileSync(configPath, configContent)

    const config = await loadConfigFile(configPath)

    expect(config.sticky_notifications).toEqual({
      global: true,
      work_complete: false,
      terminal_snapshot: true,
    })
  })
})
