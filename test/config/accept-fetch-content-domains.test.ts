import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { loadRulesetFile } from '../../src/config/loader'
import { mergeRulesets } from '../../src/config/rulesets'
import type { RulesetConfig } from '../../src/config/schemas'

describe('Accept Fetch Content Domain Patterns', () => {
  const originalEnv = process.env
  const testConfigDir = path.join(
    os.tmpdir(),
    'test-accept-fetch-domains-' + Date.now(),
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

  describe('Domain pattern configuration', () => {
    it('should load ruleset with domain patterns', async () => {
      const rulesetContent = `
accept_fetch_content_prompts:
  domains:
    - "github.com"
    - "*.shopify.com"
    - "docs.*.com"
`
      fs.writeFileSync(path.join(rulesetsDir, 'domains.yaml'), rulesetContent)

      const result = await loadRulesetFile('domains')

      expect(result).toEqual({
        accept_fetch_content_prompts: {
          domains: ['github.com', '*.shopify.com', 'docs.*.com'],
        },
      })
    })

    it('should merge domain arrays from multiple rulesets', () => {
      const ruleset1: RulesetConfig = {
        accept_fetch_content_prompts: {
          domains: ['github.com', '*.example.com'],
        },
      }

      const ruleset2: RulesetConfig = {
        accept_fetch_content_prompts: {
          domains: ['gitlab.com', '*.example.com', 'docs.*.io'],
        },
      }

      const merged = mergeRulesets([ruleset1, ruleset2])

      expect(merged.accept_fetch_content_prompts).toEqual({
        domains: ['github.com', '*.example.com', 'gitlab.com', 'docs.*.io'],
      })
    })

    it('should handle mixed boolean and domain configurations', async () => {
      const rulesetContent = `
accept_project_edit_file_prompts: true
accept_fetch_content_prompts:
  domains:
    - "*.trusted.com"
    - "api.company.com"
`
      fs.writeFileSync(path.join(rulesetsDir, 'mixed.yaml'), rulesetContent)

      const result = await loadRulesetFile('mixed')

      expect(result).toEqual({
        accept_project_edit_file_prompts: true,
        accept_fetch_content_prompts: {
          domains: ['*.trusted.com', 'api.company.com'],
        },
      })
    })

    it('should prioritize boolean true over domain lists when merging', () => {
      const ruleset1: RulesetConfig = {
        accept_fetch_content_prompts: {
          domains: ['github.com'],
        },
      }

      const ruleset2: RulesetConfig = {
        accept_fetch_content_prompts: true,
      }

      const merged = mergeRulesets([ruleset1, ruleset2])

      expect(merged.accept_fetch_content_prompts).toBe(true)
    })

    it('should not override boolean true with domain lists', () => {
      const ruleset1: RulesetConfig = {
        accept_fetch_content_prompts: true,
      }

      const ruleset2: RulesetConfig = {
        accept_fetch_content_prompts: {
          domains: ['github.com'],
        },
      }

      const merged = mergeRulesets([ruleset1, ruleset2])

      expect(merged.accept_fetch_content_prompts).toBe(true)
    })
  })

  describe('Domain matching logic', () => {
    it('should validate domain array contains at least one domain', async () => {
      const rulesetContent = `
accept_fetch_content_prompts:
  domains: []
`
      fs.writeFileSync(path.join(rulesetsDir, 'empty.yaml'), rulesetContent)

      await expect(loadRulesetFile('empty')).rejects.toThrow(
        'ruleset configuration validation failed',
      )
    })
  })
})
