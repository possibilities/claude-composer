import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { loadConfig, appConfig } from '../cli'

describe('Configuration Loading', () => {
  let testConfigDir: string
  let testConfigPath: string

  beforeEach(() => {
    // Reset appConfig
    Object.keys(appConfig).forEach(key => delete appConfig[key])

    // Create unique test directory
    testConfigDir = fs.mkdtempSync(
      path.join(require('os').tmpdir(), 'claude-composer-config-test-'),
    )
    testConfigPath = path.join(testConfigDir, 'test-config.yaml')
  })

  afterEach(() => {
    // Clean up test config files
    try {
      if (fs.existsSync(testConfigDir)) {
        fs.rmSync(testConfigDir, { recursive: true, force: true })
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

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})

    await loadConfig(testConfigPath)

    expect(consoleSpy).toHaveBeenCalledWith(
      'Error loading configuration file:',
      expect.any(Error),
    )
    expect(appConfig.show_notifications).toBeUndefined()

    consoleSpy.mockRestore()
  })

  it('should handle false value correctly', async () => {
    const configContent = 'show_notifications: false'
    fs.writeFileSync(testConfigPath, configContent)

    await loadConfig(testConfigPath)

    expect(appConfig.show_notifications).toBe(false)
  })

  it('should load dangerously_dismiss_bash_prompts setting', async () => {
    const configContent = 'dangerously_dismiss_bash_prompts: true'
    fs.writeFileSync(testConfigPath, configContent)

    await loadConfig(testConfigPath)

    expect(appConfig.dangerously_dismiss_bash_prompts).toBe(true)
  })

  it('should load all dangerous dismiss options from config', async () => {
    const configContent = `
show_notifications: false
dangerously_dismiss_edit_file_prompts: true
dangerously_dismiss_create_file_prompts: true
dangerously_dismiss_bash_prompts: true
dangerously_allow_in_dirty_directory: true
dangerously_allow_without_version_control: true`
    fs.writeFileSync(testConfigPath, configContent)

    await loadConfig(testConfigPath)

    expect(appConfig.show_notifications).toBe(false)
    expect(appConfig.dangerously_dismiss_edit_file_prompts).toBe(true)
    expect(appConfig.dangerously_dismiss_create_file_prompts).toBe(true)
    expect(appConfig.dangerously_dismiss_bash_prompts).toBe(true)
    expect(appConfig.dangerously_allow_in_dirty_directory).toBe(true)
    expect(appConfig.dangerously_allow_without_version_control).toBe(true)
  })
})
