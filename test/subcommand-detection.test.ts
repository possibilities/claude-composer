import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { runCli } from './test-utils'

describe('Subcommand Detection', () => {
  beforeEach(() => {
    // Environment setup handled by runCli utility
  })

  afterEach(() => {
    // Cleanup handled by runCli utility
  })

  describe('Subcommand patterns', () => {
    it('should detect single word as subcommand', async () => {
      const result = await runCli({
        args: [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          'foo',
        ],
      })
      expect(result.stdout).toContain('※ Bypassing Claude Composer')
      expect(result.stdout).toContain('※ Running Claude Code subcommand: foo')
    })

    it('should not detect quoted string with spaces as subcommand', async () => {
      const result = await runCli({
        args: [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          'this is a prompt',
        ],
      })
      expect(result.stdout).not.toContain('※ Bypassing Claude Composer')
    })

    it('should not detect when first arg is an option', async () => {
      const result = await runCli({
        args: [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--some-option',
        ],
      })
      expect(result.stdout).not.toContain('※ Bypassing Claude Composer')
    })

    it('should detect subcommand after options', async () => {
      const result = await runCli({
        args: [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--no-show-notifications',
          'deploy',
        ],
      })
      expect(result.stdout).toContain('※ Bypassing Claude Composer')
      expect(result.stdout).toContain(
        '※ Running Claude Code subcommand: deploy',
      )
    })

    it('should detect compound subcommands', async () => {
      const result = await runCli({
        args: [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          'run-tests',
        ],
      })
      expect(result.stdout).toContain('※ Bypassing Claude Composer')
      expect(result.stdout).toContain(
        '※ Running Claude Code subcommand: run-tests',
      )
    })

    it('should handle mixed args with subcommand first', async () => {
      const result = await runCli({
        args: [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          'build',
          '--verbose',
          'some additional text',
        ],
      })
      expect(result.stdout).toContain('※ Bypassing Claude Composer')
      expect(result.stdout).toContain('※ Running Claude Code subcommand: build')
    })
  })
})
