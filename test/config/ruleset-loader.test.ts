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
accept_project_edit_file_prompts: true
accept_project_create_file_prompts: false
accept_project_bash_command_prompts: true
`
      fs.writeFileSync(path.join(rulesetsDir, 'test.yaml'), rulesetContent)

      const result = await loadRulesetFile('test')

      expect(result).toEqual({
        accept_project_edit_file_prompts: true,
        accept_project_create_file_prompts: false,
        accept_project_bash_command_prompts: true,
      })
    })

    it('should handle empty ruleset file', async () => {
      fs.writeFileSync(path.join(rulesetsDir, 'empty.yaml'), '{}')

      const result = await loadRulesetFile('empty')

      expect(result).toEqual({})
    })

    it('should load partial ruleset configuration', async () => {
      const rulesetContent = `
accept_project_edit_file_prompts: true
`
      fs.writeFileSync(path.join(rulesetsDir, 'partial.yaml'), rulesetContent)

      const result = await loadRulesetFile('partial')

      expect(result).toEqual({
        accept_project_edit_file_prompts: true,
      })
    })

    it('should throw error for non-existent file', async () => {
      await expect(loadRulesetFile('non-existent')).rejects.toThrow(
        'Ruleset file not found',
      )
    })

    it('should throw error for invalid YAML', async () => {
      const invalidYaml = `{
accept_project_edit_file_prompts: true
  invalid: syntax
`
      fs.writeFileSync(path.join(rulesetsDir, 'invalid.yaml'), invalidYaml)

      await expect(loadRulesetFile('invalid')).rejects.toThrow(
        'Error loading ruleset file',
      )
    })

    it('should validate schema and reject invalid fields', async () => {
      const invalidContent = `
accept_project_edit_file_prompts: true
invalid_field: "should not be here"
`
      fs.writeFileSync(
        path.join(rulesetsDir, 'invalid-schema.yaml'),
        invalidContent,
      )

      await expect(loadRulesetFile('invalid-schema')).rejects.toThrow(
        'ruleset configuration validation failed',
      )
    })

    it('should validate schema and reject non-boolean values', async () => {
      const invalidContent = `
accept_project_edit_file_prompts: "yes"
`
      fs.writeFileSync(
        path.join(rulesetsDir, 'invalid-type.yaml'),
        invalidContent,
      )

      await expect(loadRulesetFile('invalid-type')).rejects.toThrow(
        'ruleset configuration validation failed',
      )
    })

    it('should handle all possible ruleset fields', async () => {
      const fullContent = `
accept_project_edit_file_prompts: true
accept_project_create_file_prompts: false
accept_project_bash_command_prompts: true
accept_global_edit_file_prompts: false
accept_global_create_file_prompts: true
accept_global_bash_command_prompts: false
`
      fs.writeFileSync(path.join(rulesetsDir, 'full.yaml'), fullContent)

      const result = await loadRulesetFile('full')

      expect(result).toEqual({
        accept_project_edit_file_prompts: true,
        accept_project_create_file_prompts: false,
        accept_project_bash_command_prompts: true,
        accept_global_edit_file_prompts: false,
        accept_global_create_file_prompts: true,
        accept_global_bash_command_prompts: false,
      })
    })

    it('should handle YAML comments', async () => {
      const contentWithComments = `
# This ruleset is for development
accept_project_edit_file_prompts: true # Allow edits inside
accept_project_create_file_prompts: false # But confirm creates
# accept_project_bash_command_prompts: true # Commented out
`
      fs.writeFileSync(
        path.join(rulesetsDir, 'comments.yaml'),
        contentWithComments,
      )

      const result = await loadRulesetFile('comments')

      expect(result).toEqual({
        accept_project_edit_file_prompts: true,
        accept_project_create_file_prompts: false,
      })
    })

    it('should handle different YAML formats', async () => {
      const jsonStyleContent = `
{
  "accept_project_edit_file_prompts": true,
  "accept_project_create_file_prompts": false
}
`
      fs.writeFileSync(
        path.join(rulesetsDir, 'json-style.yaml'),
        jsonStyleContent,
      )

      const result = await loadRulesetFile('json-style')

      expect(result).toEqual({
        accept_project_edit_file_prompts: true,
        accept_project_create_file_prompts: false,
      })
    })
  })
})
