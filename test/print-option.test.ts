import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawn } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

const cliPath = path.join(__dirname, '..', 'cli.ts')
const mockAppPath = path.join(__dirname, 'mock-child-app.ts')
const TEST_ID = `test-print-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
const CONFIG_DIR = path.join(os.tmpdir(), TEST_ID, '.claude-composer')
const TOOLSETS_DIR = path.join(CONFIG_DIR, 'toolsets')

describe('--print Option Detection', () => {
  beforeEach(async () => {
    process.env.CLAUDE_APP_PATH = mockAppPath
    process.env.CLAUDE_COMPOSER_CONFIG_DIR = CONFIG_DIR
    process.env.CLAUDE_PATTERNS_PATH = './test/test-patterns'
    await fs.promises.mkdir(TOOLSETS_DIR, { recursive: true })
  })

  afterEach(async () => {
    delete process.env.CLAUDE_APP_PATH
    delete process.env.CLAUDE_COMPOSER_CONFIG_DIR
    delete process.env.CLAUDE_PATTERNS_PATH
    await fs.promises.rm(path.join(os.tmpdir(), TEST_ID), {
      recursive: true,
      force: true,
    })
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

    it('should filter known options but pass other arguments to child app when --print is detected', async () => {
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
      // The mock app should receive filtered arguments
      expect(result.stdout).toContain('ARGS:')
      expect(result.stdout).toContain('--print')
      expect(result.stdout).toContain('--echo-args')
      expect(result.stdout).toContain('--some-other-option')
      expect(result.stdout).toContain('file.txt')
      // Should NOT contain the known options that were filtered out
      expect(result.stdout).not.toContain(
        '--dangerously-allow-without-version-control',
      )
      expect(result.stdout).not.toContain(
        '--dangerously-allow-in-dirty-directory',
      )
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

    it('should filter --toolset option when --print is used', async () => {
      // Create a simple toolset file so it doesn't error
      const toolsetContent = `allowed:
  - TestTool
`
      await fs.promises.writeFile(
        path.join(TOOLSETS_DIR, 'some-toolset.yaml'),
        toolsetContent,
      )

      const result = await runCli([
        '--dangerously-allow-without-version-control',
        '--dangerously-allow-in-dirty-directory',
        '--toolset',
        'some-toolset',
        '--echo-args',
        '--print',
        'file.txt',
      ])
      expect(result.stdout).toContain(
        '※ Starting Claude Code in non-interactive mode due to --print option',
      )
      // The mock app should receive filtered arguments
      expect(result.stdout).toContain('ARGS:')
      expect(result.stdout).toContain('--print')
      expect(result.stdout).toContain('--echo-args')
      expect(result.stdout).toContain('file.txt')
      // Should have the expanded toolset arg
      expect(result.stdout).toContain('--allowedTools TestTool')
      // Should NOT contain the --toolset option itself in the ARGS line
      const argsLine = result.stdout
        .split('\n')
        .find(line => line.startsWith('ARGS:'))
      expect(argsLine).toBeDefined()
      expect(argsLine).not.toContain('--toolset')
      expect(argsLine).not.toContain('some-toolset')
    })

    it('should pass generated toolset args when --print is used with valid toolset', async () => {
      // Create a test toolset file
      const toolsetContent = `allowed:
  - EditFile
  - CreateFile
disallowed:
  - BashCommand
mcp:
  test-server:
    type: stdio
    command: test-mcp-server
`
      await fs.promises.writeFile(
        path.join(TOOLSETS_DIR, 'test-print.yaml'),
        toolsetContent,
      )

      const result = await runCli([
        '--dangerously-allow-without-version-control',
        '--dangerously-allow-in-dirty-directory',
        '--toolset',
        'test-print',
        '--echo-args',
        '--print',
        'file.txt',
      ])

      expect(result.stdout).toContain('※ Loaded toolset: test-print')
      expect(result.stdout).toContain('※ Toolset test-print allowed 2 tools')
      expect(result.stdout).toContain('※ Toolset test-print disallowed 1 tool')
      expect(result.stdout).toContain(
        '※ Toolset test-print configured 1 MCP server',
      )
      expect(result.stdout).toContain(
        '※ Starting Claude Code in non-interactive mode due to --print option',
      )

      // The mock app should receive the expanded toolset arguments
      expect(result.stdout).toContain('ARGS:')
      expect(result.stdout).toContain('--allowedTools EditFile')
      expect(result.stdout).toContain('--allowedTools CreateFile')
      expect(result.stdout).toContain('--disallowedTools BashCommand')
      expect(result.stdout).toContain('--mcp-config')

      // Should NOT contain the original --toolset option in the ARGS line
      const argsLine = result.stdout
        .split('\n')
        .find(line => line.startsWith('ARGS:'))
      expect(argsLine).toBeDefined()
      expect(argsLine).not.toContain('--toolset')
      // The toolset name will appear in the log messages but not in the args
    })
  })
})
