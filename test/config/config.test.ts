import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { loadConfigFile } from '../../src/config/loader'

describe('Configuration Loading', () => {
  let testConfigDir: string
  let testConfigPath: string

  beforeEach(() => {
    testConfigDir = fs.mkdtempSync(
      path.join(require('os').tmpdir(), 'claude-composer-config-test-'),
    )
    testConfigPath = path.join(testConfigDir, 'test-config.yaml')
  })

  afterEach(() => {
    try {
      if (fs.existsSync(testConfigDir)) {
        fs.rmSync(testConfigDir, { recursive: true, force: true })
      }
    } catch {}
  })

  it('should load show_notifications setting from YAML config', async () => {
    const configContent = 'show_notifications: true'
    fs.writeFileSync(testConfigPath, configContent)

    const config = await loadConfigFile(testConfigPath)

    expect(config.show_notifications).toBe(true)
  })

  it('should handle missing config file gracefully', async () => {
    const nonExistentPath = path.join(testConfigDir, 'nonexistent.yaml')

    const config = await loadConfigFile(nonExistentPath)

    expect(config.show_notifications).toBeUndefined()
  })

  it('should handle invalid YAML gracefully', async () => {
    const invalidConfig = 'show_notifications: [invalid: yaml'
    fs.writeFileSync(testConfigPath, invalidConfig)

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await expect(loadConfigFile(testConfigPath)).rejects.toThrow(
      'Error loading configuration file:',
    )

    consoleSpy.mockRestore()
  })

  it('should handle false value correctly', async () => {
    const configContent = 'show_notifications: false'
    fs.writeFileSync(testConfigPath, configContent)

    const config = await loadConfigFile(testConfigPath)

    expect(config.show_notifications).toBe(false)
  })

  it('should load toolsets setting', async () => {
    const configContent = 'toolsets: ["test-toolset"]'
    fs.writeFileSync(testConfigPath, configContent)

    const config = await loadConfigFile(testConfigPath)

    expect(config.toolsets).toEqual(['test-toolset'])
  })

  it('should load all configuration options from config', async () => {
    const configContent = `
show_notifications: false
toolsets: ["test-toolset"]
dangerously_allow_in_dirty_directory: true
dangerously_allow_without_version_control: true`
    fs.writeFileSync(testConfigPath, configContent)

    const config = await loadConfigFile(testConfigPath)

    expect(config.show_notifications).toBe(false)
    expect(config.toolsets).toEqual(['test-toolset'])
    expect(config.dangerously_allow_in_dirty_directory).toBe(true)
    expect(config.dangerously_allow_without_version_control).toBe(true)
  })
})
