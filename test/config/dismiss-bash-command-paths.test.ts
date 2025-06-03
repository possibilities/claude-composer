import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { loadRulesetFile } from '../../src/config/loader'
import { mergeRulesets } from '../../src/config/rulesets'
import type { RulesetConfig } from '../../src/config/schemas'
import picomatch from 'picomatch'

describe('Dismiss Bash Command Path Patterns', () => {
  const originalEnv = process.env
  const testConfigDir = path.join(
    os.tmpdir(),
    'test-dismiss-bash-paths-' + Date.now(),
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

  describe('Bash command path pattern configuration', () => {
    it('should load ruleset with bash command path patterns', async () => {
      const rulesetContent = `
dismiss_project_bash_command_prompts:
  paths:
    - "~/code/**"
    - "/tmp/**"
dismiss_global_bash_command_prompts:
  paths:
    - "/usr/local/**"
    - "/opt/**"
`
      fs.writeFileSync(
        path.join(rulesetsDir, 'bash-paths.yaml'),
        rulesetContent,
      )

      const result = await loadRulesetFile('bash-paths')

      expect(result).toEqual({
        dismiss_project_bash_command_prompts: {
          paths: ['~/code/**', '/tmp/**'],
        },
        dismiss_global_bash_command_prompts: {
          paths: ['/usr/local/**', '/opt/**'],
        },
      })
    })

    it('should support boolean values for bash command dismissal', async () => {
      const rulesetContent = `
dismiss_project_bash_command_prompts: true
dismiss_global_bash_command_prompts: false
`
      fs.writeFileSync(path.join(rulesetsDir, 'bash-bool.yaml'), rulesetContent)

      const result = await loadRulesetFile('bash-bool')

      expect(result).toEqual({
        dismiss_project_bash_command_prompts: true,
        dismiss_global_bash_command_prompts: false,
      })
    })

    it('should merge bash command path arrays from multiple rulesets', () => {
      const ruleset1: RulesetConfig = {
        dismiss_project_bash_command_prompts: {
          paths: ['~/code/**'],
        },
      }

      const ruleset2: RulesetConfig = {
        dismiss_project_bash_command_prompts: {
          paths: ['~/projects/**', '~/code/**'],
        },
      }

      const merged = mergeRulesets([ruleset1, ruleset2])

      expect(merged.dismiss_project_bash_command_prompts).toEqual({
        paths: ['~/code/**', '~/projects/**'],
      })
    })

    it('should match directories against bash command path patterns', () => {
      const patterns = ['~/code/**', '/tmp/**', '/opt/apps/**']
      const isMatch = picomatch(patterns)

      // These should match
      expect(isMatch('~/code/project1')).toBe(true)
      expect(isMatch('~/code/deep/nested/dir')).toBe(true)
      expect(isMatch('/tmp/build')).toBe(true)
      expect(isMatch('/opt/apps/myapp')).toBe(true)

      // These should not match
      expect(isMatch('~/documents/file')).toBe(false)
      expect(isMatch('/usr/local/bin')).toBe(false)
      expect(isMatch('/opt/other')).toBe(false)
    })

    it('should handle mixed boolean and path configurations for bash commands', async () => {
      const rulesetContent = `
dismiss_project_bash_command_prompts: true
dismiss_global_bash_command_prompts:
  paths:
    - "/usr/**"
    - "/etc/**"
`
      fs.writeFileSync(
        path.join(rulesetsDir, 'bash-mixed.yaml'),
        rulesetContent,
      )

      const result = await loadRulesetFile('bash-mixed')

      expect(result).toEqual({
        dismiss_project_bash_command_prompts: true,
        dismiss_global_bash_command_prompts: {
          paths: ['/usr/**', '/etc/**'],
        },
      })
    })

    it('should handle tilde expansion in bash command patterns', () => {
      const homeDir = os.homedir()
      const patterns = ['~/code/**', '~/.config/**']

      // Replace ~ with actual home directory for testing
      const expandedPatterns = patterns.map(p =>
        p.startsWith('~') ? path.join(homeDir, p.slice(1)) : p,
      )
      const isMatch = picomatch(expandedPatterns)

      expect(isMatch(path.join(homeDir, 'code/project'))).toBe(true)
      expect(isMatch(path.join(homeDir, '.config/app'))).toBe(true)
      expect(isMatch('/other/path')).toBe(false)
    })

    it('should validate that paths are directory globs for bash commands', () => {
      const patterns = [
        '/home/user/projects/**',
        '/var/log/**/*.log', // This includes file pattern but should work for directories
        '/tmp/*',
        '/opt/*/bin',
      ]
      const isMatch = picomatch(patterns)

      // Directory paths should match
      expect(isMatch('/home/user/projects/app1')).toBe(true)
      expect(isMatch('/home/user/projects/app1/src')).toBe(true)
      expect(isMatch('/tmp/cache')).toBe(true)
      expect(isMatch('/opt/nodejs/bin')).toBe(true)

      // Directory paths under /var/log/** pattern should match
      expect(isMatch('/var/log/app/errors.log')).toBe(true)
      expect(isMatch('/var/log/system/errors.log')).toBe(true)
    })
  })

  describe('Integration with bash command prompt dismissal', () => {
    it('should handle project context with relative paths', () => {
      const cwd = process.cwd()
      const patterns = ['src/**', 'test/**', 'scripts/**']
      const isMatch = picomatch(patterns)

      // Test relative paths from project root
      expect(isMatch('src/index.ts')).toBe(true)
      expect(isMatch('test/unit/app.test.ts')).toBe(true)
      expect(isMatch('scripts/build.sh')).toBe(true)
      expect(isMatch('node_modules/package')).toBe(false)
    })

    it('should handle global context with absolute paths', () => {
      const patterns = ['/usr/local/**', '/opt/**', '/etc/app/**']
      const isMatch = picomatch(patterns)

      // Test absolute paths
      expect(isMatch('/usr/local/bin/myapp')).toBe(true)
      expect(isMatch('/opt/software/bin')).toBe(true)
      expect(isMatch('/etc/app/config')).toBe(true)
      expect(isMatch('/home/user/file')).toBe(false)
    })
  })
})
