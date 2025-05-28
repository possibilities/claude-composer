import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { loadConfig, appConfig } from '../cli'

describe('Configuration Loading', () => {
  const testConfigDir = path.join(__dirname, 'tmp')
  const testConfigPath = path.join(testConfigDir, 'test-config.yaml')

  beforeEach(() => {
    // Reset appConfig
    Object.keys(appConfig).forEach(key => delete appConfig[key])

    // Ensure test directory exists
    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true })
    }
  })

  afterEach(() => {
    // Clean up test config files
    try {
      if (fs.existsSync(testConfigPath)) {
        fs.unlinkSync(testConfigPath)
      }
      if (fs.existsSync(testConfigDir)) {
        fs.rmdirSync(testConfigDir)
      }
    } catch {}
  })

  it('should load show_notifications setting from YAML config', async () => {
    const configContent = 'show_notifications: true'
    fs.writeFileSync(testConfigPath, configContent)

    await loadConfig(testConfigPath)

    expect(appConfig.show_notifications).toBe(true)
  })

  it('should handle missing config file gracefully', async () => {
    const nonExistentPath = path.join(testConfigDir, 'nonexistent.yaml')

    await loadConfig(nonExistentPath)

    expect(appConfig.show_notifications).toBeUndefined()
  })

  it('should handle invalid YAML gracefully', async () => {
    const invalidConfig = 'show_notifications: [invalid: yaml'
    fs.writeFileSync(testConfigPath, invalidConfig)

    // Mock console.error to avoid test output pollution
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await loadConfig(testConfigPath)

    expect(consoleSpy).toHaveBeenCalledWith(
      'Error loading configuration file:',
      expect.any(Error),
    )
    expect(appConfig.show_notifications).toBeUndefined()

    consoleSpy.mockRestore()
  })

  it('should load multiple configuration options', async () => {
    const configContent = `
show_notifications: true
# Future options can be added here
`
    fs.writeFileSync(testConfigPath, configContent)

    await loadConfig(testConfigPath)

    expect(appConfig.show_notifications).toBe(true)
  })

  it('should handle false value correctly', async () => {
    const configContent = 'show_notifications: false'
    fs.writeFileSync(testConfigPath, configContent)

    await loadConfig(testConfigPath)

    expect(appConfig.show_notifications).toBe(false)
  })
})
