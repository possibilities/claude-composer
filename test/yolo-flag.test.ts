import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawn } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

const cliPath = path.join(__dirname, '..', 'cli.ts')
const mockAppPath = path.join(__dirname, 'mock-child-app.ts')

describe('YOLO Flag functionality', () => {
  beforeEach(() => {
    process.env.CLAUDE_APP_PATH = mockAppPath
  })

  afterEach(() => {
    delete process.env.CLAUDE_APP_PATH
  })

  function runCli(
    args: string[] = [],
    options: any = {},
  ): Promise<{
    stdout: string
    stderr: string
    exitCode: number | null
    process: any
  }> {
    return new Promise(resolve => {
      const child = spawn('pnpm', ['tsx', cliPath, ...args], {
        env: { ...process.env, ...options.env },
        ...options,
      })

      let stdout = ''
      let stderr = ''

      child.stdout?.on('data', data => {
        stdout += data.toString()
      })

      child.stderr?.on('data', data => {
        stderr += data.toString()
      })

      child.on('exit', code => {
        resolve({ stdout, stderr, exitCode: code, process: child })
      })

      // For tests that need to respond to prompts
      if (options.respondToPrompt !== undefined) {
        setTimeout(() => {
          child.stdin?.write(options.respondToPrompt + '\n')
        }, 300)
      }
    })
  }

  describe('--go-off-yolo-what-could-go-wrong flag', () => {
    it('should show danger zone warning', async () => {
      const result = await runCli(
        [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--go-off-yolo-what-could-go-wrong',
        ],
        { respondToPrompt: 'n' },
      )

      expect(result.stdout).toContain('🚨 DANGER ZONE 🚨')
      expect(result.stdout).toContain(
        'You have enabled --go-off-yolo-what-could-go-wrong',
      )
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
      const result = await runCli(
        [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--go-off-yolo-what-could-go-wrong',
        ],
        { respondToPrompt: 'n' },
      )

      expect(result.stdout).toContain('Good choice. Exiting safely.')
      expect(result.exitCode).toBe(0)
    })

    it('should continue when user responds yes to prompt', async () => {
      const result = await runCli(
        [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--go-off-yolo-what-could-go-wrong',
        ],
        { respondToPrompt: 'y' },
      )

      expect(result.stderr).toContain(
        '※ YOLO mode activated - All safety prompts disabled!',
      )
      expect(result.stdout).toContain('Mock child app running')
    })

    it('should conflict with --dangerously-dismiss-edit-file-prompts', async () => {
      const result = await runCli([
        '--dangerously-allow-without-version-control',
        '--dangerously-allow-in-dirty-directory',
        '--go-off-yolo-what-could-go-wrong',
        '--dangerously-dismiss-edit-file-prompts',
      ])

      expect(result.stderr).toContain(
        'Error: Cannot use --go-off-yolo-what-could-go-wrong with individual dangerous prompt flags',
      )
      expect(result.stderr).toContain(
        'The YOLO flag already sets all dangerous prompt dismissals',
      )
      expect(result.exitCode).toBe(1)
    })

    it('should conflict with --dangerously-dismiss-create-file-prompts', async () => {
      const result = await runCli([
        '--dangerously-allow-without-version-control',
        '--dangerously-allow-in-dirty-directory',
        '--go-off-yolo-what-could-go-wrong',
        '--dangerously-dismiss-create-file-prompts',
      ])

      expect(result.stderr).toContain(
        'Error: Cannot use --go-off-yolo-what-could-go-wrong with individual dangerous prompt flags',
      )
      expect(result.exitCode).toBe(1)
    })

    it('should conflict with --dangerously-dismiss-bash-command-prompts', async () => {
      const result = await runCli([
        '--dangerously-allow-without-version-control',
        '--dangerously-allow-in-dirty-directory',
        '--go-off-yolo-what-could-go-wrong',
        '--dangerously-dismiss-bash-command-prompts',
      ])

      expect(result.stderr).toContain(
        'Error: Cannot use --go-off-yolo-what-could-go-wrong with individual dangerous prompt flags',
      )
      expect(result.exitCode).toBe(1)
    })

    it('should conflict with multiple dangerous flags', async () => {
      const result = await runCli([
        '--dangerously-allow-without-version-control',
        '--dangerously-allow-in-dirty-directory',
        '--go-off-yolo-what-could-go-wrong',
        '--dangerously-dismiss-edit-file-prompts',
        '--dangerously-dismiss-create-file-prompts',
      ])

      expect(result.stderr).toContain(
        'Error: Cannot use --go-off-yolo-what-could-go-wrong with individual dangerous prompt flags',
      )
      expect(result.exitCode).toBe(1)
    })

    it('should work with other non-conflicting flags', async () => {
      const result = await runCli(
        [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--go-off-yolo-what-could-go-wrong',
          '--no-show-notifications',
        ],
        { respondToPrompt: 'y' },
      )

      expect(result.stderr).toContain(
        '※ YOLO mode activated - All safety prompts disabled!',
      )
      expect(result.exitCode).toBe(0)
    })
  })
})
