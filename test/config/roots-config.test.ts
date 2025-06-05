import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'
import { ConfigManager } from '../../src/config/manager'
import { type AppConfig } from '../../src/config/schemas'
import { createTrustPromptPattern } from '../../src/patterns/registry'

vi.mock('../../src/utils/notifications', () => ({
  showNotification: vi.fn(),
}))

describe('Roots Configuration', () => {
  let configManager: ConfigManager
  let tempDir: string
  let originalCwd: string

  beforeEach(() => {
    originalCwd = process.cwd()

    tempDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'claude-composer-roots-test-'),
    )

    ConfigManager.resetInstance()
    configManager = ConfigManager.getInstance()

    vi.spyOn(console, 'log').mockImplementation(() => {})
  })

  afterEach(() => {
    process.chdir(originalCwd)

    fs.rmSync(tempDir, { recursive: true, force: true })

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

  describe('Trust prompt pattern', () => {
    it('should match trust prompt text', () => {
      const mockAppConfig: AppConfig = { roots: [] }
      const trustPromptPattern = createTrustPromptPattern(() => mockAppConfig)

      expect(trustPromptPattern.pattern).toEqual([
        'Claude Code may read files in this folder',
      ])
      expect(trustPromptPattern.triggerText).toBe(
        'Claude Code may read files in this folder',
      )
      expect(trustPromptPattern.type).toBe('confirmation')
    })

    it('should return "3" (No) when roots is empty', async () => {
      const mockAppConfig: AppConfig = { roots: [] }
      const trustPromptPattern = createTrustPromptPattern(() => mockAppConfig)

      const response = trustPromptPattern.response
      expect(typeof response).toBe('function')
      if (typeof response === 'function') {
        const result = response()
        expect(result).toEqual(['3'])
      }
    })

    it('should return "1" (Yes) when parent is in roots', async () => {
      const rootDir = path.join(tempDir, 'trusted-root')
      const projectDir = path.join(rootDir, 'my-project')
      fs.mkdirSync(rootDir, { recursive: true })
      fs.mkdirSync(projectDir, { recursive: true })

      process.chdir(projectDir)

      const mockAppConfig: AppConfig = { roots: [rootDir] }
      const trustPromptPattern = createTrustPromptPattern(() => mockAppConfig)

      const response = trustPromptPattern.response
      if (typeof response === 'function') {
        const result = response()
        expect(result).toEqual(['1'])
      }
    })

    it('should return "3" (No) when parent is not in roots', async () => {
      const rootDir = path.join(tempDir, 'trusted-root')
      const otherDir = path.join(tempDir, 'untrusted')
      const projectDir = path.join(otherDir, 'my-project')
      fs.mkdirSync(rootDir, { recursive: true })
      fs.mkdirSync(projectDir, { recursive: true })

      process.chdir(projectDir)

      const mockAppConfig: AppConfig = { roots: [rootDir] }
      const trustPromptPattern = createTrustPromptPattern(() => mockAppConfig)

      const response = trustPromptPattern.response
      if (typeof response === 'function') {
        const result = response()
        expect(result).toEqual(['3'])
      }
    })

    it('should handle subdirectories of roots', async () => {
      const rootDir = path.join(tempDir, 'trusted-root')
      const subDir = path.join(rootDir, 'level1', 'level2')
      const projectDir = path.join(subDir, 'my-project')
      fs.mkdirSync(projectDir, { recursive: true })

      process.chdir(projectDir)

      const mockAppConfig: AppConfig = { roots: [rootDir] }
      const trustPromptPattern = createTrustPromptPattern(() => mockAppConfig)

      const response = trustPromptPattern.response
      if (typeof response === 'function') {
        const result = response()
        expect(result).toEqual(['3'])
      }
    })

    it('should handle errors gracefully', () => {
      const mockAppConfig: AppConfig = {}
      const trustPromptPattern = createTrustPromptPattern(() => mockAppConfig)

      const response = trustPromptPattern.response
      if (typeof response === 'function') {
        const result = response()
        expect(result).toEqual(['3'])
      }
    })

    it('should handle environment variable expansion in paths', async () => {
      const rootDir = path.join(tempDir, 'env-test')
      const projectDir = path.join(rootDir, 'my-project')
      fs.mkdirSync(projectDir, { recursive: true })

      process.env.TEST_ROOT = tempDir

      process.chdir(projectDir)

      const mockAppConfig: AppConfig = { roots: ['$TEST_ROOT/env-test'] }
      const trustPromptPattern = createTrustPromptPattern(() => mockAppConfig)

      const response = trustPromptPattern.response
      if (typeof response === 'function') {
        const result = response()
        expect(result).toEqual(['1'])
      }

      delete process.env.TEST_ROOT
    })
  })
})
