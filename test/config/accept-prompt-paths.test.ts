import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { loadRulesetFile } from '../../src/config/loader'
import { mergeRulesets } from '../../src/config/rulesets'
import type { RulesetConfig } from '../../src/config/schemas'
import picomatch from 'picomatch'

describe('Accept Prompt Path Patterns', () => {
  const originalEnv = process.env
  const testConfigDir = path.join(
    os.tmpdir(),
    'test-accept-paths-' + Date.now(),
  )
  const rulesetsDir = path.join(testConfigDir, 'rulesets')

  beforeEach(() => {
    process.env = { ...originalEnv }
    process.env.CLAUDE_COMPOSER_CONFIG_DIR = testConfigDir

    fs.mkdirSync(testConfigDir, { recursive: true })
    fs.mkdirSync(rulesetsDir, { recursive: true })
  })

  afterEach(() => {
    process.env = originalEnv
    fs.rmSync(testConfigDir, { recursive: true, force: true })
  })

  describe('Path pattern configuration', () => {
    it('should load ruleset with path patterns', async () => {
      const rulesetContent = `
accept_project_edit_file_prompts:
  paths:
    - "**/*.test.ts"
    - "src/**/*.js"
accept_project_create_file_prompts:
  paths:
    - "dist/**"
    - "*.tmp"
`
      fs.writeFileSync(path.join(rulesetsDir, 'paths.yaml'), rulesetContent)

      const result = await loadRulesetFile('paths')

      expect(result).toEqual({
        accept_project_edit_file_prompts: {
          paths: ['**/*.test.ts', 'src/**/*.js'],
        },
        accept_project_create_file_prompts: {
          paths: ['dist/**', '*.tmp'],
        },
      })
    })

    it('should merge path arrays from multiple rulesets', () => {
      const ruleset1: RulesetConfig = {
        accept_project_edit_file_prompts: {
          paths: ['**/*.test.ts'],
        },
      }

      const ruleset2: RulesetConfig = {
        accept_project_edit_file_prompts: {
          paths: ['**/*.spec.ts', '**/*.test.ts'],
        },
      }

      const merged = mergeRulesets([ruleset1, ruleset2])

      expect(merged.accept_project_edit_file_prompts).toEqual({
        paths: ['**/*.test.ts', '**/*.spec.ts'],
      })
    })

    it('should match files against path patterns', () => {
      const patterns = ['**/*.test.ts', 'src/**/*.js', 'test/**']
      const isMatch = picomatch(patterns)

      expect(isMatch('example.test.ts')).toBe(true)
      expect(isMatch('src/utils.test.ts')).toBe(true)
      expect(isMatch('src/lib/helper.js')).toBe(true)
      expect(isMatch('test/unit/component.spec.ts')).toBe(true)

      expect(isMatch('example.ts')).toBe(false)
      expect(isMatch('lib/helper.js')).toBe(false)
      expect(isMatch('src/main.ts')).toBe(false)
    })

    it('should handle brace expansion in patterns', () => {
      const patterns = ['**/*.{test,spec}.{ts,tsx}', 'dist/**']
      const isMatch = picomatch(patterns)

      expect(isMatch('example.test.ts')).toBe(true)
      expect(isMatch('component.spec.tsx')).toBe(true)
      expect(isMatch('src/utils.test.ts')).toBe(true)
      expect(isMatch('dist/bundle.js')).toBe(true)

      expect(isMatch('example.ts')).toBe(false)
      expect(isMatch('component.tsx')).toBe(false)
    })

    it('should handle mixed boolean and path configurations', async () => {
      const rulesetContent = `
accept_project_edit_file_prompts: true
accept_project_create_file_prompts:
  paths:
    - "**/*.generated.*"
    - "build/**"
accept_global_edit_file_prompts: false
`
      fs.writeFileSync(path.join(rulesetsDir, 'mixed.yaml'), rulesetContent)

      const result = await loadRulesetFile('mixed')

      expect(result).toEqual({
        accept_project_edit_file_prompts: true,
        accept_project_create_file_prompts: {
          paths: ['**/*.generated.*', 'build/**'],
        },
        accept_global_edit_file_prompts: false,
      })
    })
  })
})
