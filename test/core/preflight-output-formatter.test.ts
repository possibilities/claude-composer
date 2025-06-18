import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { runPreflight } from '../../src/core/preflight'

vi.mock('fs')
vi.mock('../../src/config/loader')
vi.mock('../../src/utils/logging')
vi.mock('../../src/safety/checker', () => ({
  checkGitInstalled: vi.fn(),
  checkChildAppPath: vi.fn(),
  checkVersionControl: vi.fn().mockResolvedValue(true),
  checkDirtyDirectory: vi.fn().mockResolvedValue(false),
  handleAutomaticAcceptanceWarning: vi.fn().mockResolvedValue(true),
}))

describe('Preflight - Output Formatter', () => {
  let tempDir: string
  let formatterScript: string

  beforeEach(() => {
    vi.clearAllMocks()
    // Create a temporary directory for test files
    tempDir = '/tmp/preflight-formatter-test'
    formatterScript = path.join(tempDir, 'formatter.sh')

    // Mock fs.existsSync to return false for config files by default
    vi.mocked(fs.existsSync).mockImplementation(path => {
      if (typeof path === 'string') {
        if (path.includes('config.yaml')) return false
        if (path === formatterScript) return true
      }
      return false
    })

    // Mock fs.accessSync for executable check
    vi.mocked(fs.accessSync).mockImplementation((path, mode) => {
      if (path === formatterScript && mode === fs.constants.X_OK) {
        return // Success
      }
      throw new Error('Not executable')
    })
  })

  afterEach(() => {
    // No need to clean up since we're using mocked fs
  })

  it('should set output_formatter in appConfig when --output-formatter is provided', async () => {
    const argv = [
      'node',
      'script.js',
      '--output-formatter',
      formatterScript,
      '--print',
    ]

    const result = await runPreflight(argv)

    expect(result.appConfig.output_formatter).toBe(formatterScript)
    expect(result.shouldExit).toBe(true)
    expect(result.exitCode).toBe(0)
  })

  it('should validate formatter script exists when --print and --output-format json are present', async () => {
    const nonExistentScript = path.join(tempDir, 'non-existent.sh')
    const argv = [
      'node',
      'script.js',
      '--output-formatter',
      nonExistentScript,
      '--print',
      '--output-format',
      'json',
    ]

    vi.mocked(fs.existsSync).mockImplementation(path => {
      if (typeof path === 'string') {
        if (path.includes('config.yaml')) return true // Has config
        if (path === nonExistentScript) return false
      }
      return false
    })

    const result = await runPreflight(argv)

    expect(result.shouldExit).toBe(true)
    expect(result.exitCode).toBe(1)
  })

  it('should validate formatter script is executable when --print and --output-format stream-json are present', async () => {
    const argv = [
      'node',
      'script.js',
      '--output-formatter',
      formatterScript,
      '--print',
      '--output-format',
      'stream-json',
    ]

    vi.mocked(fs.existsSync).mockImplementation(path => {
      if (typeof path === 'string') {
        if (path.includes('config.yaml')) return true // Has config
        if (path === formatterScript) return true
      }
      return false
    })

    // Make accessSync throw for X_OK check
    vi.mocked(fs.accessSync).mockImplementation(() => {
      throw new Error('Permission denied')
    })

    const result = await runPreflight(argv)

    expect(result.shouldExit).toBe(true)
    expect(result.exitCode).toBe(1)
  })

  it('should not include --output-formatter in childArgs', async () => {
    const argv = [
      'node',
      'script.js',
      '--output-formatter',
      formatterScript,
      '--print',
      'hello',
    ]

    vi.mocked(fs.existsSync).mockReturnValue(true)

    const result = await runPreflight(argv)

    expect(result.childArgs).not.toContain('--output-formatter')
    expect(result.childArgs).not.toContain(formatterScript)
    expect(result.childArgs).toContain('--print')
    expect(result.childArgs).toContain('hello')
  })

  it('should handle output_formatter from config file', async () => {
    const configFormatter = '/usr/local/bin/config-formatter'

    const { loadConfigFile } = await import('../../src/config/loader')
    const mockedLoadConfigFile = vi.mocked(loadConfigFile)
    mockedLoadConfigFile.mockResolvedValue({
      output_formatter: configFormatter,
    })

    vi.mocked(fs.existsSync).mockImplementation(path => {
      if (typeof path === 'string') {
        if (path.includes('config.yaml')) return true
        if (path === configFormatter) return true
      }
      return false
    })

    vi.mocked(fs.accessSync).mockImplementation((path, mode) => {
      if (path === configFormatter && mode === fs.constants.X_OK) {
        return // Success
      }
      throw new Error('Not executable')
    })

    const argv = ['node', 'script.js', '--print', '--output-format', 'json']
    const result = await runPreflight(argv)

    expect(result.appConfig.output_formatter).toBe(configFormatter)
  })

  it('should prefer CLI flag over config file for output_formatter', async () => {
    const configFormatter = '/usr/local/bin/config-formatter'
    const cliFormatter = formatterScript

    const { loadConfigFile } = await import('../../src/config/loader')
    const mockedLoadConfigFile = vi.mocked(loadConfigFile)
    mockedLoadConfigFile.mockResolvedValue({
      output_formatter: configFormatter,
    })

    vi.mocked(fs.existsSync).mockReturnValue(true)

    const argv = [
      'node',
      'script.js',
      '--output-formatter',
      cliFormatter,
      '--print',
      '--output-format',
      'json',
    ]
    const result = await runPreflight(argv)

    expect(result.appConfig.output_formatter).toBe(cliFormatter)
  })

  it('should not validate formatter when --output-format is not json/stream-json', async () => {
    const argv = [
      'node',
      'script.js',
      '--output-formatter',
      '/non/existent/formatter',
      '--print',
      '--output-format',
      'text',
    ]

    vi.mocked(fs.existsSync).mockImplementation(path => {
      if (typeof path === 'string' && path.includes('config.yaml')) return true
      return false
    })

    const result = await runPreflight(argv)

    // Should succeed because formatter validation is skipped
    expect(result.shouldExit).toBe(true)
    expect(result.exitCode).toBe(0)
  })

  it('should not validate formatter when --print is missing', async () => {
    const argv = [
      'node',
      'script.js',
      '--output-formatter',
      '/non/existent/formatter',
      '--output-format',
      'json',
    ]

    vi.mocked(fs.existsSync).mockImplementation(path => {
      if (typeof path === 'string' && path.includes('config.yaml')) return true
      return false
    })

    const result = await runPreflight(argv)

    // Without --print, it's not a print operation, so it should continue normally
    // The formatter won't be validated because hasPrintOption is false
    expect(result.appConfig.output_formatter).toBe('/non/existent/formatter')
    // No validation error should occur
    expect(result.exitCode).not.toBe(1)
  })
})
