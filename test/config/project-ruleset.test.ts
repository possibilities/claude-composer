import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { loadRulesetFile } from '../../src/config/loader'
import type { RulesetConfig } from '../../src/config/schemas'

// Mock fs module for internal ruleset tests
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof fs>('fs')
  return {
    ...actual,
    existsSync: vi.fn(actual.existsSync),
    readFileSync: vi.fn(actual.readFileSync),
  }
})

describe('Project-level ruleset loading', () => {
  let originalCwd: string
  let testProjectDir: string
  let projectRulesetsDir: string
  let testRulesetPath: string

  beforeEach(() => {
    // Save original cwd
    originalCwd = process.cwd()

    // Create temporary project directory
    testProjectDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'claude-composer-ruleset-test-'),
    )

    // Create project structure
    projectRulesetsDir = path.join(
      testProjectDir,
      '.claude-composer',
      'rulesets',
    )
    fs.mkdirSync(projectRulesetsDir, { recursive: true })

    testRulesetPath = path.join(projectRulesetsDir, 'test-ruleset.yaml')

    // Mock process.cwd to return our test directory
    vi.spyOn(process, 'cwd').mockReturnValue(testProjectDir)
  })

  afterEach(() => {
    // Restore original cwd mock
    vi.restoreAllMocks()

    // Clean up temporary directory
    try {
      if (fs.existsSync(testProjectDir)) {
        fs.rmSync(testProjectDir, { recursive: true, force: true })
      }
    } catch {}
  })

  it('should load ruleset from project directory with project: prefix', async () => {
    const rulesetConfig: RulesetConfig = {
      accept_project_edit_file_prompts: true,
      accept_project_create_file_prompts: {
        paths: ['src/**/*.js', 'test/**/*.test.js'],
      },
      accept_project_bash_command_prompts: false,
      accept_fetch_content_prompts: {
        domains: ['*.example.com', 'docs.github.com'],
      },
    }

    fs.writeFileSync(
      testRulesetPath,
      `
accept_project_edit_file_prompts: true
accept_project_create_file_prompts:
  paths:
    - "src/**/*.js"
    - "test/**/*.test.js"
accept_project_bash_command_prompts: false
accept_fetch_content_prompts:
  domains:
    - "*.example.com"
    - "docs.github.com"
`,
    )

    const loaded = await loadRulesetFile('project:test-ruleset')
    expect(loaded).toEqual(rulesetConfig)
  })

  it('should throw error if project ruleset does not exist', async () => {
    await expect(loadRulesetFile('project:non-existent')).rejects.toThrow(
      'Ruleset file not found:',
    )
  })

  it('should still support internal: prefix', async () => {
    // Mock the internal ruleset files
    const originalExistsSync = vi.mocked(fs.existsSync).getMockImplementation()
    const originalReadFileSync = vi
      .mocked(fs.readFileSync)
      .getMockImplementation()

    vi.mocked(fs.existsSync).mockImplementation(filePath => {
      if (
        typeof filePath === 'string' &&
        (filePath.includes('internal-rulesets/cautious.yaml') ||
          filePath.includes('internal-rulesets/yolo.yaml'))
      ) {
        return true
      }
      return originalExistsSync ? originalExistsSync(filePath) : false
    })

    vi.mocked(fs.readFileSync).mockImplementation((filePath, encoding) => {
      if (
        typeof filePath === 'string' &&
        filePath.includes('internal-rulesets/cautious.yaml')
      ) {
        return `accept_project_edit_file_prompts: false
accept_project_create_file_prompts: false`
      }
      if (
        typeof filePath === 'string' &&
        filePath.includes('internal-rulesets/yolo.yaml')
      ) {
        return `accept_project_edit_file_prompts: true
accept_project_create_file_prompts: true`
      }
      return originalReadFileSync
        ? originalReadFileSync(filePath, encoding)
        : ''
    })

    // Test that internal rulesets still work
    const cautious = await loadRulesetFile('internal:cautious')
    expect(cautious).toBeDefined()
    expect(cautious.accept_project_edit_file_prompts).toBe(false)

    const yolo = await loadRulesetFile('internal:yolo')
    expect(yolo).toBeDefined()
    expect(yolo.accept_project_edit_file_prompts).toBe(true)

    // Restore mocks
    vi.mocked(fs.existsSync).mockImplementation(
      originalExistsSync || (() => false),
    )
    vi.mocked(fs.readFileSync).mockImplementation(
      originalReadFileSync || (() => ''),
    )
  })

  it('should validate project ruleset configuration', async () => {
    // Write invalid ruleset config
    fs.writeFileSync(
      testRulesetPath,
      `
invalid_field: true
accept_project_edit_file_prompts: "should be boolean or object"
`,
    )

    await expect(loadRulesetFile('project:test-ruleset')).rejects.toThrow(
      'ruleset configuration validation failed',
    )
  })

  it('should handle empty project ruleset', async () => {
    fs.writeFileSync(testRulesetPath, '')

    const loaded = await loadRulesetFile('project:test-ruleset')
    expect(loaded).toEqual({})
  })

  it('should handle project ruleset with mixed acceptance rules', async () => {
    fs.writeFileSync(
      testRulesetPath,
      `
accept_project_edit_file_prompts: true
accept_project_create_file_prompts: false
accept_global_edit_file_prompts: false
accept_global_create_file_prompts:
  paths:
    - "/tmp/**"
`,
    )

    const loaded = await loadRulesetFile('project:test-ruleset')
    expect(loaded).toEqual({
      accept_project_edit_file_prompts: true,
      accept_project_create_file_prompts: false,
      accept_global_edit_file_prompts: false,
      accept_global_create_file_prompts: {
        paths: ['/tmp/**'],
      },
    })
  })

  it('should handle project ruleset with fetch content domains', async () => {
    fs.writeFileSync(
      testRulesetPath,
      `
accept_fetch_content_prompts:
  domains:
    - "github.com"
    - "*.github.io"
    - "docs.*.com"
`,
    )

    const loaded = await loadRulesetFile('project:test-ruleset')
    expect(loaded).toEqual({
      accept_fetch_content_prompts: {
        domains: ['github.com', '*.github.io', 'docs.*.com'],
      },
    })
  })
})
