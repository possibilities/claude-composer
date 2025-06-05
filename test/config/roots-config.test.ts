import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import { ConfigManager } from '../../src/config/manager'
import { type AppConfig } from '../../src/config/schemas'
import { trustPromptPattern } from '../../src/patterns/registry'

// Mock the notifications module
vi.mock('../../src/utils/notifications', () => ({
  showNotification: vi.fn(),
}))

// Create a mutable mock object
const mockAppConfig = {
  roots: [],
}

// Mock the index module
vi.mock('../../src/index', () => {
  return {
    appConfig: mockAppConfig,
  }
})

describe('Roots Configuration', () => {
  let configManager: ConfigManager
  let tempDir: string
  let originalCwd: string

  beforeEach(() => {
    // Save original cwd
    originalCwd = process.cwd()

    // Create temp directory
    tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'claude-composer-roots-test-'),
    )

    // Reset config manager
    ConfigManager.resetInstance()
    configManager = ConfigManager.getInstance()

    // Reset the mocked appConfig
    mockAppConfig.roots = []

    // Set global for tests
    ;(global as any).__testAppConfig = mockAppConfig

    // Mock console.log to suppress output during tests
    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    // Restore original cwd
    process.chdir(originalCwd)

    // Clean up global
    delete (global as any).__testAppConfig

    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true })

    // Reset config manager
    ConfigManager.resetInstance()
  })

  describe('Schema validation', () => {
    it('should accept roots configuration', async () => {
      const config: AppConfig = {
        roots: ['/home/user/projects', '~/work', '$HOME/code'],
      }

      await configManager.loadConfig({
        cliOverrides: config,
        ignoreGlobalConfig: true,
      })

      const loadedConfig = configManager.getAppConfig()
      expect(loadedConfig.roots).toEqual([
        '/home/user/projects',
        '~/work',
        '$HOME/code',
      ])
    })

    it('should handle empty roots array', async () => {
      const config: AppConfig = {
        roots: [],
      }

      await configManager.loadConfig({
        cliOverrides: config,
        ignoreGlobalConfig: true,
      })

      const loadedConfig = configManager.getAppConfig()
      expect(loadedConfig.roots).toEqual([])
    })

    it('should handle undefined roots', async () => {
      const config: AppConfig = {}

      await configManager.loadConfig({
        cliOverrides: config,
        ignoreGlobalConfig: true,
      })

      const loadedConfig = configManager.getAppConfig()
      expect(loadedConfig.roots).toBeUndefined()
    })
  })

  // Since expandPath is not exported, we'll test it indirectly through the pattern response

  describe('Trust prompt pattern', () => {
    it('should match trust prompt text', () => {
      expect(trustPromptPattern.pattern).toEqual([
        'Claude Code may read files in this folder',
      ])
      expect(trustPromptPattern.triggerText).toBe(
        'Claude Code may read files in this folder',
      )
      expect(trustPromptPattern.type).toBe('confirmation')
    })

    it('should return "3" (No) when roots is empty', async () => {
      // Set mock appConfig roots
      mockAppConfig.roots = []

      const response = trustPromptPattern.response
      expect(typeof response).toBe('function')
      if (typeof response === 'function') {
        const result = response()
        expect(result).toEqual(['3'])
      }
    })

    it('should return "1" (Yes) when parent is in roots', async () => {
      // Create test directories
      const rootDir = path.join(tempDir, 'trusted-root')
      const projectDir = path.join(rootDir, 'my-project')
      fs.mkdirSync(rootDir, { recursive: true })
      fs.mkdirSync(projectDir, { recursive: true })

      // Change to project directory
      process.chdir(projectDir)

      // Set mock appConfig roots
      mockAppConfig.roots = [rootDir]

      const response = trustPromptPattern.response
      if (typeof response === 'function') {
        const result = response()
        // The parent of projectDir (/tempDir/trusted-root/my-project) is /tempDir/trusted-root
        // which should match the root /tempDir/trusted-root
        expect(result).toEqual(['1'])
      }
    })

    it('should return "3" (No) when parent is not in roots', async () => {
      // Create test directories
      const rootDir = path.join(tempDir, 'trusted-root')
      const otherDir = path.join(tempDir, 'untrusted')
      const projectDir = path.join(otherDir, 'my-project')
      fs.mkdirSync(rootDir, { recursive: true })
      fs.mkdirSync(projectDir, { recursive: true })

      // Change to project directory
      process.chdir(projectDir)

      // Set mock appConfig roots
      mockAppConfig.roots = [rootDir]

      const response = trustPromptPattern.response
      if (typeof response === 'function') {
        const result = response()
        expect(result).toEqual(['3'])
      }
    })

    it('should handle subdirectories of roots', async () => {
      // Create nested directories
      const rootDir = path.join(tempDir, 'trusted-root')
      const subDir = path.join(rootDir, 'level1', 'level2')
      const projectDir = path.join(subDir, 'my-project')
      fs.mkdirSync(projectDir, { recursive: true })

      // Change to project directory
      process.chdir(projectDir)

      // Set mock appConfig roots
      mockAppConfig.roots = [rootDir]

      const response = trustPromptPattern.response
      if (typeof response === 'function') {
        const result = response()
        expect(result).toEqual(['3']) // No longer trusts subdirectories
      }
    })

    it('should handle errors gracefully', () => {
      // Clear the mock roots to simulate no config
      mockAppConfig.roots = undefined

      const response = trustPromptPattern.response
      if (typeof response === 'function') {
        const result = response()
        expect(result).toEqual(['3']) // Defaults to No on error
      }
    })

    it('should handle environment variable expansion in paths', async () => {
      // Create test directories
      const rootDir = path.join(tempDir, 'env-test')
      const projectDir = path.join(rootDir, 'my-project')
      fs.mkdirSync(projectDir, { recursive: true })

      // Set environment variable
      process.env.TEST_ROOT = tempDir

      // Change to project directory
      process.chdir(projectDir)

      // Set mock appConfig roots with environment variable
      mockAppConfig.roots = ['$TEST_ROOT/env-test']

      const response = trustPromptPattern.response
      if (typeof response === 'function') {
        const result = response()
        expect(result).toEqual(['1'])
      }

      // Clean up
      delete process.env.TEST_ROOT
    })
  })
})
