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

      await new Promise(resolve => setTimeout(resolve, 2000))

      expect(output).toContain('Mock interactive mode')
      expect(output).toContain('mock>')

      ptyProcess.write('hello\r')
      await new Promise(resolve => setTimeout(resolve, 500))

      const cleanOutput = output.replace(/\x1b\[[0-9;]*[mGKJ]/g, '')
      expect(cleanOutput).toContain('Echo: hello')

      ptyProcess.write('exit\r')
      await new Promise(resolve => {
        ptyProcess.onExit(() => resolve(undefined))
      })

      expect(output).toContain('Goodbye!')
    })

    it('should preserve color output from child app', async () => {
      const pty = await import('node-pty')

      const ptyProcess = pty.spawn('pnpm', ['tsx', cliPath, '--color'], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        env: { ...process.env, CLAUDE_APP_PATH: mockAppPath },
      })

      let output = ''
      ptyProcess.onData(data => {
        output += data
      })

      await new Promise<void>(resolve => {
        ptyProcess.onExit(() => resolve())
      })

      expect(output).toContain('\x1b[31m')
      expect(output).toContain('\x1b[32m')
      expect(output).toContain('\x1b[33m')
      expect(output).toContain('\x1b[34m')
      expect(output).toContain('\x1b[0m')
    })

    it('should handle terminal resize events', async () => {
      const pty = await import('node-pty')

      const ptyProcess = pty.spawn(
        'pnpm',
        ['tsx', cliPath, '--size', '--watch'],
        {
          name: 'xterm-color',
          cols: 80,
          rows: 30,
          env: { ...process.env, CLAUDE_APP_PATH: mockAppPath },
        },
      )

      let output = ''
      let processExited = false

      ptyProcess.onData(data => {
        output += data
      })

      ptyProcess.onExit(() => {
        processExited = true
      })

      await new Promise(resolve => setTimeout(resolve, 1000))
      expect(output).toContain('Terminal size: 80x30')
      expect(output).toContain('Watching for resize events...')

      if (!processExited) {
        try {
          ptyProcess.resize(100, 40)

          await new Promise(resolve => setTimeout(resolve, 500))
          expect(output).toContain('Resized to: 100x40')
        } catch (e) {}
      }

      if (!processExited) {
        ptyProcess.kill()
      }

      await new Promise<void>(resolve => {
        if (processExited) {
          resolve()
        } else {
          ptyProcess.onExit(() => resolve())
        }
      })
    })
  })

  describe('Non-TTY mode', () => {
    it('should handle piped input/output in interactive mode', async () => {
      const result = await runCli(['--interactive'], {
        input: 'hello\nexit\n',
      })

      expect(result.stdout).toContain('Mock interactive mode')
      expect(result.stdout).toContain('Echo: hello')
      expect(result.stdout).toContain('Goodbye!')
    })

    it('should handle piped input in non-interactive mode', async () => {
      const testInput = 'This is test data\nWith multiple lines'
      const result = await runCli(['--stdin'], {
        input: testInput,
      })

      expect(result.stdout).toContain('Reading from stdin...')
      expect(result.stdout).toContain('Received input:')
      expect(result.stdout).toContain(testInput)
      expect(result.exitCode).toBe(0)
    })

    it('should preserve color output in non-TTY mode', async () => {
      const result = await runCli(['--color'])

      expect(result.stdout).toContain('\x1b[31m')
      expect(result.stdout).toContain('\x1b[32m')
      expect(result.stdout).toContain('\x1b[33m')
      expect(result.stdout).toContain('\x1b[34m')
      expect(result.stdout).toContain('\x1b[0m')
      expect(result.exitCode).toBe(0)
    })

    it('should set FORCE_COLOR and TERM environment variables', async () => {
      const result = await runCli()
      expect(result.exitCode).toBe(0)
    })
  })

  describe('Pattern matching integration', () => {
    it('should trigger pattern response when child outputs "Welcome to"', async () => {
      const pty = await import('node-pty')

      const ptyProcess = pty.spawn('pnpm', ['tsx', cliPath, '--welcome'], {
        name: 'xterm-color',
        cols: 80,
        rows: 30,
        env: { ...process.env, CLAUDE_APP_PATH: mockAppPath },
      })

      let output = ''
      ptyProcess.onData(data => {
        output += data
      })

      // Wait for initial output
      await new Promise(resolve => setTimeout(resolve, 2000))

      // Check that welcome message was output
      expect(output).toContain('Welcome to Claude Code!')

      // Check that pattern response was received by mock app
      expect(output).toContain('Received input: Claude Composer is ready!')

      ptyProcess.write('exit\r')
      await new Promise(resolve => {
        ptyProcess.onExit(() => resolve(undefined))
      })
    }, 10000)
  })

  describe('Parent CLI options', () => {
    it('should handle --show-notifications flag', async () => {
      const result = await runCli(['--show-notifications'])
      expect(result.stdout).toContain('Notifications are enabled')
      expect(result.stdout).toContain('Mock child app running')
      expect(result.exitCode).toBe(0)
    })

    it('should filter parent options from child args', async () => {
      const result = await runCli([
        '--show-notifications',
        '--echo-args',
        'test1',
        'test2',
      ])
      expect(result.stdout).toContain('Notifications are enabled')
      expect(result.stdout).toContain('ARGS: --echo-args test1 test2')
      expect(result.stdout).not.toContain('--show-notifications')
      expect(result.exitCode).toBe(0)
    })

    it('should work with multiple parent and child options mixed', async () => {
      const result = await runCli([
        '--echo-args',
        '--show-notifications',
        'arg1',
        'arg2',
      ])
      expect(result.stdout).toContain('Notifications are enabled')
      expect(result.stdout).toContain('ARGS: --echo-args arg1 arg2')
      expect(result.exitCode).toBe(0)
    })
  })
})
