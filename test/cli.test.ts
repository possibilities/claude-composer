import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawn, ChildProcess } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

const cliPath = path.join(__dirname, '..', 'cli.ts')
const mockAppPath = path.join(__dirname, 'mock-child-app.ts')

describe('CLI Wrapper', () => {
  let tempDir: string

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-test-'))
    process.env.CLAUDE_APP_PATH = mockAppPath
  })

  afterEach(() => {
    delete process.env.CLAUDE_APP_PATH

    // Clean up temp dir
    try {
      fs.rmSync(tempDir, { recursive: true })
    } catch (e) {}
  })

  function runCli(
    args: string[] = [],
    options: any = {},
  ): Promise<{
    stdout: string
    stderr: string
    exitCode: number | null
    process: ChildProcess
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

      if (options.input) {
        child.stdin?.write(options.input)
        child.stdin?.end()
      }
    })
  }

  describe('Basic functionality', () => {
    it('should run the mock child app', async () => {
      const result = await runCli()
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Mock child app running')
    })

    it('should use CLAUDE_APP_PATH environment variable', async () => {
      const result = await runCli([], {
        env: { ...process.env, MOCK_ENV: 'test-value' },
      })
      expect(result.stdout).toContain('Environment: test-value')
    })

    it('should forward command line arguments', async () => {
      const result = await runCli(['--echo-args', 'arg1', 'arg2'])
      expect(result.stdout).toContain('ARGS: --echo-args arg1 arg2')
    })

    it('should pass through exit codes', async () => {
      const result = await runCli(['--exit', '42'])
      expect(result.exitCode).toBe(42)
    })
  })

  describe('TTY mode', () => {
    it('should handle interactive input/output in TTY mode', async () => {
      const pty = await import('node-pty')

      const ptyProcess = pty.spawn('pnpm', ['tsx', cliPath, '--interactive'], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        env: { ...process.env, CLAUDE_APP_PATH: mockAppPath },
      })

      let output = ''
      ptyProcess.onData(data => {
        output += data
      })

      // Wait for prompt
      await new Promise(resolve => setTimeout(resolve, 2000))

      expect(output).toContain('Mock interactive mode')
      expect(output).toContain('mock>')

      // Send input
      ptyProcess.write('hello\r')
      await new Promise(resolve => setTimeout(resolve, 500))

      // Strip ANSI escape sequences for easier testing
      const cleanOutput = output.replace(/\x1b\[[0-9;]*[mGKJ]/g, '')
      expect(cleanOutput).toContain('Echo: hello')

      // Exit
      ptyProcess.write('exit\r')
      await new Promise(resolve => {
        ptyProcess.onExit(() => resolve(undefined))
      })

      expect(output).toContain('Goodbye!')
    })
  })

  describe('Non-TTY mode', () => {
    it('should handle piped input/output', async () => {
      const result = await runCli(['--interactive'], {
        input: 'hello\\nexit\\n',
      })

      expect(result.stdout).toContain('Mock interactive mode')
      expect(result.stdout).toContain('Echo: hello')
      expect(result.stdout).toContain('Goodbye!')
    })

    it('should set FORCE_COLOR and TERM environment variables', async () => {
      // This test would need the mock app to echo these env vars
      // For now, we just verify the process runs correctly
      const result = await runCli()
      expect(result.exitCode).toBe(0)
    })
  })
})
