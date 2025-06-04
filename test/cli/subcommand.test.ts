import { describe, it, expect } from 'vitest'
import { detectSubcommand } from '../../src/cli/subcommand'

describe('detectSubcommand', () => {
  describe('should detect subcommands', () => {
    it('detects single word as subcommand', () => {
      const result = detectSubcommand(['foo'])
      expect(result.isSubcommand).toBe(true)
      expect(result.subcommand).toBe('foo')
    })

    it('detects compound words with hyphens as subcommand', () => {
      const result = detectSubcommand(['run-tests'])
      expect(result.isSubcommand).toBe(true)
      expect(result.subcommand).toBe('run-tests')
    })

    it('detects subcommand after options', () => {
      const result = detectSubcommand(['--verbose', '--debug', 'deploy'])
      expect(result.isSubcommand).toBe(true)
      expect(result.subcommand).toBe('deploy')
    })

    it('detects subcommand with mixed arguments', () => {
      const result = detectSubcommand([
        '--flag',
        'build',
        '--another-flag',
        'some text',
      ])
      expect(result.isSubcommand).toBe(true)
      expect(result.subcommand).toBe('build')
    })

    it('detects subcommand with numbers', () => {
      const result = detectSubcommand(['test123'])
      expect(result.isSubcommand).toBe(true)
      expect(result.subcommand).toBe('test123')
    })

    it('detects subcommand with underscores', () => {
      const result = detectSubcommand(['run_tests'])
      expect(result.isSubcommand).toBe(true)
      expect(result.subcommand).toBe('run_tests')
    })
  })

  describe('should not detect subcommands', () => {
    it('does not detect quoted string with spaces', () => {
      const result = detectSubcommand(['this is a prompt'])
      expect(result.isSubcommand).toBe(false)
      expect(result.subcommand).toBeUndefined()
    })

    it('does not detect when only options are present', () => {
      const result = detectSubcommand(['--some-option', '--another-option'])
      expect(result.isSubcommand).toBe(false)
      expect(result.subcommand).toBeUndefined()
    })

    it('does not detect empty arguments', () => {
      const result = detectSubcommand([])
      expect(result.isSubcommand).toBe(false)
      expect(result.subcommand).toBeUndefined()
    })

    it('does not detect strings with spaces even after options', () => {
      const result = detectSubcommand(['--verbose', 'this is not a subcommand'])
      expect(result.isSubcommand).toBe(false)
      expect(result.subcommand).toBeUndefined()
    })

    it('does not detect when first non-option has spaces', () => {
      const result = detectSubcommand(['--flag', 'multiple words', 'single'])
      expect(result.isSubcommand).toBe(false)
      expect(result.subcommand).toBeUndefined()
    })
  })

  describe('edge cases', () => {
    it('handles empty string argument', () => {
      const result = detectSubcommand([''])
      expect(result.isSubcommand).toBe(false)
      expect(result.subcommand).toBeUndefined()
    })

    it('handles single space as not a subcommand', () => {
      const result = detectSubcommand([' '])
      expect(result.isSubcommand).toBe(false)
      expect(result.subcommand).toBeUndefined()
    })

    it('ignores options with equals signs', () => {
      const result = detectSubcommand(['--option=value', 'deploy'])
      expect(result.isSubcommand).toBe(true)
      expect(result.subcommand).toBe('deploy')
    })

    it('handles special characters in subcommand', () => {
      const result = detectSubcommand(['test@123'])
      expect(result.isSubcommand).toBe(true)
      expect(result.subcommand).toBe('test@123')
    })
  })
})
