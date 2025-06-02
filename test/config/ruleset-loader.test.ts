import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { loadRulesetFile } from '../../src/config/loader'
import type { RulesetConfig } from '../../src/config/schemas'

describe('Ruleset Loader', () => {
  const originalEnv = process.env
  const testConfigDir = path.join(
    os.tmpdir(),
    'test-ruleset-loader-' + Date.now(),
  )
  const rulesetsDir = path.join(testConfigDir, 'rulesets')

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.CLAUDE_COMPOSER_CONFIG_DIR = testConfigDir

    // Create test directories
    fs.mkdirSync(testConfigDir, { recursive: true })
    fs.mkdirSync(rulesetsDir, { recursive: true })
  })

  afterEach(() => {
    process.env = originalEnv
    // Clean up test directories
    fs.rmSync(testConfigDir, { recursive: true, force: true })
  })

  describe('loadRulesetFile', () => {
    it('should load a valid ruleset file', async () => {
      const rulesetContent = `
dismiss_edit_file_prompt_inside_project: true
dismiss_create_file_prompts_inside_project: false
dismiss_bash_command_prompts_inside_project: true
`
      fs.writeFileSync(path.join(rulesetsDir, 'test.yaml'), rulesetContent)

      const result = await loadRulesetFile('test')

      expect(result).toEqual({
        dismiss_edit_file_prompt_inside_project: true,
        dismiss_create_file_prompts_inside_project: false,
        dismiss_bash_command_prompts_inside_project: true,
      })
    })

    it('should handle empty ruleset file', async () => {
      fs.writeFileSync(path.join(rulesetsDir, 'empty.yaml'), '{}')

      const result = await loadRulesetFile('empty')

      expect(result).toEqual({})
    })

    it('should load partial ruleset configuration', async () => {
      const rulesetContent = `
dismiss_edit_file_prompt_inside_project: true
`
      fs.writeFileSync(path.join(rulesetsDir, 'partial.yaml'), rulesetContent)

      const result = await loadRulesetFile('partial')

      expect(result).toEqual({
        dismiss_edit_file_prompt_inside_project: true,
      })
    })

    it('should throw error for non-existent file', async () => {
      await expect(loadRulesetFile('non-existent')).rejects.toThrow(
        'Ruleset file not found',
      )
    })

    it('should throw error for invalid YAML', async () => {
      const invalidYaml = `{
dismiss_edit_file_prompt_inside_project: true
  invalid: syntax
`
      fs.writeFileSync(path.join(rulesetsDir, 'invalid.yaml'), invalidYaml)

      await expect(loadRulesetFile('invalid')).rejects.toThrow(
        'Error loading ruleset file',
      )
    })

    it('should validate schema and reject invalid fields', async () => {
      const invalidContent = `
dismiss_edit_file_prompt_inside_project: true
invalid_field: "should not be here"
`
      fs.writeFileSync(
        path.join(rulesetsDir, 'invalid-schema.yaml'),
        invalidContent,
      )

      await expect(loadRulesetFile('invalid-schema')).rejects.toThrow(
        'Ruleset validation failed',
      )
    })

    it('should validate schema and reject non-boolean values', async () => {
      const invalidContent = `
dismiss_edit_file_prompt_inside_project: "yes"
`
      fs.writeFileSync(
        path.join(rulesetsDir, 'invalid-type.yaml'),
        invalidContent,
      )

      await expect(loadRulesetFile('invalid-type')).rejects.toThrow(
        'Ruleset validation failed',
      )
    })

    it('should handle all possible ruleset fields', async () => {
      const fullContent = `
dismiss_edit_file_prompt_inside_project: true
dismiss_create_file_prompts_inside_project: false
dismiss_bash_command_prompts_inside_project: true
dismiss_edit_file_prompt_outside_project: false
dismiss_create_file_prompts_outside_project: true
dismiss_bash_command_prompts_outside_project: false
`
      fs.writeFileSync(path.join(rulesetsDir, 'full.yaml'), fullContent)

      const result = await loadRulesetFile('full')

      expect(result).toEqual({
        dismiss_edit_file_prompt_inside_project: true,
        dismiss_create_file_prompts_inside_project: false,
        dismiss_bash_command_prompts_inside_project: true,
        dismiss_edit_file_prompt_outside_project: false,
        dismiss_create_file_prompts_outside_project: true,
        dismiss_bash_command_prompts_outside_project: false,
      })
    })

    it('should handle YAML comments', async () => {
      const contentWithComments = `
# This ruleset is for development
dismiss_edit_file_prompt_inside_project: true # Allow edits inside
dismiss_create_file_prompts_inside_project: false # But confirm creates
# dismiss_bash_command_prompts_inside_project: true # Commented out
`
      fs.writeFileSync(
        path.join(rulesetsDir, 'comments.yaml'),
        contentWithComments,
      )

      const result = await loadRulesetFile('comments')

      expect(result).toEqual({
        dismiss_edit_file_prompt_inside_project: true,
        dismiss_create_file_prompts_inside_project: false,
      })
    })

    it('should handle different YAML formats', async () => {
      const jsonStyleContent = `
{
  "dismiss_edit_file_prompt_inside_project": true,
  "dismiss_create_file_prompts_inside_project": false
}
`
      fs.writeFileSync(
        path.join(rulesetsDir, 'json-style.yaml'),
        jsonStyleContent,
      )

      const result = await loadRulesetFile('json-style')

      expect(result).toEqual({
        dismiss_edit_file_prompt_inside_project: true,
        dismiss_create_file_prompts_inside_project: false,
      })
    })
  })
})
