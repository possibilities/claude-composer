import { describe, it, expect } from 'vitest'
import { hasActiveAcceptanceRules } from '../../src/config/rulesets'
import type { RulesetConfig } from '../../src/config/schemas'

describe('hasActiveAcceptanceRules', () => {
  it('should return false when ruleset is undefined', () => {
    expect(hasActiveAcceptanceRules(undefined)).toBe(false)
  })

  it('should return false when ruleset has no acceptance rules', () => {
    const ruleset: RulesetConfig = {}
    expect(hasActiveAcceptanceRules(ruleset)).toBe(false)
  })

  it('should return true when project edit file prompts are accepted', () => {
    const ruleset: RulesetConfig = {
      accept_project_edit_file_prompts: true,
    }
    expect(hasActiveAcceptanceRules(ruleset)).toBe(true)
  })

  it('should return true when global edit file prompts are accepted', () => {
    const ruleset: RulesetConfig = {
      accept_global_edit_file_prompts: true,
    }
    expect(hasActiveAcceptanceRules(ruleset)).toBe(true)
  })

  it('should return true when project create file prompts are accepted', () => {
    const ruleset: RulesetConfig = {
      accept_project_create_file_prompts: true,
    }
    expect(hasActiveAcceptanceRules(ruleset)).toBe(true)
  })

  it('should return true when global bash command prompts are accepted', () => {
    const ruleset: RulesetConfig = {
      accept_global_bash_command_prompts: true,
    }
    expect(hasActiveAcceptanceRules(ruleset)).toBe(true)
  })

  it('should return true when fetch content prompts are accepted', () => {
    const ruleset: RulesetConfig = {
      accept_fetch_content_prompts: true,
    }
    expect(hasActiveAcceptanceRules(ruleset)).toBe(true)
  })

  it('should return true when path-based rules have paths', () => {
    const ruleset: RulesetConfig = {
      accept_project_edit_file_prompts: {
        paths: ['**/*.js'],
      },
    }
    expect(hasActiveAcceptanceRules(ruleset)).toBe(true)
  })

  it('should return false when path-based rules have empty paths', () => {
    const ruleset: RulesetConfig = {
      accept_project_edit_file_prompts: {
        paths: [],
      },
    }
    expect(hasActiveAcceptanceRules(ruleset)).toBe(false)
  })

  it('should return true when domain-based rules have domains', () => {
    const ruleset: RulesetConfig = {
      accept_fetch_content_prompts: {
        domains: ['github.com'],
      },
    }
    expect(hasActiveAcceptanceRules(ruleset)).toBe(true)
  })

  it('should return false when all rules are false', () => {
    const ruleset: RulesetConfig = {
      accept_project_edit_file_prompts: false,
      accept_global_edit_file_prompts: false,
      accept_project_create_file_prompts: false,
      accept_global_create_file_prompts: false,
      accept_project_bash_command_prompts: false,
      accept_global_bash_command_prompts: false,
      accept_project_read_files_prompts: false,
      accept_global_read_files_prompts: false,
      accept_fetch_content_prompts: false,
    }
    expect(hasActiveAcceptanceRules(ruleset)).toBe(false)
  })

  it('should return true when at least one rule is active', () => {
    const ruleset: RulesetConfig = {
      accept_project_edit_file_prompts: false,
      accept_global_edit_file_prompts: false,
      accept_project_create_file_prompts: true, // This one is active
      accept_global_create_file_prompts: false,
    }
    expect(hasActiveAcceptanceRules(ruleset)).toBe(true)
  })

  it('should handle mixed boolean and object rules', () => {
    const ruleset: RulesetConfig = {
      accept_project_edit_file_prompts: false,
      accept_global_edit_file_prompts: {
        paths: ['*.config.js'], // Has paths, so it's active
      },
      accept_fetch_content_prompts: {
        domains: [], // No domains, so it's not active
      },
    }
    expect(hasActiveAcceptanceRules(ruleset)).toBe(true)
  })
})