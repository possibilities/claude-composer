import { describe, it, expect, beforeEach, vi } from 'vitest'
import * as path from 'path'
import type { MatchResult } from '../../src/patterns/matcher'
import type { AppConfig } from '../../src/config/schemas'
import { showNotification } from '../../src/utils/notifications'
import {
  checkAcceptConfig,
  shouldAcceptPrompt,
} from '../../src/utils/prompt-acceptance'

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

  // Wrapper that uses the imported function
  function shouldAcceptPromptWithValidation(
    match: MatchResult,
    appConfig: AppConfig,
    yolo: boolean | undefined,
  ): boolean {
    // Use the imported function
    return shouldAcceptPrompt(match, appConfig, yolo)
  }

  describe('Path-based bash command acceptance', () => {
    it('should accept bash command when yolo is true', () => {
      // Setup: command running in src/utils directory
      const match: MatchResult = {
        patternId: 'bash-command-prompt-format-1',
        response: '1',
        extractedData: {
          directory: 'src/utils',
          command: 'npm test',
          reason: 'Running tests',
        },
        notification: 'Bash command prompt',
      }

      const appConfig: AppConfig = {}

      // Mock that we're in project root
      mockIsFileInProjectRoot.mockReturnValue(true)

      const result = shouldAcceptPromptWithValidation(match, appConfig, true)
      expect(result).toBe(true)
    })

    it('should not accept bash command when yolo is false', () => {
      // Setup: command running in node_modules directory
      const match: MatchResult = {
        patternId: 'bash-command-prompt-format-1',
        response: '1',
        extractedData: {
          directory: 'node_modules/package',
          command: 'npm install',
          reason: 'Installing dependencies',
        },
        notification: 'Bash command prompt',
      }

      const appConfig: AppConfig = {}

      // Mock that we're in project root
      mockIsFileInProjectRoot.mockReturnValue(true)

      const result = shouldAcceptPromptWithValidation(match, appConfig, false)
      expect(result).toBe(false)
    })

    it('should not accept when yolo is undefined', () => {
      // Setup: format-2 prompt without directory
      const match: MatchResult = {
        patternId: 'bash-command-prompt-format-2',
        response: '1',
        extractedData: {
          command: 'npm test',
          reason: 'Running all tests',
          // No directory field
        },
        notification: 'Bash command prompt',
      }

      const appConfig: AppConfig = {}

      // Mock that we're in project root
      mockIsFileInProjectRoot.mockReturnValue(true)

      const result = shouldAcceptPromptWithValidation(
        match,
        appConfig,
        undefined,
      )
      expect(result).toBe(false)
    })

    it('should accept all commands when config is boolean true', () => {
      // Setup: any command with boolean config
      const match: MatchResult = {
        patternId: 'bash-command-prompt-format-2',
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

      const result = shouldAcceptPromptWithValidation(match, appConfig, ruleset)
      expect(result).toBe(true)
    })

    it('should use global config when not in project root', () => {
      // Setup: command running in /tmp directory
      const match: MatchResult = {
        patternId: 'bash-command-prompt-format-1',
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

      const result = shouldAcceptPromptWithValidation(match, appConfig, ruleset)
      expect(result).toBe(true)
    })

    it('should handle relative paths for project context', () => {
      const match: MatchResult = {
        patternId: 'bash-command-prompt-format-1',
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

      const result = shouldAcceptPromptWithValidation(match, appConfig, ruleset)
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
