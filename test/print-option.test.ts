import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawn } from 'child_process'
import * as path from 'path'

const cliPath = path.join(__dirname, '..', 'cli.ts')
const mockAppPath = path.join(__dirname, 'mock-child-app.ts')

describe('--print Option Detection', () => {
  beforeEach(() => {
    process.env.CLAUDE_APP_PATH = mockAppPath
  })

  afterEach(() => {
    delete process.env.CLAUDE_APP_PATH
  })

  function runCli(
    args: string[] = [],
  ): Promise<{ stdout: string; stderr: string; exitCode: number | null }> {
    return new Promise(resolve => {
      const child = spawn('pnpm', ['tsx', cliPath, ...args], {
        env: process.env,
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
        resolve({ stdout, stderr, exitCode: code })
      })
    })
  }

  describe('--print detection', () => {
    it('should detect --print option and show non-interactive message', async () => {
      const result = await runCli([
        '--dangerously-allow-without-version-control',
        '--dangerously-allow-in-dirty-directory',
        '--print',
      ])
      expect(result.stdout).toContain(
        '※ Starting Claude Code in non-interactive mode due to --print option',
      )
      expect(result.stdout).not.toContain('※ Bypassing Claude Composer')
      expect(result.stdout).not.toContain(
        '※ Getting ready to launch Claude CLI',
      )
    })

    it('should detect --print option with other arguments', async () => {
      const result = await runCli([
        '--dangerously-allow-without-version-control',
        '--dangerously-allow-in-dirty-directory',
        '--print',
        'some-file.txt',
      ])
      expect(result.stdout).toContain(
        '※ Starting Claude Code in non-interactive mode due to --print option',
      )
      expect(result.stdout).not.toContain('※ Bypassing Claude Composer')
    })

    it('should detect --print option before other options', async () => {
      const result = await runCli([
        '--print',
        '--dangerously-allow-without-version-control',
        '--dangerously-allow-in-dirty-directory',
      ])
      expect(result.stdout).toContain(
        '※ Starting Claude Code in non-interactive mode due to --print option',
      )
      expect(result.stdout).not.toContain('※ Bypassing Claude Composer')
    })

    it('should pass all arguments to child app when --print is detected', async () => {
      const result = await runCli([
        '--dangerously-allow-without-version-control',
        '--dangerously-allow-in-dirty-directory',
        '--echo-args',
        '--print',
        '--some-other-option',
        'file.txt',
      ])
      expect(result.stdout).toContain(
        '※ Starting Claude Code in non-interactive mode due to --print option',
      )
      // The mock app should receive all the arguments
      expect(result.stdout).toContain('ARGS:')
      expect(result.stdout).toContain('--print')
      expect(result.stdout).toContain('--echo-args')
      expect(result.stdout).toContain('--some-other-option')
      expect(result.stdout).toContain('file.txt')
    })

    it('should not show subcommand message when --print is used with a subcommand-like argument', async () => {
      const result = await runCli([
        '--dangerously-allow-without-version-control',
        '--dangerously-allow-in-dirty-directory',
        '--print',
        'build',
      ])
      expect(result.stdout).toContain(
        '※ Starting Claude Code in non-interactive mode due to --print option',
      )
      expect(result.stdout).not.toContain('※ Running Claude Code subcommand')
    })
  })
})
