import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { fileURLToPath } from 'url'
import { loadRulesetFile } from '../../src/config/loader'

vi.mock('fs')

describe('Internal Ruleset Loading', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock fs.existsSync to return false by default
    vi.mocked(fs.existsSync).mockReturnValue(false)
  })

  describe('loadRulesetFile', () => {
    it('should load internal:cautious ruleset', async () => {
      // Mock the path resolution that happens in loader.ts
      vi.mocked(fs.existsSync).mockImplementation(filePath => {
        // The loader will look for internal rulesets relative to its own location
        return filePath.endsWith('internal-rulesets/cautious.yaml')
      })

      vi.mocked(fs.readFileSync).mockImplementation(filePath => {
        if (filePath.endsWith('internal-rulesets/cautious.yaml')) {
          return `accept_fetch_content_prompts: false

accept_global_create_file_prompts: false
accept_project_create_file_prompts: false

accept_global_edit_file_prompts: false
accept_project_edit_file_prompts: false

accept_global_read_files_prompts: false
accept_project_read_files_prompts: false

accept_global_bash_command_prompts: false
accept_project_bash_command_prompts: false`
        }
        throw new Error('File not found')
      })

      const ruleset = await loadRulesetFile('internal:cautious')

      expect(ruleset).toEqual({
        accept_fetch_content_prompts: false,
        accept_global_create_file_prompts: false,
        accept_project_create_file_prompts: false,
        accept_global_edit_file_prompts: false,
        accept_project_edit_file_prompts: false,
        accept_global_read_files_prompts: false,
        accept_project_read_files_prompts: false,
        accept_global_bash_command_prompts: false,
        accept_project_bash_command_prompts: false,
      })
    })

    it('should load internal:yolo ruleset', async () => {
      // Mock the path resolution that happens in loader.ts
      vi.mocked(fs.existsSync).mockImplementation(filePath => {
        // The loader will look for internal rulesets relative to its own location
        return filePath.endsWith('internal-rulesets/yolo.yaml')
      })

      vi.mocked(fs.readFileSync).mockImplementation(filePath => {
        if (filePath.endsWith('internal-rulesets/yolo.yaml')) {
          return `accept_fetch_content_prompts: true

accept_global_create_file_prompts: true
accept_project_create_file_prompts: true

accept_global_edit_file_prompts: true
accept_project_edit_file_prompts: true

accept_global_read_files_prompts: true
accept_project_read_files_prompts: true

accept_global_bash_command_prompts: true
accept_project_bash_command_prompts: true`
        }
        throw new Error('File not found')
      })

      const ruleset = await loadRulesetFile('internal:yolo')

      expect(ruleset).toEqual({
        accept_fetch_content_prompts: true,
        accept_global_create_file_prompts: true,
        accept_project_create_file_prompts: true,
        accept_global_edit_file_prompts: true,
        accept_project_edit_file_prompts: true,
        accept_global_read_files_prompts: true,
        accept_project_read_files_prompts: true,
        accept_global_bash_command_prompts: true,
        accept_project_bash_command_prompts: true,
      })
    })

    it('should load regular ruleset when not prefixed with internal:', async () => {
      vi.mocked(fs.existsSync).mockImplementation(filePath => {
        return (
          filePath === '/home/test/.claude-composer/rulesets/myruleset.yaml'
        )
      })

      vi.mocked(fs.readFileSync).mockImplementation(filePath => {
        if (
          filePath === '/home/test/.claude-composer/rulesets/myruleset.yaml'
        ) {
          return `
accept_fetch_content_prompts: true
accept_project_edit_file_prompts: false
`
        }
        throw new Error('File not found')
      })

      // Mock environment variable
      vi.stubEnv('CLAUDE_COMPOSER_CONFIG_DIR', '/home/test/.claude-composer')

      const ruleset = await loadRulesetFile('myruleset')

      expect(ruleset).toEqual({
        accept_fetch_content_prompts: true,
        accept_project_edit_file_prompts: false,
      })
    })

    it('should throw error when internal ruleset not found', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      await expect(loadRulesetFile('internal:nonexistent')).rejects.toThrow(
        'Ruleset file not found',
      )
    })

    it('should throw error when regular ruleset not found', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)
      vi.stubEnv('CLAUDE_COMPOSER_CONFIG_DIR', '/home/test/.claude-composer')

      await expect(loadRulesetFile('custom-ruleset')).rejects.toThrow(
        'Ruleset file not found',
      )
    })
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })
})
