import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as path from 'path'
import picomatch from 'picomatch'
import type { MatchResult } from '../../src/patterns/matcher'
import type { AppConfig, RulesetConfig } from '../../src/config/schemas'
import { showNotification } from '../../src/utils/notifications'

// Mock the file-utils module
vi.mock('../../src/utils/file-utils', () => ({
  isFileInProjectRoot: vi.fn(),
}))

// Mock the notifications module
vi.mock('../../src/utils/notifications', () => ({
  showNotification: vi.fn().mockResolvedValue(undefined),
  showPatternNotification: vi.fn().mockResolvedValue(undefined),
}))

// Import after mocking
import { isFileInProjectRoot } from '../../src/utils/file-utils'

describe('Bash Command Path-based Acceptance Integration', () => {
  const mockIsFileInProjectRoot = isFileInProjectRoot as ReturnType<
    typeof vi.fn
  >
  const mockShowNotification = showNotification as ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // Replicate the checkAcceptConfig logic from index.ts
  function checkAcceptConfig(
    config: boolean | { paths: string[] } | undefined,
    filePath: string,
    isProjectContext: boolean,
  ): boolean {
    if (config === true) return true
    if (config === false || config === undefined) return false

    if (typeof config === 'object' && 'paths' in config) {
      const normalizedPath = path.normalize(filePath)
      const pathToCheck = isProjectContext
        ? path.relative(process.cwd(), normalizedPath) || '.'
        : normalizedPath

      const isMatch = picomatch(config.paths)
      return isMatch(pathToCheck)
    }

    return false
  }

  // Replicate the shouldAcceptPrompt logic from index.ts with path support
  function shouldAcceptPrompt(
    match: MatchResult,
    appConfig: AppConfig,
    mergedRuleset: RulesetConfig | undefined,
  ): boolean {
    const fileName = match.extractedData?.fileName
    const directory = match.extractedData?.directory

    let checkPath = fileName || directory || process.cwd()
    if (!checkPath) return false

    const isInProjectRoot = mockIsFileInProjectRoot(checkPath)

    switch (match.patternId) {
      case 'bash-command-prompt-format-1':
      case 'bash-command-prompt-format-2':
        if (appConfig.safe) return false
        if (!mergedRuleset) return false

        const bashConfig = isInProjectRoot
          ? mergedRuleset.accept_project_bash_command_prompts
          : mergedRuleset.accept_global_bash_command_prompts

        // If config is path-based but no directory is available, don't accept
        if (
          bashConfig &&
          typeof bashConfig === 'object' &&
          'paths' in bashConfig
        ) {
          if (!directory) {
            return false
          }
        }

        return isInProjectRoot
          ? checkAcceptConfig(
              mergedRuleset.accept_project_bash_command_prompts,
              checkPath,
              true,
            )
          : checkAcceptConfig(
              mergedRuleset.accept_global_bash_command_prompts,
              checkPath,
              false,
            )
      default:
        return false
    }
  }

  describe('Path-based bash command acceptance', () => {
    it('should accept bash command when directory matches path pattern', () => {
      // Setup: command running in src/utils directory
      const match: MatchResult = {
        patternId: 'bash-command-prompt-format-1',
        type: 'prompt',
        response: '1',
        extractedData: {
          directory: 'src/utils',
          command: 'npm test',
          reason: 'Running tests',
        },
        notification: 'Bash command prompt',
      }

      const appConfig: AppConfig = {
        safe: false,
      }

      const ruleset: RulesetConfig = {
        accept_project_bash_command_prompts: {
          paths: ['src/**', 'test/**'],
        },
      }

      // Mock that we're in project root
      mockIsFileInProjectRoot.mockReturnValue(true)

      const result = shouldAcceptPrompt(match, appConfig, ruleset)
      expect(result).toBe(true)
    })

    it('should not accept bash command when directory does not match pattern', () => {
      // Setup: command running in node_modules directory
      const match: MatchResult = {
        patternId: 'bash-command-prompt-format-1',
        type: 'prompt',
        response: '1',
        extractedData: {
          directory: 'node_modules/package',
          command: 'npm install',
          reason: 'Installing dependencies',
        },
        notification: 'Bash command prompt',
      }

      const appConfig: AppConfig = {
        dangerously_accept_bash_command_prompts: true,
      }

      const ruleset: RulesetConfig = {
        accept_project_bash_command_prompts: {
          paths: ['src/**', 'test/**'],
        },
      }

      // Mock that we're in project root
      mockIsFileInProjectRoot.mockReturnValue(true)

      const result = shouldAcceptPrompt(match, appConfig, ruleset)
      expect(result).toBe(false)
    })

    it('should not accept when no directory is provided with path config', () => {
      // Setup: format-2 prompt without directory
      const match: MatchResult = {
        patternId: 'bash-command-prompt-format-2',
        type: 'prompt',
        response: '1',
        extractedData: {
          command: 'npm test',
          reason: 'Running all tests',
          // No directory field
        },
        notification: 'Bash command prompt',
      }

      const appConfig: AppConfig = {
        dangerously_accept_bash_command_prompts: true,
      }

      const ruleset: RulesetConfig = {
        accept_project_bash_command_prompts: {
          paths: ['src/**'],
        },
      }

      // Mock that we're in project root
      mockIsFileInProjectRoot.mockReturnValue(true)

      const result = shouldAcceptPrompt(match, appConfig, ruleset)
      expect(result).toBe(false)
    })

    it('should accept all commands when config is boolean true', () => {
      // Setup: any command with boolean config
      const match: MatchResult = {
        patternId: 'bash-command-prompt-format-2',
        type: 'prompt',
        response: '1',
        extractedData: {
          command: 'rm -rf /',
          reason: 'Dangerous command',
          // No directory
        },
        notification: 'Bash command prompt',
      }

      const appConfig: AppConfig = {
        dangerously_accept_bash_command_prompts: true,
      }

      const ruleset: RulesetConfig = {
        accept_project_bash_command_prompts: true, // boolean true
      }

      // Mock that we're in project root
      mockIsFileInProjectRoot.mockReturnValue(true)

      const result = shouldAcceptPrompt(match, appConfig, ruleset)
      expect(result).toBe(true)
    })

    it('should use global config when not in project root', () => {
      // Setup: command running in /tmp directory
      const match: MatchResult = {
        patternId: 'bash-command-prompt-format-1',
        type: 'prompt',
        response: '1',
        extractedData: {
          directory: '/tmp/cache',
          command: 'rm -rf *',
          reason: 'Clearing cache',
        },
        notification: 'Bash command prompt',
      }

      const appConfig: AppConfig = {
        dangerously_accept_bash_command_prompts: true,
      }

      const ruleset: RulesetConfig = {
        accept_project_bash_command_prompts: {
          paths: ['src/**'],
        },
        accept_global_bash_command_prompts: {
          paths: ['/tmp/**', '/var/**'],
        },
      }

      // Mock that we're NOT in project root
      mockIsFileInProjectRoot.mockReturnValue(false)

      const result = shouldAcceptPrompt(match, appConfig, ruleset)
      expect(result).toBe(true)
    })

    it('should handle relative paths for project context', () => {
      const match: MatchResult = {
        patternId: 'bash-command-prompt-format-1',
        type: 'prompt',
        response: '1',
        extractedData: {
          directory: path.join(process.cwd(), 'src/components'),
          command: 'npm test',
          reason: 'Testing components',
        },
        notification: 'Bash command prompt',
      }

      const appConfig: AppConfig = {
        dangerously_accept_bash_command_prompts: true,
      }

      const ruleset: RulesetConfig = {
        accept_project_bash_command_prompts: {
          paths: ['src/**'],
        },
      }

      // Mock that we're in project root
      mockIsFileInProjectRoot.mockReturnValue(true)

      const result = shouldAcceptPrompt(match, appConfig, ruleset)
      expect(result).toBe(true)
    })
  })

  describe('Special notification handling', () => {
    // This tests the notification logic that would be in handlePatternMatches
    function shouldShowUnacceptableNotification(
      match: MatchResult,
      mergedRuleset: RulesetConfig | undefined,
    ): boolean {
      if (
        (match.patternId === 'bash-command-prompt-format-1' ||
          match.patternId === 'bash-command-prompt-format-2') &&
        !match.extractedData?.directory
      ) {
        const isInProjectRoot = mockIsFileInProjectRoot(process.cwd())
        const bashConfig = isInProjectRoot
          ? mergedRuleset?.accept_project_bash_command_prompts
          : mergedRuleset?.accept_global_bash_command_prompts

        if (
          bashConfig &&
          typeof bashConfig === 'object' &&
          'paths' in bashConfig
        ) {
          return true
        }
      }
      return false
    }

    it('should show unacceptable notification for missing directory with path config', () => {
      const match: MatchResult = {
        patternId: 'bash-command-prompt-format-2',
        type: 'prompt',
        response: '1',
        extractedData: {
          command: 'npm test',
          reason: 'Running tests',
          // No directory
        },
        notification: 'Bash command prompt',
      }

      const ruleset: RulesetConfig = {
        accept_project_bash_command_prompts: {
          paths: ['src/**'],
        },
      }

      mockIsFileInProjectRoot.mockReturnValue(true)

      const shouldShow = shouldShowUnacceptableNotification(match, ruleset)
      expect(shouldShow).toBe(true)
    })

    it('should not show unacceptable notification with boolean config', () => {
      const match: MatchResult = {
        patternId: 'bash-command-prompt-format-2',
        type: 'prompt',
        response: '1',
        extractedData: {
          command: 'npm test',
          reason: 'Running tests',
          // No directory
        },
        notification: 'Bash command prompt',
      }

      const ruleset: RulesetConfig = {
        accept_project_bash_command_prompts: true, // boolean
      }

      mockIsFileInProjectRoot.mockReturnValue(true)

      const shouldShow = shouldShowUnacceptableNotification(match, ruleset)
      expect(shouldShow).toBe(false)
    })

    it('should not show unacceptable notification when directory is present', () => {
      const match: MatchResult = {
        patternId: 'bash-command-prompt-format-1',
        type: 'prompt',
        response: '1',
        extractedData: {
          directory: 'src/utils',
          command: 'npm test',
          reason: 'Running tests',
        },
        notification: 'Bash command prompt',
      }

      const ruleset: RulesetConfig = {
        accept_project_bash_command_prompts: {
          paths: ['src/**'],
        },
      }

      mockIsFileInProjectRoot.mockReturnValue(true)

      const shouldShow = shouldShowUnacceptableNotification(match, ruleset)
      expect(shouldShow).toBe(false)
    })
  })
})
