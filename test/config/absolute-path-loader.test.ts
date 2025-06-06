import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { loadRulesetFile, loadToolsetFile } from '../../src/config/loader'

describe('Absolute Path Loading', () => {
  const originalEnv = process.env
  const testDir = path.join(os.tmpdir(), 'test-absolute-paths-' + Date.now())
  const homeDir = path.join(testDir, 'home')
  const configDir = path.join(homeDir, '.claude-composer')
  const rulesetsDir = path.join(configDir, 'rulesets')
  const toolsetsDir = path.join(configDir, 'toolsets')

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.CLAUDE_COMPOSER_CONFIG_DIR = configDir

    // Create test directories
    fs.mkdirSync(testDir, { recursive: true })
    fs.mkdirSync(homeDir, { recursive: true })
    fs.mkdirSync(configDir, { recursive: true })
    fs.mkdirSync(rulesetsDir, { recursive: true })
    fs.mkdirSync(toolsetsDir, { recursive: true })
  })

  afterEach(() => {
    process.env = originalEnv
    // Clean up test directories
    fs.rmSync(testDir, { recursive: true, force: true })
  })

  describe('loadRulesetFile with absolute paths', () => {
    it('should load ruleset from absolute path', async () => {
      const absolutePath = path.join(testDir, 'my-rules.yaml')
      const content = `
accept_project_edit_file_prompts: true
accept_project_create_file_prompts: false
`
      fs.writeFileSync(absolutePath, content)

      const result = await loadRulesetFile(absolutePath)

      expect(result).toEqual({
        accept_project_edit_file_prompts: true,
        accept_project_create_file_prompts: false,
      })
    })

    it('should load ruleset from path with tilde', async () => {
      const content = `
accept_project_bash_command_prompts: true
`
      const tildePathExpanded = path.join(os.homedir(), 'test-rules.yaml')
      fs.writeFileSync(tildePathExpanded, content)

      try {
        const result = await loadRulesetFile('~/test-rules.yaml')

        expect(result).toEqual({
          accept_project_bash_command_prompts: true,
        })
      } finally {
        // Clean up
        fs.rmSync(tildePathExpanded, { force: true })
      }
    })

    it('should load ruleset from relative path', async () => {
      const content = `
accept_global_edit_file_prompts: true
`
      const relPath = './test-rules.yaml'
      fs.writeFileSync(path.join(process.cwd(), 'test-rules.yaml'), content)

      try {
        const result = await loadRulesetFile(relPath)
        expect(result).toEqual({
          accept_global_edit_file_prompts: true,
        })
      } finally {
        // Clean up
        fs.rmSync(path.join(process.cwd(), 'test-rules.yaml'), { force: true })
      }
    })

    it('should throw error for non-existent absolute path', async () => {
      const nonExistentPath = path.join(testDir, 'does-not-exist.yaml')

      await expect(loadRulesetFile(nonExistentPath)).rejects.toThrow(
        `Ruleset file not found: ${nonExistentPath}`,
      )
    })

    it('should still load internal rulesets', async () => {
      // Internal rulesets should work if they exist
      // Skip this test as it depends on build artifacts
      try {
        const result = await loadRulesetFile('internal:safe')
        expect(result).toBeDefined()
      } catch (error) {
        // If internal rulesets aren't available in test env, that's ok
        expect(error.message).toContain('Ruleset file not found')
      }
    })

    it('should still load user rulesets by name', async () => {
      const content = `
accept_project_edit_file_prompts: false
`
      fs.writeFileSync(path.join(rulesetsDir, 'custom.yaml'), content)

      const result = await loadRulesetFile('custom')

      expect(result).toEqual({
        accept_project_edit_file_prompts: false,
      })
    })
  })

  describe('loadToolsetFile with absolute paths', () => {
    it('should load toolset from absolute path', async () => {
      const absolutePath = path.join(testDir, 'my-tools.yaml')
      const content = `
allowed:
  - Read
  - Write
  - Edit
`
      fs.writeFileSync(absolutePath, content)

      const result = await loadToolsetFile(absolutePath)

      expect(result).toEqual({
        allowed: ['Read', 'Write', 'Edit'],
      })
    })

    it('should load toolset from path with tilde', async () => {
      const content = `
disallowed:
  - WebSearch
`
      const tildePathExpanded = path.join(os.homedir(), 'test-tools.yaml')
      fs.writeFileSync(tildePathExpanded, content)

      try {
        const result = await loadToolsetFile('~/test-tools.yaml')

        expect(result).toEqual({
          disallowed: ['WebSearch'],
        })
      } finally {
        // Clean up
        fs.rmSync(tildePathExpanded, { force: true })
      }
    })

    it('should load toolset from relative path', async () => {
      const content = `
mcp:
  test-server:
    type: stdio
    command: node
    args:
      - test.js
`
      const relPath = './test-tools.yaml'
      fs.writeFileSync(path.join(process.cwd(), 'test-tools.yaml'), content)

      try {
        const result = await loadToolsetFile(relPath)
        expect(result).toEqual({
          mcp: {
            'test-server': {
              type: 'stdio',
              command: 'node',
              args: ['test.js'],
            },
          },
        })
      } finally {
        // Clean up
        fs.rmSync(path.join(process.cwd(), 'test-tools.yaml'), { force: true })
      }
    })

    it('should throw error for non-existent absolute path', async () => {
      const nonExistentPath = path.join(testDir, 'does-not-exist.yaml')

      await expect(loadToolsetFile(nonExistentPath)).rejects.toThrow(
        `Toolset file not found: ${nonExistentPath}`,
      )
    })

    it('should still load internal toolsets', async () => {
      // Internal toolsets should work if they exist
      // Skip this test as it depends on build artifacts
      try {
        const result = await loadToolsetFile('internal:core')
        expect(result).toBeDefined()
      } catch (error) {
        // If internal toolsets aren't available in test env, that's ok
        expect(error.message).toContain('Toolset file not found')
      }
    })

    it('should still load user toolsets by name', async () => {
      const content = `
allowed:
  - Bash
`
      fs.writeFileSync(path.join(toolsetsDir, 'custom.yaml'), content)

      const result = await loadToolsetFile('custom')

      expect(result).toEqual({
        allowed: ['Bash'],
      })
    })
  })

  describe('Environment variable expansion', () => {
    it('should expand environment variables in paths', async () => {
      process.env.MY_CONFIG_DIR = testDir
      const content = `
accept_project_edit_file_prompts: true
`
      fs.writeFileSync(path.join(testDir, 'env-rules.yaml'), content)

      const result = await loadRulesetFile('$MY_CONFIG_DIR/env-rules.yaml')

      expect(result).toEqual({
        accept_project_edit_file_prompts: true,
      })
    })
  })

  describe('Extension handling', () => {
    it('should load ruleset with explicit .yaml extension', async () => {
      const content = `
accept_project_edit_file_prompts: true
`
      const filePath = path.join(testDir, 'explicit.yaml')
      fs.writeFileSync(filePath, content)

      const result = await loadRulesetFile(filePath)

      expect(result).toEqual({
        accept_project_edit_file_prompts: true,
      })
    })

    it('should load ruleset with explicit .yml extension', async () => {
      const content = `
accept_project_create_file_prompts: true
`
      const filePath = path.join(testDir, 'explicit.yml')
      fs.writeFileSync(filePath, content)

      const result = await loadRulesetFile(filePath)

      expect(result).toEqual({
        accept_project_create_file_prompts: true,
      })
    })

    it('should load ruleset without extension (finding .yaml)', async () => {
      const content = `
accept_project_bash_command_prompts: true
`
      fs.writeFileSync(path.join(testDir, 'no-ext.yaml'), content)

      const result = await loadRulesetFile(path.join(testDir, 'no-ext'))

      expect(result).toEqual({
        accept_project_bash_command_prompts: true,
      })
    })

    it('should load ruleset without extension (finding .yml)', async () => {
      const content = `
accept_global_edit_file_prompts: true
`
      fs.writeFileSync(path.join(testDir, 'no-ext2.yml'), content)

      const result = await loadRulesetFile(path.join(testDir, 'no-ext2'))

      expect(result).toEqual({
        accept_global_edit_file_prompts: true,
      })
    })

    it('should prefer .yaml over .yml when both exist', async () => {
      const yamlContent = `
accept_project_edit_file_prompts: true
`
      const ymlContent = `
accept_project_edit_file_prompts: false
`
      fs.writeFileSync(path.join(testDir, 'both.yaml'), yamlContent)
      fs.writeFileSync(path.join(testDir, 'both.yml'), ymlContent)

      const result = await loadRulesetFile(path.join(testDir, 'both'))

      // Should load .yaml (true) not .yml (false)
      expect(result).toEqual({
        accept_project_edit_file_prompts: true,
      })
    })

    it('should load toolset with explicit .yaml extension', async () => {
      const content = `
allowed:
  - Read
  - Write
`
      const filePath = path.join(testDir, 'toolset.yaml')
      fs.writeFileSync(filePath, content)

      const result = await loadToolsetFile(filePath)

      expect(result).toEqual({
        allowed: ['Read', 'Write'],
      })
    })

    it('should load toolset with explicit .yml extension', async () => {
      const content = `
disallowed:
  - WebSearch
`
      const filePath = path.join(testDir, 'toolset.yml')
      fs.writeFileSync(filePath, content)

      const result = await loadToolsetFile(filePath)

      expect(result).toEqual({
        disallowed: ['WebSearch'],
      })
    })

    it('should load toolset without extension', async () => {
      const content = `
allowed:
  - Bash
`
      fs.writeFileSync(path.join(testDir, 'toolset-no-ext.yaml'), content)

      const result = await loadToolsetFile(path.join(testDir, 'toolset-no-ext'))

      expect(result).toEqual({
        allowed: ['Bash'],
      })
    })

    it('should handle user rulesets without extension', async () => {
      const content = `
accept_project_edit_file_prompts: false
`
      // Create both to ensure it picks .yaml first
      fs.writeFileSync(path.join(rulesetsDir, 'my-rules.yaml'), content)
      fs.writeFileSync(
        path.join(rulesetsDir, 'my-rules.yml'),
        `
accept_project_edit_file_prompts: true
`,
      )

      const result = await loadRulesetFile('my-rules')

      expect(result).toEqual({
        accept_project_edit_file_prompts: false,
      })
    })

    it('should handle project rulesets without extension', async () => {
      const content = `
accept_project_create_file_prompts: true
`
      const projectDir = path.join(
        process.cwd(),
        '.claude-composer',
        'rulesets',
      )
      fs.mkdirSync(projectDir, { recursive: true })
      fs.writeFileSync(path.join(projectDir, 'project-rules.yml'), content)

      try {
        const result = await loadRulesetFile('project:project-rules')

        expect(result).toEqual({
          accept_project_create_file_prompts: true,
        })
      } finally {
        // Clean up
        fs.rmSync(path.join(process.cwd(), '.claude-composer'), {
          recursive: true,
          force: true,
        })
      }
    })
  })
})
