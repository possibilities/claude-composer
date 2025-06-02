import { describe, it, expect, beforeEach, vi } from 'vitest'
import type { MatchResult } from '../../src/patterns/matcher'
import type { AppConfig, RulesetConfig } from '../../src/config/schemas'

// Mock the file-utils module
vi.mock('../../src/utils/file-utils', () => ({
  isFileInsideProject: vi.fn(),
}))

// Import after mocking
import { isFileInsideProject } from '../../src/utils/file-utils'

describe('Ruleset Pattern Integration', () => {
  const mockIsFileInsideProject = isFileInsideProject as ReturnType<
    typeof vi.fn
  >

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // We need to test the shouldDismissPrompt logic
  // Since it's defined inside index.ts, we'll test the logic here
  function shouldDismissPrompt(
    match: MatchResult,
    appConfig: AppConfig,
    mergedRuleset: RulesetConfig | undefined,
  ): boolean {
    const fileName = match.extractedData?.fileName
    const directory = match.extractedData?.directory

    let checkPath = fileName || directory || process.cwd()
    if (!checkPath) return false

    const isInside = mockIsFileInsideProject(checkPath)

    switch (match.patternId) {
      case 'edit-file-prompt':
        if (appConfig.dangerously_dismiss_edit_file_prompts) return true
        if (!mergedRuleset) return false
        return isInside
          ? mergedRuleset.dismiss_edit_file_prompt_inside_project === true
          : mergedRuleset.dismiss_edit_file_prompt_outside_project === true
      case 'create-file-prompt':
        if (appConfig.dangerously_dismiss_create_file_prompts) return true
        if (!mergedRuleset) return false
        return isInside
          ? mergedRuleset.dismiss_create_file_prompts_inside_project === true
          : mergedRuleset.dismiss_create_file_prompts_outside_project === true
      case 'bash-command-prompt-format-1':
      case 'bash-command-prompt-format-2':
        if (appConfig.dangerously_dismiss_bash_command_prompts) return true
        if (!mergedRuleset) return false
        return isInside
          ? mergedRuleset.dismiss_bash_command_prompts_inside_project === true
          : mergedRuleset.dismiss_bash_command_prompts_outside_project === true
      default:
        return true
    }
  }

  describe('Edit File Prompts', () => {
    const createEditMatch = (fileName: string): MatchResult => ({
      patternId: 'edit-file-prompt',
      response: '1',
      notification: 'Edit file',
      extractedData: { fileName },
    })

    it('should not dismiss when no ruleset is active', () => {
      const match = createEditMatch('/project/file.txt')
      const appConfig: AppConfig = {}

      expect(shouldDismissPrompt(match, appConfig, undefined)).toBe(false)
    })

    it('should dismiss inside project files when ruleset specifies', () => {
      mockIsFileInsideProject.mockReturnValue(true)
      const match = createEditMatch('./src/file.txt')
      const appConfig: AppConfig = {}
      const ruleset: RulesetConfig = {
        dismiss_edit_file_prompt_inside_project: true,
        dismiss_edit_file_prompt_outside_project: false,
      }

      expect(shouldDismissPrompt(match, appConfig, ruleset)).toBe(true)
    })

    it('should not dismiss outside project files when ruleset specifies', () => {
      mockIsFileInsideProject.mockReturnValue(false)
      const match = createEditMatch('/etc/config.txt')
      const appConfig: AppConfig = {}
      const ruleset: RulesetConfig = {
        dismiss_edit_file_prompt_inside_project: true,
        dismiss_edit_file_prompt_outside_project: false,
      }

      expect(shouldDismissPrompt(match, appConfig, ruleset)).toBe(false)
    })

    it('should respect global dangerous flag over ruleset', () => {
      mockIsFileInsideProject.mockReturnValue(false)
      const match = createEditMatch('/etc/config.txt')
      const appConfig: AppConfig = {
        dangerously_dismiss_edit_file_prompts: true,
      }
      const ruleset: RulesetConfig = {
        dismiss_edit_file_prompt_outside_project: false,
      }

      expect(shouldDismissPrompt(match, appConfig, ruleset)).toBe(true)
    })
  })

  describe('Create File Prompts', () => {
    const createFileMatch = (fileName: string): MatchResult => ({
      patternId: 'create-file-prompt',
      response: '1',
      notification: 'Create file',
      extractedData: { fileName },
    })

    it('should handle create file prompts with ruleset', () => {
      mockIsFileInsideProject.mockReturnValue(true)
      const match = createFileMatch('./newfile.txt')
      const appConfig: AppConfig = {}
      const ruleset: RulesetConfig = {
        dismiss_create_file_prompts_inside_project: true,
      }

      expect(shouldDismissPrompt(match, appConfig, ruleset)).toBe(true)
    })

    it('should not dismiss when ruleset says false', () => {
      mockIsFileInsideProject.mockReturnValue(true)
      const match = createFileMatch('./newfile.txt')
      const appConfig: AppConfig = {}
      const ruleset: RulesetConfig = {
        dismiss_create_file_prompts_inside_project: false,
      }

      expect(shouldDismissPrompt(match, appConfig, ruleset)).toBe(false)
    })
  })

  describe('Bash Command Prompts', () => {
    const createBashMatch = (
      directory: string,
      format: number = 1,
    ): MatchResult => ({
      patternId: `bash-command-prompt-format-${format}`,
      response: '1',
      notification: 'Bash command',
      extractedData: {
        command: 'ls -la',
        directory,
      },
    })

    it('should handle bash commands in project directory', () => {
      mockIsFileInsideProject.mockReturnValue(true)
      const match = createBashMatch('./src')
      const appConfig: AppConfig = {}
      const ruleset: RulesetConfig = {
        dismiss_bash_command_prompts_inside_project: true,
      }

      expect(shouldDismissPrompt(match, appConfig, ruleset)).toBe(true)
    })

    it('should handle bash commands outside project', () => {
      mockIsFileInsideProject.mockReturnValue(false)
      const match = createBashMatch('/tmp')
      const appConfig: AppConfig = {}
      const ruleset: RulesetConfig = {
        dismiss_bash_command_prompts_inside_project: true,
        dismiss_bash_command_prompts_outside_project: false,
      }

      expect(shouldDismissPrompt(match, appConfig, ruleset)).toBe(false)
    })

    it('should handle both bash command formats', () => {
      mockIsFileInsideProject.mockReturnValue(true)
      const match1 = createBashMatch('./src', 1)
      const match2 = createBashMatch('./src', 2)
      const appConfig: AppConfig = {}
      const ruleset: RulesetConfig = {
        dismiss_bash_command_prompts_inside_project: true,
      }

      expect(shouldDismissPrompt(match1, appConfig, ruleset)).toBe(true)
      expect(shouldDismissPrompt(match2, appConfig, ruleset)).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should use current directory when no path can be determined', () => {
      const match: MatchResult = {
        patternId: 'edit-file-prompt',
        response: '1',
        extractedData: {}, // No fileName or directory
      }
      const appConfig: AppConfig = {}
      const ruleset: RulesetConfig = {
        dismiss_edit_file_prompt_inside_project: true,
      }

      // Mock isFileInsideProject to return true for process.cwd()
      mockIsFileInsideProject.mockReturnValue(true)

      expect(shouldDismissPrompt(match, appConfig, ruleset)).toBe(true)
      expect(mockIsFileInsideProject).toHaveBeenCalledWith(process.cwd())
    })

    it('should return true for unknown pattern types', () => {
      const match: MatchResult = {
        patternId: 'unknown-pattern',
        response: '1',
        extractedData: {},
      }
      const appConfig: AppConfig = {}
      const ruleset: RulesetConfig = {}

      expect(shouldDismissPrompt(match, appConfig, ruleset)).toBe(true)
    })

    it('should use current directory as fallback for bash commands', () => {
      mockIsFileInsideProject.mockReturnValue(true)
      const match: MatchResult = {
        patternId: 'bash-command-prompt-format-1',
        response: '1',
        extractedData: { command: 'pwd' }, // No directory specified
      }
      const appConfig: AppConfig = {}
      const ruleset: RulesetConfig = {
        dismiss_bash_command_prompts_inside_project: true,
      }

      expect(shouldDismissPrompt(match, appConfig, ruleset)).toBe(true)
      expect(mockIsFileInsideProject).toHaveBeenCalledWith(process.cwd())
    })
  })

  describe('Mixed Configurations', () => {
    const createEditMatch = (fileName: string): MatchResult => ({
      patternId: 'edit-file-prompt',
      response: '1',
      notification: 'Edit file',
      extractedData: { fileName },
    })

    const createFileMatch = (fileName: string): MatchResult => ({
      patternId: 'create-file-prompt',
      response: '1',
      notification: 'Create file',
      extractedData: { fileName },
    })

    it('should handle partial ruleset configurations', () => {
      mockIsFileInsideProject.mockReturnValue(true)
      const editMatch = createEditMatch('./file.txt')
      const createMatch = createFileMatch('./newfile.txt')

      const appConfig: AppConfig = {}
      const ruleset: RulesetConfig = {
        dismiss_edit_file_prompt_inside_project: true,
        // create file rule not specified
      }

      expect(shouldDismissPrompt(editMatch, appConfig, ruleset)).toBe(true)
      expect(shouldDismissPrompt(createMatch, appConfig, ruleset)).toBe(false)
    })

    it('should handle all prompts with complete ruleset', () => {
      mockIsFileInsideProject.mockReturnValue(true)

      const appConfig: AppConfig = {}
      const ruleset: RulesetConfig = {
        dismiss_edit_file_prompt_inside_project: true,
        dismiss_create_file_prompts_inside_project: true,
        dismiss_bash_command_prompts_inside_project: true,
        dismiss_edit_file_prompt_outside_project: false,
        dismiss_create_file_prompts_outside_project: false,
        dismiss_bash_command_prompts_outside_project: false,
      }

      const insideEdit = createEditMatch('./file.txt')
      expect(shouldDismissPrompt(insideEdit, appConfig, ruleset)).toBe(true)

      mockIsFileInsideProject.mockReturnValue(false)
      const outsideEdit = createEditMatch('/etc/file.txt')
      expect(shouldDismissPrompt(outsideEdit, appConfig, ruleset)).toBe(false)
    })
  })
})
