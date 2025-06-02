import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import {
  parseRulesetConfig,
  validateRulesetConfig,
  type RulesetConfig,
} from '../../src/config/schemas'
import { loadRulesetFile } from '../../src/config/loader'
import { mergeRulesets, buildRulesetArgs } from '../../src/config/rulesets'
import { isFileInsideProject } from '../../src/utils/file-utils'

describe('Ruleset Configuration', () => {
  describe('Schema Validation', () => {
    it('should accept valid ruleset configuration', () => {
      const validConfig = {
        dismiss_edit_file_prompt_inside_project: true,
        dismiss_create_file_prompts_inside_project: false,
        dismiss_bash_command_prompts_inside_project: true,
        dismiss_edit_file_prompt_outside_project: false,
        dismiss_create_file_prompts_outside_project: true,
        dismiss_bash_command_prompts_outside_project: false,
      }

      const result = validateRulesetConfig(validConfig)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(validConfig)
      }
    })

    it('should accept partial ruleset configuration', () => {
      const partialConfig = {
        dismiss_edit_file_prompt_inside_project: true,
      }

      const result = validateRulesetConfig(partialConfig)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(partialConfig)
      }
    })

    it('should reject invalid fields', () => {
      const invalidConfig = {
        dismiss_edit_file_prompt_inside_project: true,
        invalid_field: 'should not be here',
      }

      const result = validateRulesetConfig(invalidConfig)
      expect(result.success).toBe(false)
    })

    it('should reject non-boolean values', () => {
      const invalidConfig = {
        dismiss_edit_file_prompt_inside_project: 'yes',
      }

      const result = validateRulesetConfig(invalidConfig)
      expect(result.success).toBe(false)
    })
  })

  describe('Ruleset Merging', () => {
    it('should merge multiple rulesets', () => {
      const ruleset1: RulesetConfig = {
        dismiss_edit_file_prompt_inside_project: true,
        dismiss_create_file_prompts_inside_project: false,
      }

      const ruleset2: RulesetConfig = {
        dismiss_create_file_prompts_inside_project: true,
        dismiss_bash_command_prompts_inside_project: true,
      }

      const merged = mergeRulesets([ruleset1, ruleset2])
      expect(merged).toEqual({
        dismiss_edit_file_prompt_inside_project: true,
        dismiss_create_file_prompts_inside_project: true,
        dismiss_bash_command_prompts_inside_project: true,
      })
    })

    it('should use least restrictive setting (true prevails)', () => {
      const ruleset1: RulesetConfig = {
        dismiss_edit_file_prompt_inside_project: false,
      }

      const ruleset2: RulesetConfig = {
        dismiss_edit_file_prompt_inside_project: true,
      }

      const merged = mergeRulesets([ruleset1, ruleset2])
      expect(merged.dismiss_edit_file_prompt_inside_project).toBe(true)
    })

    it('should preserve true value even if later ruleset has false', () => {
      const ruleset1: RulesetConfig = {
        dismiss_edit_file_prompt_inside_project: true,
      }

      const ruleset2: RulesetConfig = {
        dismiss_edit_file_prompt_inside_project: false,
      }

      const merged = mergeRulesets([ruleset1, ruleset2])
      expect(merged.dismiss_edit_file_prompt_inside_project).toBe(true)
    })
  })

  describe('Build Ruleset Args', () => {
    it('should build args for inside project rules', () => {
      const ruleset: RulesetConfig = {
        dismiss_edit_file_prompt_inside_project: true,
        dismiss_create_file_prompts_inside_project: true,
        dismiss_bash_command_prompts_inside_project: true,
      }

      const args = buildRulesetArgs(ruleset)
      expect(args).toContain('--dangerously-dismiss-edit-file-prompts')
      expect(args).toContain('--dangerously-dismiss-create-file-prompts')
      expect(args).toContain('--dangerously-dismiss-bash-command-prompts')
    })

    it('should build args for outside project rules', () => {
      const ruleset: RulesetConfig = {
        dismiss_edit_file_prompt_outside_project: true,
        dismiss_create_file_prompts_outside_project: true,
        dismiss_bash_command_prompts_outside_project: true,
      }

      const args = buildRulesetArgs(ruleset)
      expect(args).toContain('--dangerously-dismiss-edit-file-prompts')
      expect(args).toContain('--dangerously-dismiss-create-file-prompts')
      expect(args).toContain('--dangerously-dismiss-bash-command-prompts')
    })

    it('should not duplicate args when both inside and outside are true', () => {
      const ruleset: RulesetConfig = {
        dismiss_edit_file_prompt_inside_project: true,
        dismiss_edit_file_prompt_outside_project: true,
      }

      const args = buildRulesetArgs(ruleset)
      const editPromptArgs = args.filter(
        arg => arg === '--dangerously-dismiss-edit-file-prompts',
      )
      expect(editPromptArgs.length).toBe(1)
    })

    it('should return empty array for empty ruleset', () => {
      const ruleset: RulesetConfig = {}
      const args = buildRulesetArgs(ruleset)
      expect(args).toEqual([])
    })
  })

  describe('File Inside Project Check', () => {
    const originalCwd = process.cwd()
    const testProjectDir = '/tmp/test-project'

    beforeEach(() => {
      // Create test directory if it doesn't exist
      if (!fs.existsSync(testProjectDir)) {
        fs.mkdirSync(testProjectDir, { recursive: true })
      }
      process.chdir(testProjectDir)
    })

    afterEach(() => {
      process.chdir(originalCwd)
      // Clean up test directory
      if (fs.existsSync(testProjectDir)) {
        fs.rmSync(testProjectDir, { recursive: true, force: true })
      }
    })

    it('should identify files inside project', () => {
      expect(isFileInsideProject('file.txt')).toBe(true)
      expect(isFileInsideProject('./file.txt')).toBe(true)
      expect(isFileInsideProject('subdir/file.txt')).toBe(true)
      expect(isFileInsideProject('/tmp/test-project/file.txt')).toBe(true)
    })

    it('should identify files outside project', () => {
      expect(isFileInsideProject('../file.txt')).toBe(false)
      expect(isFileInsideProject('/home/user/file.txt')).toBe(false)
      expect(isFileInsideProject('/tmp/other-project/file.txt')).toBe(false)
    })
  })
})
