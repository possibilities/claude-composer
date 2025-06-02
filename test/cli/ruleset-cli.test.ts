import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as os from 'os'
import * as path from 'path'
import { runPreflight } from '../../src/core/preflight'
import { mergeRulesets } from '../../src/config/rulesets'

describe('Ruleset CLI Integration', () => {
  const originalEnv = process.env
  const testConfigDir = path.join(
    os.tmpdir(),
    'test-claude-composer-' + Date.now(),
  )
  const rulesetsDir = path.join(testConfigDir, 'rulesets')

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.CLAUDE_COMPOSER_CONFIG_DIR = testConfigDir
    // Use a path that exists on the system
    process.env.CLAUDE_APP_PATH = process.execPath // Use node executable as mock

    // Create test directories
    fs.mkdirSync(testConfigDir, { recursive: true })
    fs.mkdirSync(rulesetsDir, { recursive: true })

    // Create a config file that allows running in dirty directory and without version control
    const configContent = `
dangerously_allow_in_dirty_directory: true
dangerously_allow_without_version_control: true
`
    fs.writeFileSync(path.join(testConfigDir, 'config.yaml'), configContent)
  })

  afterEach(() => {
    process.env = originalEnv
    // Clean up test directories
    fs.rmSync(testConfigDir, { recursive: true, force: true })
  })

  describe('--ruleset flag', () => {
    it('should load a single ruleset from CLI', async () => {
      // Create a test ruleset file
      const rulesetContent = `
dismiss_project_edit_file_prompts: true
dismiss_project_create_file_prompts: false
`
      fs.writeFileSync(
        path.join(rulesetsDir, 'test-ruleset.yaml'),
        rulesetContent,
      )

      const result = await runPreflight([
        'node',
        'cli',
        '--ruleset',
        'test-ruleset',
      ])

      expect(result.mergedRuleset).toBeDefined()
      expect(result.mergedRuleset?.dismiss_project_edit_file_prompts).toBe(true)
      expect(result.mergedRuleset?.dismiss_project_create_file_prompts).toBe(
        false,
      )
    })

    it('should load multiple rulesets from CLI', async () => {
      // Create test ruleset files
      const ruleset1 = `
dismiss_project_edit_file_prompts: true
dismiss_project_create_file_prompts: false
`
      const ruleset2 = `
dismiss_project_create_file_prompts: true
dismiss_project_bash_command_prompts: true
`
      fs.writeFileSync(path.join(rulesetsDir, 'ruleset1.yaml'), ruleset1)
      fs.writeFileSync(path.join(rulesetsDir, 'ruleset2.yaml'), ruleset2)

      const result = await runPreflight([
        'node',
        'cli',
        '--ruleset',
        'ruleset1',
        'ruleset2',
      ])

      expect(result.mergedRuleset).toBeDefined()
      expect(result.mergedRuleset?.dismiss_project_edit_file_prompts).toBe(true)
      expect(result.mergedRuleset?.dismiss_project_create_file_prompts).toBe(
        true,
      )
      expect(result.mergedRuleset?.dismiss_project_bash_command_prompts).toBe(
        true,
      )
    })

    it('should handle missing ruleset file gracefully', async () => {
      const result = await runPreflight([
        'node',
        'cli',
        '--ruleset',
        'non-existent',
      ])

      expect(result.shouldExit).toBe(true)
      expect(result.exitCode).toBe(1)
    })
  })

  describe('Default rulesets from config', () => {
    it('should load default rulesets from config file', async () => {
      // Create config file with default rulesets
      const configContent = `
dangerously_allow_in_dirty_directory: true
dangerously_allow_without_version_control: true
rulesets:
  - default-ruleset
`
      fs.writeFileSync(path.join(testConfigDir, 'config.yaml'), configContent)

      // Create the default ruleset
      const rulesetContent = `
dismiss_project_edit_file_prompts: true
`
      fs.writeFileSync(
        path.join(rulesetsDir, 'default-ruleset.yaml'),
        rulesetContent,
      )

      const result = await runPreflight(['node', 'cli'])

      expect(result.mergedRuleset).toBeDefined()
      expect(result.mergedRuleset?.dismiss_project_edit_file_prompts).toBe(true)
    })

    it('should respect --no-default-rulesets flag', async () => {
      // Create config file with default rulesets
      const configContent = `
dangerously_allow_in_dirty_directory: true
dangerously_allow_without_version_control: true
rulesets:
  - default-ruleset
`
      fs.writeFileSync(path.join(testConfigDir, 'config.yaml'), configContent)

      // Create the default ruleset
      const rulesetContent = `
dismiss_project_edit_file_prompts: true
`
      fs.writeFileSync(
        path.join(rulesetsDir, 'default-ruleset.yaml'),
        rulesetContent,
      )

      const result = await runPreflight([
        'node',
        'cli',
        '--no-default-rulesets',
      ])

      expect(result.mergedRuleset).toBeUndefined()
    })

    it('should let CLI rulesets override default rulesets', async () => {
      // Create config file with default rulesets
      const configContent = `
dangerously_allow_in_dirty_directory: true
dangerously_allow_without_version_control: true
rulesets:
  - default-ruleset
`
      fs.writeFileSync(path.join(testConfigDir, 'config.yaml'), configContent)

      // Create the rulesets
      const defaultContent = `
dismiss_project_edit_file_prompts: false
`
      const cliContent = `
dismiss_project_edit_file_prompts: true
`
      fs.writeFileSync(
        path.join(rulesetsDir, 'default-ruleset.yaml'),
        defaultContent,
      )
      fs.writeFileSync(path.join(rulesetsDir, 'cli-ruleset.yaml'), cliContent)

      const result = await runPreflight([
        'node',
        'cli',
        '--ruleset',
        'cli-ruleset',
      ])

      expect(result.mergedRuleset).toBeDefined()
      expect(result.mergedRuleset?.dismiss_project_edit_file_prompts).toBe(true)
    })
  })

  describe('Ruleset argument building', () => {
    it('should return empty rulesetArgs since rulesets are handled in parent', async () => {
      const rulesetContent = `
dismiss_project_edit_file_prompts: true
dismiss_global_create_file_prompts: true
`
      fs.writeFileSync(
        path.join(rulesetsDir, 'test-ruleset.yaml'),
        rulesetContent,
      )

      const result = await runPreflight([
        'node',
        'cli',
        '--ruleset',
        'test-ruleset',
      ])

      expect(result.rulesetArgs).toEqual([])
    })

    it('should always return empty rulesetArgs', async () => {
      const rulesetContent = `
dismiss_project_edit_file_prompts: true
dismiss_global_edit_file_prompts: true
`
      fs.writeFileSync(
        path.join(rulesetsDir, 'test-ruleset.yaml'),
        rulesetContent,
      )

      const result = await runPreflight([
        'node',
        'cli',
        '--ruleset',
        'test-ruleset',
      ])

      expect(result.rulesetArgs).toEqual([])
    })
  })

  describe('Ruleset merging behavior', () => {
    it('should use least restrictive setting when merging', () => {
      const ruleset1 = {
        dismiss_project_edit_file_prompts: false,
        dismiss_project_create_file_prompts: true,
      }
      const ruleset2 = {
        dismiss_project_edit_file_prompts: true,
        dismiss_project_create_file_prompts: false,
      }

      const merged = mergeRulesets([ruleset1, ruleset2])

      // Both should be true (least restrictive)
      expect(merged.dismiss_project_edit_file_prompts).toBe(true)
      expect(merged.dismiss_project_create_file_prompts).toBe(true)
    })
  })
})
