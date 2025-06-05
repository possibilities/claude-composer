import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'
import { createTrustPromptPattern } from '../../src/patterns/registry'
import { type AppConfig } from '../../src/config/schemas'

vi.mock('../../src/utils/notifications', () => ({
  showNotification: vi.fn(),
}))

describe('allowTrustedRootPattern', () => {
  const originalCwd = process.cwd()
  let tempDir: string

  beforeEach(() => {
    vi.clearAllMocks()

    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'allow-trusted-root-test-'))
  })

  afterEach(() => {
    process.chdir(originalCwd)

    if (tempDir && fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true })
    }
  })

  it('should have correct pattern configuration', () => {
    const mockAppConfig: AppConfig = { roots: [] }
    const allowTrustedRootPattern = createTrustPromptPattern(
      () => mockAppConfig,
    )

    expect(allowTrustedRootPattern.id).toBe('allow-trusted-root')
    expect(allowTrustedRootPattern.title).toBe('Allow trusted root')
    expect(allowTrustedRootPattern.pattern).toEqual([
      'Claude Code may read files in this folder',
    ])
    expect(allowTrustedRootPattern.triggerText).toBe(
      'Claude Code may read files in this folder',
    )
    expect(typeof allowTrustedRootPattern.response).toBe('function')
  })

  describe('checkIfPwdParentInRoots', () => {
    it('should return No (3) when no roots are configured', () => {
      const mockAppConfig: AppConfig = { roots: [] }
      const allowTrustedRootPattern = createTrustPromptPattern(
        () => mockAppConfig,
      )
      const checkIfPwdParentInRoots =
        allowTrustedRootPattern.response as Function

      const result = checkIfPwdParentInRoots()
      expect(result).toEqual(['3'])
    })

    it('should return Yes (1) when parent directory matches a root', () => {
      const testRoot = path.join(tempDir, 'test-root')
      const testDir = path.join(testRoot, 'test-project')
      fs.mkdirSync(testDir, { recursive: true })

      const mockAppConfig: AppConfig = { roots: [testRoot] }
      const allowTrustedRootPattern = createTrustPromptPattern(
        () => mockAppConfig,
      )
      const checkIfPwdParentInRoots =
        allowTrustedRootPattern.response as Function

      process.chdir(testDir)

      const result = checkIfPwdParentInRoots()
      expect(result).toEqual(['1'])
    })

    it('should return No (3) when parent directory is under a root (not direct child)', () => {
      const testRoot = path.join(tempDir, 'test-root')
      const testDir = path.join(testRoot, 'sub', 'project')
      fs.mkdirSync(testDir, { recursive: true })

      const mockAppConfig: AppConfig = { roots: [testRoot] }
      const allowTrustedRootPattern = createTrustPromptPattern(
        () => mockAppConfig,
      )
      const checkIfPwdParentInRoots =
        allowTrustedRootPattern.response as Function

      process.chdir(testDir)

      const result = checkIfPwdParentInRoots()
      expect(result).toEqual(['3'])
    })

    it('should return No (3) when parent directory does not match any root', () => {
      const testRoot = path.join(tempDir, 'test-root')
      const testDir = path.join(tempDir, 'other-dir', 'project')
      fs.mkdirSync(testRoot, { recursive: true })
      fs.mkdirSync(testDir, { recursive: true })

      const mockAppConfig: AppConfig = { roots: [testRoot] }
      const allowTrustedRootPattern = createTrustPromptPattern(
        () => mockAppConfig,
      )
      const checkIfPwdParentInRoots =
        allowTrustedRootPattern.response as Function

      process.chdir(testDir)

      const result = checkIfPwdParentInRoots()
      expect(result).toEqual(['3'])
    })

    it('should expand ~ in root paths', () => {
      const testRoot = path.join(os.homedir(), 'test-root')
      const testDir = path.join(testRoot, 'project')
      fs.mkdirSync(testDir, { recursive: true })

      const mockAppConfig: AppConfig = { roots: ['~/test-root'] }
      const allowTrustedRootPattern = createTrustPromptPattern(
        () => mockAppConfig,
      )
      const checkIfPwdParentInRoots =
        allowTrustedRootPattern.response as Function

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

      const mockAppConfig: AppConfig = {
        roots: [firstRoot, secondRoot, thirdRoot],
      }
      const allowTrustedRootPattern = createTrustPromptPattern(
        () => mockAppConfig,
      )
      const checkIfPwdParentInRoots =
        allowTrustedRootPattern.response as Function

      process.chdir(testDir)

      const result = checkIfPwdParentInRoots()
      expect(result).toEqual(['1'])
    })

    it('should return No (3) on error', () => {
      const mockAppConfig: AppConfig = { roots: ['/some/root'] }
      const allowTrustedRootPattern = createTrustPromptPattern(
        () => mockAppConfig,
      )
      const checkIfPwdParentInRoots =
        allowTrustedRootPattern.response as Function

      const originalCwd = process.cwd
      process.cwd = () => {
        throw new Error('Test error')
      }

      const result = checkIfPwdParentInRoots()
      expect(result).toEqual(['3'])

      process.cwd = originalCwd
    })

    it('should show console output when trusting a directory', () => {
      const consoleSpy = vi.spyOn(console, 'log')
      const testRoot = path.join(tempDir, 'test-root')
      const testDir = path.join(testRoot, 'project')
      fs.mkdirSync(testDir, { recursive: true })

      const mockAppConfig: AppConfig = { roots: [testRoot] }
      const allowTrustedRootPattern = createTrustPromptPattern(
        () => mockAppConfig,
      )
      const checkIfPwdParentInRoots =
        allowTrustedRootPattern.response as Function

      process.chdir(testDir)

      const result = checkIfPwdParentInRoots()

      expect(result).toEqual(['1'])

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('TRUSTED ROOT DIRECTORY'),
      )
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Parent directory is in configured roots'),
      )

      consoleSpy.mockRestore()
    })
  })
})
