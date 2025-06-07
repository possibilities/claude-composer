import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { createAppReadyPattern } from '../../src/patterns/registry'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'

describe('App Ready Pattern', () => {
  const mockGetAppConfig = () => ({
    pipedInputPath: undefined,
    mode: undefined,
  })
  const appReadyPattern = createAppReadyPattern(mockGetAppConfig)

  it('should have correct pattern configuration', () => {
    expect(appReadyPattern.id).toBe('app-ready-handler')
    expect(appReadyPattern.title).toBe('App ready handler')
    expect(appReadyPattern.pattern).toEqual(['? for shortcuts'])
    expect(appReadyPattern.triggerText).toBe('? for shortcuts')
  })

  it('should have a response function', () => {
    expect(appReadyPattern.response).toBeDefined()
    expect(typeof appReadyPattern.response).toBe('function')
  })

  it('should return undefined when no piped input path', () => {
    const response = appReadyPattern.response as () => string[] | undefined
    const result = response()
    expect(result).toBeUndefined()
  })

  it('should return shift-tab commands when in plan mode', () => {
    const mockConfigWithPlanMode = () => ({
      pipedInputPath: undefined,
      mode: 'plan',
    })
    const planModePattern = createAppReadyPattern(mockConfigWithPlanMode)
    const response = planModePattern.response as () =>
      | (string | number)[]
      | undefined
    const result = response()
    expect(result).toEqual(['\x1b[Z', 100, '\x1b[Z'])
  })

  describe('Plan mode with piped input', () => {
    let tempDir: string
    let pipedInputPath: string

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-ready-test-'))
      pipedInputPath = path.join(tempDir, 'piped-input.txt')
    })

    afterEach(() => {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    })

    it('should return shift-tab twice followed by content in plan mode with piped input', () => {
      const testContent = 'Hello from piped input'
      fs.writeFileSync(pipedInputPath, testContent)

      const mockConfigWithContent = () => ({
        pipedInputPath,
        mode: 'plan',
      })
      const pattern = createAppReadyPattern(mockConfigWithContent)
      const response = pattern.response as () => (string | number)[] | undefined
      const result = response()

      expect(result).toEqual([
        '\x1b[Z',
        100,
        '\x1b[Z',
        100,
        testContent,
        500,
        '\r',
      ])
    })

    it('should handle empty piped input file in plan mode', () => {
      fs.writeFileSync(pipedInputPath, '')

      const mockConfigWithEmptyFile = () => ({
        pipedInputPath,
        mode: 'plan',
      })
      const pattern = createAppReadyPattern(mockConfigWithEmptyFile)
      const response = pattern.response as () => (string | number)[] | undefined
      const result = response()

      expect(result).toEqual(['\x1b[Z', 100, '\x1b[Z'])
    })

    it('should trim trailing whitespace from piped content', () => {
      const testContent = 'Test content with trailing spaces   \n\n'
      fs.writeFileSync(pipedInputPath, testContent)

      const mockConfigWithContent = () => ({
        pipedInputPath,
        mode: 'plan',
      })
      const pattern = createAppReadyPattern(mockConfigWithContent)
      const response = pattern.response as () => (string | number)[] | undefined
      const result = response()

      expect(result).toEqual([
        '\x1b[Z',
        100,
        '\x1b[Z',
        100,
        'Test content with trailing spaces',
        500,
        '\r',
      ])
    })
  })

  describe('Normal mode (non-plan) with piped input', () => {
    let tempDir: string
    let pipedInputPath: string

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'app-ready-test-'))
      pipedInputPath = path.join(tempDir, 'piped-input.txt')
    })

    afterEach(() => {
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true })
      }
    })

    it('should return content with delay and carriage return in normal mode', () => {
      const testContent = 'Normal mode piped input'
      fs.writeFileSync(pipedInputPath, testContent)

      const mockConfigWithContent = () => ({
        pipedInputPath,
        mode: undefined,
      })
      const pattern = createAppReadyPattern(mockConfigWithContent)
      const response = pattern.response as () => (string | number)[] | undefined
      const result = response()

      expect(result).toEqual([testContent, 500, '\r'])
    })

    it('should return undefined for empty file in normal mode', () => {
      fs.writeFileSync(pipedInputPath, '')

      const mockConfigWithEmptyFile = () => ({
        pipedInputPath,
        mode: undefined,
      })
      const pattern = createAppReadyPattern(mockConfigWithEmptyFile)
      const response = pattern.response as () => (string | number)[] | undefined
      const result = response()

      expect(result).toBeUndefined()
    })

    it('should return undefined when file does not exist', () => {
      const mockConfigWithMissingFile = () => ({
        pipedInputPath: '/nonexistent/file.txt',
        mode: undefined,
      })
      const pattern = createAppReadyPattern(mockConfigWithMissingFile)
      const response = pattern.response as () => (string | number)[] | undefined
      const result = response()

      expect(result).toBeUndefined()
    })
  })
})
