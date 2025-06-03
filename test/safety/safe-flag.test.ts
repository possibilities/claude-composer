import { describe, it, expect } from 'vitest'
import { runCli } from '../utils/test-utils'

describe('--safe flag functionality', () => {
  describe('--safe flag', () => {
    it('should reject --safe with other claude-composer flags', async () => {
      const result = await runCli({ args: ['--safe', '--show-notifications'] })

      expect(result.stderr).toContain(
        'Error: --safe flag cannot be used with other claude-composer flags',
      )
      expect(result.stderr).toContain('--show-notifications')
      expect(result.exitCode).toBe(1)
    })

    it('should reject multiple claude-composer flags with --safe', async () => {
      const result = await runCli({
        args: ['--safe', '--show-notifications', '--quiet'],
      })

      expect(result.stderr).toContain(
        'Error: --safe flag cannot be used with other claude-composer flags',
      )
      expect(result.stderr).toContain('--show-notifications')
      expect(result.stderr).toContain('--quiet')
      expect(result.exitCode).toBe(1)
    })

    it('should reject --safe with toolset flag', async () => {
      const result = await runCli({ args: ['--safe', '--toolset', 'test'] })

      expect(result.stderr).toContain(
        'Error: --safe flag cannot be used with other claude-composer flags',
      )
      expect(result.stderr).toContain('--toolset')
      expect(result.exitCode).toBe(1)
    })

    it('should reject --safe with dangerous flags', async () => {
      const result = await runCli({
        args: ['--safe', '--dangerously-dismiss-edit-file-prompts'],
      })

      expect(result.stderr).toContain(
        'Error: --safe flag cannot be used with other claude-composer flags',
      )
      expect(result.stderr).toContain('--dangerously-dismiss-edit-file-prompts')
      expect(result.exitCode).toBe(1)
    })

    it('should bypass all claude-composer functionality with --safe flag', async () => {
      const result = await runCli({ args: ['--safe', '--version'] })

      // Should show child app version without any claude-composer messages
      expect(result.stdout).toContain('Claude Code')
      expect(result.stdout).not.toContain('※')
      expect(result.stdout).not.toContain('Ready')
      expect(result.exitCode).toBe(0)
    })

    it('should allow --safe with child app flags', async () => {
      const result = await runCli({ args: ['--safe', '--help'] })

      // Should show child app help
      expect(result.stdout).toContain('Claude')
      expect(result.stdout).not.toContain('claude-composer')
      expect(result.exitCode).toBe(0)
    })
  })
})
