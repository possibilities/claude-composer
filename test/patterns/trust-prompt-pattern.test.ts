import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'
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
vi.mock('../../src/index', () => ({
  appConfig: mockAppConfig,
}))

describe('trustPromptPattern', () => {
  const originalCwd = process.cwd()
  let tempDir: string

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Reset the mocked appConfig
    mockAppConfig.roots = []

    // Set global for tests
    ;(global as any).__testAppConfig = mockAppConfig

    // Create temp directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'trust-prompt-test-'))
  })

  afterEach(() => {
    // Restore original cwd
    process.chdir(originalCwd)

    // Clean up temp directory
    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true })
    }

    // Clean up global
    delete (global as any).__testAppConfig
  })

  it('should have correct pattern configuration', () => {
    expect(trustPromptPattern.id).toBe('trust-folder-prompt')
    expect(trustPromptPattern.title).toBe('Trust folder')
    expect(trustPromptPattern.type).toBe('confirmation')
    expect(trustPromptPattern.pattern).toEqual([
      'Claude Code may read files in this folder',
    ])
    expect(trustPromptPattern.triggerText).toBe(
      'Claude Code may read files in this folder',
    )
    expect(typeof trustPromptPattern.response).toBe('function')
  })

  describe('checkIfPwdParentInRoots', () => {
    const checkIfPwdParentInRoots = trustPromptPattern.response as Function

    it('should return No (3) when no roots are configured', () => {
      mockAppConfig.roots = []
      const result = checkIfPwdParentInRoots()
      expect(result).toEqual(['3'])
    })

    it('should return Yes (1) when parent directory matches a root', () => {
      const testRoot = path.join(tempDir, 'test-root')
      const testDir = path.join(testRoot, 'test-project')
      fs.mkdirSync(testDir, { recursive: true })

      mockAppConfig.roots = [testRoot]
      process.chdir(testDir)

      const result = checkIfPwdParentInRoots()
      expect(result).toEqual(['1'])
    })

    it('should return No (3) when parent directory is under a root (not direct child)', () => {
      const testRoot = path.join(tempDir, 'test-root')
      const testDir = path.join(testRoot, 'sub', 'project')
      fs.mkdirSync(testDir, { recursive: true })

      mockAppConfig.roots = [testRoot]
      process.chdir(testDir)

      const result = checkIfPwdParentInRoots()
      expect(result).toEqual(['3'])
    })

    it('should return No (3) when parent directory does not match any root', () => {
      const testRoot = path.join(tempDir, 'test-root')
      const testDir = path.join(tempDir, 'other-dir', 'project')
      fs.mkdirSync(testRoot, { recursive: true })
      fs.mkdirSync(testDir, { recursive: true })

      mockAppConfig.roots = [testRoot]
      process.chdir(testDir)

      const result = checkIfPwdParentInRoots()
      expect(result).toEqual(['3'])
    })

    it('should expand ~ in root paths', () => {
      const testRoot = path.join(os.homedir(), 'test-root')
      const testDir = path.join(testRoot, 'project')
      fs.mkdirSync(testDir, { recursive: true })

      mockAppConfig.roots = ['~/test-root']
      process.chdir(testDir)

      const result = checkIfPwdParentInRoots()
      expect(result).toEqual(['1'])
    })

    it('should handle multiple roots', () => {
      const firstRoot = path.join(tempDir, 'first-root')
      const secondRoot = path.join(tempDir, 'second-root')
      const thirdRoot = path.join(tempDir, 'third-root')
      const testDir = path.join(secondRoot, 'project')
      fs.mkdirSync(testDir, { recursive: true })

      mockAppConfig.roots = [firstRoot, secondRoot, thirdRoot]
      process.chdir(testDir)

      const result = checkIfPwdParentInRoots()
      expect(result).toEqual(['1'])
    })

    it('should return No (3) on error', () => {
      // Mock process.cwd to throw an error
      const originalCwd = process.cwd
      process.cwd = () => {
        throw new Error('Test error')
      }

      const result = checkIfPwdParentInRoots()
      expect(result).toEqual(['3'])

      // Restore original cwd
      process.cwd = originalCwd
    })

    it('should show console output when trusting a directory', () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const testRoot = path.join(tempDir, 'test-root')
      const testDir = path.join(testRoot, 'project')
      fs.mkdirSync(testDir, { recursive: true })

      mockAppConfig.roots = [testRoot]
      process.chdir(testDir)

      const result = checkIfPwdParentInRoots()

      // Should return '1' (Yes)
      expect(result).toEqual(['1'])

      // Should show the trusted root warning box
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('🔓 TRUSTED ROOT DIRECTORY'),
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Parent directory is in configured roots'),
      )

      consoleSpy.mockRestore()
    })
  })
})
