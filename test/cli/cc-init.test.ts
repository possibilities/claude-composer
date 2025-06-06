import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as yaml from 'js-yaml'

// Mock dependencies
vi.mock('fs')
vi.mock('../../src/config/paths', () => ({
  CONFIG_PATHS: {
    getConfigFilePath: vi
      .fn()
      .mockReturnValue('/mock/.claude-composer/config.yaml'),
    getConfigDirectory: vi.fn().mockReturnValue('/mock/.claude-composer'),
  },
}))
vi.mock('../../src/utils/logging', () => ({
  log: vi.fn(),
  warn: vi.fn(),
}))

// Mock prompts - must be done before imports
vi.mock('prompts')

import { handleCcInit } from '../../src/cli/cc-init'
import prompts from 'prompts'

describe('cc-init', () => {
  let mockConsoleLog: any
  let mockConsoleError: any
  let mockProcessExit: any
  const promptsMock = vi.mocked(prompts)

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks()

    // Mock console methods
    mockConsoleLog = vi.spyOn(console, 'log').mockImplementation(() => {})
    mockConsoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    // Mock process.exit
    mockProcessExit = vi
      .spyOn(process, 'exit')
      .mockImplementation((code?: number) => {
        throw new Error(`Process exited with code ${code}`)
      })

    // Setup default fs mocks
    vi.mocked(fs.existsSync).mockReturnValue(false)
    vi.mocked(fs.mkdirSync).mockImplementation(() => undefined as any)
    vi.mocked(fs.writeFileSync).mockImplementation(() => {})

    // Reset prompts mock
    promptsMock.mockReset()
    promptsMock.mockResolvedValue({})
  })

  afterEach(() => {
    mockConsoleLog.mockRestore()
    mockConsoleError.mockRestore()
    mockProcessExit.mockRestore()
  })

  describe('help text', () => {
    it('should display help text with --help flag', async () => {
      await expect(handleCcInit(['--help'])).rejects.toThrow(
        'Process exited with code 0',
      )

      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Usage: claude-composer cc-init [options]',
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        '  --no-use-core-toolset    Disable core toolset',
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('--use-safe-ruleset'),
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('--project'),
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        expect.stringContaining('Ruleset options'),
      )
    })

    it('should display help text with -h flag', async () => {
      await expect(handleCcInit(['-h'])).rejects.toThrow(
        'Process exited with code 0',
      )
      expect(mockConsoleLog).toHaveBeenCalledWith(
        'Usage: claude-composer cc-init [options]',
      )
    })
  })

  describe('command line options', () => {
    it('should create config with --use-yolo-ruleset and --no-use-core-toolset', async () => {
      await handleCcInit(['--use-yolo-ruleset', '--no-use-core-toolset'])

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '/mock/.claude-composer/config.yaml',
        expect.stringContaining('internal:yolo'),
        'utf8',
      )

      // Verify no toolsets are included
      const writtenContent = vi.mocked(fs.writeFileSync).mock
        .calls[0][1] as string
      expect(writtenContent).not.toContain('toolsets')
      expect(writtenContent).not.toContain('internal:core')
    })

    it('should create config with --use-cautious-ruleset and --use-core-toolset', async () => {
      await handleCcInit(['--use-cautious-ruleset', '--use-core-toolset'])

      const writtenContent = vi.mocked(fs.writeFileSync).mock
        .calls[0][1] as string
      expect(writtenContent).toContain('internal:cautious')
      expect(writtenContent).toContain('internal:core')
    })

    it('should create config with --use-safe-ruleset', async () => {
      await handleCcInit(['--use-safe-ruleset', '--use-core-toolset'])

      const writtenContent = vi.mocked(fs.writeFileSync).mock
        .calls[0][1] as string
      expect(writtenContent).toContain('internal:safe')
      expect(writtenContent).toContain('internal:core')
    })

    it('should include empty roots array in config', async () => {
      await handleCcInit(['--use-cautious-ruleset'])

      const writtenContent = vi.mocked(fs.writeFileSync).mock
        .calls[0][1] as string
      expect(writtenContent).toContain('roots: []')
    })

    it('should create project config with --project option when global config exists', async () => {
      // Mock global config exists
      vi.mocked(fs.existsSync).mockImplementation(path => {
        if (path === '/mock/.claude-composer/config.yaml') return true
        return false
      })

      await handleCcInit(['--project', '--use-cautious-ruleset'])

      expect(fs.writeFileSync).toHaveBeenCalledWith(
        '.claude-composer/config.yaml',
        expect.stringContaining('internal:cautious'),
        'utf8',
      )
      expect(fs.mkdirSync).toHaveBeenCalledWith('.claude-composer', {
        recursive: true,
      })
    })

    it('should fail with --project option when global config does not exist', async () => {
      // Mock global config does not exist
      vi.mocked(fs.existsSync).mockImplementation(() => false)

      await expect(
        handleCcInit(['--project', '--use-cautious-ruleset']),
      ).rejects.toThrow('Process exited with code 1')

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error: Cannot create project config without a global config.',
      )
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Please run "claude-composer cc-init" first to create a global configuration.',
      )
    })

    it('should reject mutually exclusive ruleset options', async () => {
      await expect(
        handleCcInit(['--use-yolo-ruleset', '--use-cautious-ruleset']),
      ).rejects.toThrow('Process exited with code 1')

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Ruleset options'),
      )
    })

    it('should reject three ruleset options', async () => {
      await expect(
        handleCcInit([
          '--use-yolo-ruleset',
          '--use-cautious-ruleset',
          '--use-safe-ruleset',
        ]),
      ).rejects.toThrow('Process exited with code 1')

      expect(mockConsoleError).toHaveBeenCalledWith(
        expect.stringContaining('Ruleset options'),
      )
    })

    it('should reject mutually exclusive toolset options', async () => {
      await expect(
        handleCcInit(['--use-core-toolset', '--no-use-core-toolset']),
      ).rejects.toThrow('Process exited with code 1')

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error: --use-core-toolset and --no-use-core-toolset are mutually exclusive',
      )
    })

    it('should reject unknown options', async () => {
      await expect(handleCcInit(['--unknown-option'])).rejects.toThrow(
        'Process exited with code 1',
      )
      expect(mockConsoleError).toHaveBeenCalledWith(
        'Unknown option: --unknown-option',
      )
    })
  })

  describe('interactive prompts', () => {
    it('should prompt for ruleset when none specified', async () => {
      promptsMock.mockResolvedValueOnce({ ruleset: 'cautious' })
      promptsMock.mockResolvedValueOnce({ useCoreToolset: true })

      await handleCcInit([])

      expect(promptsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'select',
          name: 'ruleset',
          message: 'Which ruleset would you like to use?',
          choices: expect.arrayContaining([
            expect.objectContaining({
              title: 'Cautious',
              value: 'cautious',
            }),
            expect.objectContaining({
              title: 'Safe',
              value: 'safe',
            }),
            expect.objectContaining({
              title: 'YOLO',
              value: 'yolo',
            }),
          ]),
        }),
        expect.any(Object),
      )

      const writtenContent = vi.mocked(fs.writeFileSync).mock
        .calls[0][1] as string
      expect(writtenContent).toContain('internal:cautious')
    })

    it('should prompt for toolset when none specified', async () => {
      promptsMock.mockResolvedValueOnce({ ruleset: 'yolo' })
      promptsMock.mockResolvedValueOnce({ useCoreToolset: false })

      await handleCcInit([])

      expect(promptsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'confirm',
          name: 'useCoreToolset',
          message: 'Would you like to enable the core toolset?',
          initial: true,
          hint: 'Includes MCP context7 tools for library documentation',
        }),
        expect.any(Object),
      )

      const writtenContent = vi.mocked(fs.writeFileSync).mock
        .calls[0][1] as string
      expect(writtenContent).toContain('internal:yolo')
      expect(writtenContent).not.toContain('toolsets')
    })

    it('should handle safe ruleset selection via prompt', async () => {
      promptsMock.mockResolvedValueOnce({ ruleset: 'safe' })
      promptsMock.mockResolvedValueOnce({ useCoreToolset: true })

      await handleCcInit([])

      const writtenContent = vi.mocked(fs.writeFileSync).mock
        .calls[0][1] as string
      expect(writtenContent).toContain('internal:safe')
      expect(writtenContent).toContain('internal:core')
    })

    it('should handle prompt cancellation', async () => {
      promptsMock.mockImplementationOnce((_, options) => {
        options.onCancel()
      })

      await expect(handleCcInit([])).rejects.toThrow(
        'Process exited with code 130',
      )
    })

    it('should not prompt when ruleset is specified via CLI', async () => {
      promptsMock.mockResolvedValueOnce({ useCoreToolset: true })

      await handleCcInit(['--use-cautious-ruleset'])

      // Should only be called once for toolset prompt
      expect(promptsMock).toHaveBeenCalledTimes(1)
      expect(promptsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'confirm',
          name: 'useCoreToolset',
        }),
        expect.any(Object),
      )
    })

    it('should not prompt when toolset is specified via CLI', async () => {
      promptsMock.mockResolvedValueOnce({ ruleset: 'cautious' })

      await handleCcInit(['--use-core-toolset'])

      // Should only be called once for ruleset prompt
      expect(promptsMock).toHaveBeenCalledTimes(1)
      expect(promptsMock).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'select',
          name: 'ruleset',
        }),
        expect.any(Object),
      )
    })
  })

  describe('file operations', () => {
    it('should create config directory if it does not exist', async () => {
      vi.mocked(fs.existsSync).mockImplementation(path => {
        if (path === '/mock/.claude-composer') return false
        return false
      })

      await handleCcInit(['--use-cautious-ruleset', '--use-core-toolset'])

      expect(fs.mkdirSync).toHaveBeenCalledWith('/mock/.claude-composer', {
        recursive: true,
      })
    })

    it('should error if config file already exists', async () => {
      vi.mocked(fs.existsSync).mockImplementation(path => {
        if (path === '/mock/.claude-composer/config.yaml') return true
        return false
      })

      await expect(handleCcInit(['--use-cautious-ruleset'])).rejects.toThrow(
        'Process exited with code 1',
      )

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error: Configuration file already exists at /mock/.claude-composer/config.yaml',
      )
    })

    it('should handle file write errors', async () => {
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw new Error('Write failed')
      })

      await expect(handleCcInit(['--use-cautious-ruleset'])).rejects.toThrow(
        'Process exited with code 1',
      )

      expect(mockConsoleError).toHaveBeenCalledWith(
        'Error writing configuration file:',
        expect.any(Error),
      )
    })
  })
})
