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
import { isFileInProjectRoot } from '../../src/utils/file-utils'

describe('Ruleset Configuration', () => {
  describe('Schema Validation', () => {
    it('should accept valid ruleset configuration', () => {
      const validConfig = {
        dismiss_project_edit_file_prompts: true,
        dismiss_project_create_file_prompts: false,
        dismiss_project_bash_command_prompts: true,
        dismiss_global_edit_file_prompts: false,
        dismiss_global_create_file_prompts: true,
        dismiss_global_bash_command_prompts: false,
      }

      const result = validateRulesetConfig(validConfig)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(validConfig)
      }
    })

    it('should accept partial ruleset configuration', () => {
      const partialConfig = {
        dismiss_project_edit_file_prompts: true,
      }

      const result = validateRulesetConfig(partialConfig)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(partialConfig)
      }
    })

    it('should reject invalid fields', () => {
      const invalidConfig = {
        dismiss_project_edit_file_prompts: true,
        invalid_field: 'should not be here',
      }

      const result = validateRulesetConfig(invalidConfig)
      expect(result.success).toBe(false)
    })

    it('should reject non-boolean values for simple string', () => {
      const invalidConfig = {
        dismiss_project_edit_file_prompts: 'yes',
      }

      const result = validateRulesetConfig(invalidConfig)
      expect(result.success).toBe(false)
    })

    it('should accept object with paths array', () => {
      const configWithPaths = {
        dismiss_project_edit_file_prompts: {
          paths: ['**/*.ts', 'src/**/*.js'],
        },
        dismiss_global_create_file_prompts: {
          paths: ['/tmp/**'],
        },
      }

      const result = validateRulesetConfig(configWithPaths)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(configWithPaths)
      }
    })

    it('should reject object with empty paths array', () => {
      const invalidConfig = {
        dismiss_project_edit_file_prompts: {
          paths: [],
        },
      }

      const result = validateRulesetConfig(invalidConfig)
      expect(result.success).toBe(false)
    })

    it('should reject object with invalid fields', () => {
      const invalidConfig = {
        dismiss_project_edit_file_prompts: {
          paths: ['**/*.ts'],
          invalid_field: true,
        },
      }

      const result = validateRulesetConfig(invalidConfig)
      expect(result.success).toBe(false)
    })

    it('should accept mixed boolean and object configurations', () => {
      const mixedConfig = {
        dismiss_project_edit_file_prompts: true,
        dismiss_project_create_file_prompts: {
          paths: ['**/*.test.ts'],
        },
        dismiss_global_edit_file_prompts: false,
      }

      const result = validateRulesetConfig(mixedConfig)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(mixedConfig)
      }
    })
  })

  describe('Ruleset Merging', () => {
    it('should merge multiple rulesets', () => {
      const ruleset1: RulesetConfig = {
        dismiss_project_edit_file_prompts: true,
        dismiss_project_create_file_prompts: false,
      }

      const ruleset2: RulesetConfig = {
        dismiss_project_create_file_prompts: true,
        dismiss_project_bash_command_prompts: true,
      }

      const merged = mergeRulesets([ruleset1, ruleset2])
      expect(merged).toEqual({
        dismiss_project_edit_file_prompts: true,
        dismiss_project_create_file_prompts: true,
        dismiss_project_bash_command_prompts: true,
      })
    })

    it('should use least restrictive setting (true prevails)', () => {
      const ruleset1: RulesetConfig = {
        dismiss_project_edit_file_prompts: false,
      }

      const ruleset2: RulesetConfig = {
        dismiss_project_edit_file_prompts: true,
      }

      const merged = mergeRulesets([ruleset1, ruleset2])
      expect(merged.dismiss_project_edit_file_prompts).toBe(true)
    })

    it('should preserve true value even if later ruleset has false', () => {
      const ruleset1: RulesetConfig = {
        dismiss_project_edit_file_prompts: true,
      }

      const ruleset2: RulesetConfig = {
        dismiss_project_edit_file_prompts: false,
      }

      const merged = mergeRulesets([ruleset1, ruleset2])
      expect(merged.dismiss_project_edit_file_prompts).toBe(true)
    })

    it('should merge path arrays from multiple rulesets', () => {
      const ruleset1: RulesetConfig = {
        dismiss_project_edit_file_prompts: {
          paths: ['**/*.ts', 'src/**/*.js'],
        },
      }

      const ruleset2: RulesetConfig = {
        dismiss_project_edit_file_prompts: {
          paths: ['**/*.tsx', 'src/**/*.js'], // Duplicate path should be deduped
        },
      }

      const merged = mergeRulesets([ruleset1, ruleset2])
      expect(merged.dismiss_project_edit_file_prompts).toEqual({
        paths: ['**/*.ts', 'src/**/*.js', '**/*.tsx'],
      })
    })

    it('should let boolean true override object config', () => {
      const ruleset1: RulesetConfig = {
        dismiss_project_edit_file_prompts: {
          paths: ['**/*.ts'],
        },
      }

      const ruleset2: RulesetConfig = {
        dismiss_project_edit_file_prompts: true,
      }

      const merged = mergeRulesets([ruleset1, ruleset2])
      expect(merged.dismiss_project_edit_file_prompts).toBe(true)
    })

    it('should preserve object config when later ruleset has false', () => {
      const ruleset1: RulesetConfig = {
        dismiss_project_edit_file_prompts: {
          paths: ['**/*.ts'],
        },
      }

      const ruleset2: RulesetConfig = {
        dismiss_project_edit_file_prompts: false,
      }

      const merged = mergeRulesets([ruleset1, ruleset2])
      expect(merged.dismiss_project_edit_file_prompts).toEqual({
        paths: ['**/*.ts'],
      })
    })

    it('should handle mixed configurations across different fields', () => {
      const ruleset1: RulesetConfig = {
        dismiss_project_edit_file_prompts: true,
        dismiss_project_create_file_prompts: {
          paths: ['**/*.test.ts'],
        },
        dismiss_global_edit_file_prompts: false,
      }

      const ruleset2: RulesetConfig = {
        dismiss_project_edit_file_prompts: {
          paths: ['src/**'],
        },
        dismiss_project_create_file_prompts: {
          paths: ['**/*.spec.ts'],
        },
        dismiss_global_create_file_prompts: true,
      }

      const merged = mergeRulesets([ruleset1, ruleset2])
      expect(merged).toEqual({
        dismiss_project_edit_file_prompts: true, // Boolean true wins
        dismiss_project_create_file_prompts: {
          paths: ['**/*.test.ts', '**/*.spec.ts'], // Arrays merged
        },
        dismiss_global_edit_file_prompts: false,
        dismiss_global_create_file_prompts: true,
      })
    })
  })

  describe('Build Ruleset Args', () => {
    it('should always return empty array since rulesets are handled in parent process', () => {
      const ruleset: RulesetConfig = {
        dismiss_project_edit_file_prompts: true,
        dismiss_project_create_file_prompts: true,
        dismiss_project_bash_command_prompts: true,
        dismiss_global_edit_file_prompts: true,
        dismiss_global_create_file_prompts: true,
        dismiss_global_bash_command_prompts: true,
      }

      const args = buildRulesetArgs(ruleset)
      expect(args).toEqual([])
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

    it('should identify files in project root', () => {
      expect(isFileInProjectRoot('file.txt')).toBe(true)
      expect(isFileInProjectRoot('./file.txt')).toBe(true)
      expect(isFileInProjectRoot('subdir/file.txt')).toBe(true)
      expect(isFileInProjectRoot('/tmp/test-project/file.txt')).toBe(true)
    })

    it('should identify files outside project root', () => {
      expect(isFileInProjectRoot('../file.txt')).toBe(false)
      expect(isFileInProjectRoot('/home/user/file.txt')).toBe(false)
      expect(isFileInProjectRoot('/tmp/other-project/file.txt')).toBe(false)
    })
  })
})
