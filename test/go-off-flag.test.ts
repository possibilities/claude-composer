import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { runCliInteractive, runCli } from './test-utils'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

describe('Go-off Flag functionality', () => {
  beforeEach(() => {
    // Environment setup handled by test utilities
  })

  afterEach(() => {
    // Cleanup handled by test utilities
  })

  describe('--go-off flag', () => {
    it('should show danger zone warning', async () => {
      const result = await runCliInteractive({
        args: [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--go-off',
        ],
        interactions: [
          {
            waitFor: 'Are you ABSOLUTELY SURE you want to continue?',
            respond: 'n\n',
          },
        ],
      })

      expect(result.stdout).toContain('🚨 DANGER ZONE 🚨')
      expect(result.stdout).toContain('You have enabled --go-off')
      expect(result.stdout).toContain(
        'Automatically dismiss ALL file edit prompts',
      )
      expect(result.stdout).toContain(
        'Automatically dismiss ALL file creation prompts',
      )
      expect(result.stdout).toContain(
        'Automatically dismiss ALL bash command prompts',
      )
      expect(result.stdout).toContain('Claude will have FULL CONTROL')
      expect(result.stdout).toContain(
        'Are you ABSOLUTELY SURE you want to continue?',
      )
    })

    it('should exit when user responds no to prompt', async () => {
      const result = await runCliInteractive({
        args: [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--go-off',
        ],
        interactions: [
          {
            waitFor: 'Are you ABSOLUTELY SURE you want to continue?',
            respond: 'n\n',
          },
        ],
      })

      expect(result.stdout).toContain('Good choice. Exiting safely.')
      expect(result.exitCode).toBe(0)
    })

    it('should continue when user responds yes to prompt', async () => {
      const result = await runCliInteractive({
        args: [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--go-off',
        ],
        interactions: [
          {
            waitFor: 'Are you ABSOLUTELY SURE you want to continue?',
            respond: 'y\n',
          },
        ],
      })

      expect(result.stderr).toContain(
        '※ Go-off mode activated - All safety prompts disabled!',
      )
      expect(result.stdout).toContain('Mock child app running')
    })

    it('should conflict with --dangerously-dismiss-edit-file-prompts', async () => {
      const result = await runCli({
        args: [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--go-off',
          '--dangerously-dismiss-edit-file-prompts',
        ],
      })

      expect(result.stderr).toContain(
        'Error: Cannot use --go-off with individual dangerous prompt flags',
      )
      expect(result.stderr).toContain(
        'The go-off flag already sets all dangerous prompt dismissals',
      )
      expect(result.exitCode).toBe(1)
    })

    it('should conflict with --dangerously-dismiss-create-file-prompts', async () => {
      const result = await runCli({
        args: [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--go-off',
          '--dangerously-dismiss-create-file-prompts',
        ],
      })

      expect(result.stderr).toContain(
        'Error: Cannot use --go-off with individual dangerous prompt flags',
      )
      expect(result.exitCode).toBe(1)
    })

    it('should conflict with --dangerously-dismiss-bash-command-prompts', async () => {
      const result = await runCli({
        args: [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--go-off',
          '--dangerously-dismiss-bash-command-prompts',
        ],
      })

      expect(result.stderr).toContain(
        'Error: Cannot use --go-off with individual dangerous prompt flags',
      )
      expect(result.exitCode).toBe(1)
    })

    it('should conflict with multiple dangerous flags', async () => {
      const result = await runCli({
        args: [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--go-off',
          '--dangerously-dismiss-edit-file-prompts',
          '--dangerously-dismiss-create-file-prompts',
        ],
      })

      expect(result.stderr).toContain(
        'Error: Cannot use --go-off with individual dangerous prompt flags',
      )
      expect(result.exitCode).toBe(1)
    })

    it('should work with other non-conflicting flags', async () => {
      const result = await runCliInteractive({
        args: [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--go-off',
          '--no-show-notifications',
        ],
        interactions: [
          {
            waitFor: 'Are you ABSOLUTELY SURE you want to continue?',
            respond: 'y\n',
          },
        ],
      })

      expect(result.stderr).toContain(
        '※ Go-off mode activated - All safety prompts disabled!',
      )
      expect(result.exitCode).toBe(0)
    })
  })
})
