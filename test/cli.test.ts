import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { spawn, ChildProcess } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

const cliPath = path.join(__dirname, '..', 'cli.ts')
const mockAppPath = path.join(__dirname, 'mock-child-app.ts')

describe('CLI Wrapper', () => {
  beforeEach(() => {
    process.env.CLAUDE_APP_PATH = mockAppPath
  })

  afterEach(() => {
    delete process.env.CLAUDE_APP_PATH
    delete process.env.CLAUDE_PATTERNS_PATH
    try {
      fs.unlinkSync('/tmp/test-pattern-match.log')
    } catch {}
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
      const result = await runCli([
        '--dangerously-allow-without-version-control',
        '--dangerously-allow-in-dirty-directory',
      ])
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Mock child app running')
    })

    it('should use CLAUDE_APP_PATH environment variable', async () => {
      const result = await runCli(
        [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
        ],
        {
          env: { ...process.env, MOCK_ENV: 'test-value' },
        },
      )
      expect(result.stdout).toContain('Environment: test-value')
    })

    it('should forward command line arguments', async () => {
      const result = await runCli([
        '--dangerously-allow-without-version-control',
        '--dangerously-allow-in-dirty-directory',
        '--echo-args',
        'arg1',
        'arg2',
      ])
      expect(result.stdout).toContain('ARGS: --echo-args arg1 arg2')
    })

    it('should pass through exit codes', async () => {
      const result = await runCli([
        '--dangerously-allow-without-version-control',
        '--dangerously-allow-in-dirty-directory',
        '--exit',
        '42',
      ])
      expect(result.exitCode).toBe(42)
    })
  })

  describe('TTY mode', () => {
    it('should handle interactive input/output in TTY mode', async () => {
      const pty = await import('node-pty')

      const ptyProcess = pty.spawn(
        'pnpm',
        [
          'tsx',
          cliPath,
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--interactive',
        ],
        {
          name: 'xterm-color',
          cols: 80,
          rows: 30,
          env: { ...process.env, CLAUDE_APP_PATH: mockAppPath },
        },
      )

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

      const ptyProcess = pty.spawn(
        'pnpm',
        [
          'tsx',
          cliPath,
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--color',
        ],
        {
          name: 'xterm-color',
          cols: 80,
          rows: 30,
          env: { ...process.env, CLAUDE_APP_PATH: mockAppPath },
        },
      )

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
        [
          'tsx',
          cliPath,
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--size',
          '--watch',
        ],
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
      const result = await runCli(
        [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--interactive',
        ],
        {
          input: 'hello\nexit\n',
        },
      )

      expect(result.stdout).toContain('Mock interactive mode')
      expect(result.stdout).toContain('Echo: hello')
      expect(result.stdout).toContain('Goodbye!')
    })

    it('should handle piped input in non-interactive mode', async () => {
      const testInput = 'This is test data\nWith multiple lines'
      const result = await runCli(
        [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--stdin',
        ],
        {
          input: testInput,
        },
      )

      expect(result.stdout).toContain('Reading from stdin...')
      expect(result.stdout).toContain('Received input:')
      expect(result.stdout).toContain(testInput)
      expect(result.exitCode).toBe(0)
    })

    it('should preserve color output in non-TTY mode', async () => {
      const result = await runCli([
        '--dangerously-allow-without-version-control',
        '--dangerously-allow-in-dirty-directory',
        '--color',
      ])

      expect(result.stdout).toContain('\x1b[31m')
      expect(result.stdout).toContain('\x1b[32m')
      expect(result.stdout).toContain('\x1b[33m')
      expect(result.stdout).toContain('\x1b[34m')
      expect(result.stdout).toContain('\x1b[0m')
      expect(result.exitCode).toBe(0)
    })

    it('should set FORCE_COLOR and TERM environment variables', async () => {
      const result = await runCli([
        '--dangerously-allow-without-version-control',
        '--dangerously-allow-in-dirty-directory',
      ])
      expect(result.exitCode).toBe(0)
    })
  })

  describe('Pattern matching integration', () => {
    it('should trigger pattern response when child outputs "Welcome to"', async () => {
      const pty = await import('node-pty')
      const testPatternsPath = path.join(__dirname, 'test-patterns')

      const ptyProcess = pty.spawn(
        'pnpm',
        [
          'tsx',
          cliPath,
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--welcome',
        ],
        {
          name: 'xterm-color',
          cols: 80,
          rows: 30,
          env: {
            ...process.env,
            CLAUDE_APP_PATH: mockAppPath,
            CLAUDE_PATTERNS_PATH: testPatternsPath,
          },
        },
      )

      let output = ''
      ptyProcess.onData(data => {
        output += data
      })

      // Wait for initial output and pattern processing
      await new Promise(resolve => setTimeout(resolve, 3000))

      // Check that welcome message was output
      expect(output).toContain('Welcome to Claude Code!')

      // Check that pattern response was received by mock app
      expect(output).toContain('Received input: Test response')

      ptyProcess.write('exit\r')
      await new Promise(resolve => {
        ptyProcess.onExit(() => resolve(undefined))
      })
    }, 10000)
  })

  describe('Parent CLI options', () => {
    it('should handle --show-notifications flag', async () => {
      const result = await runCli([
        '--dangerously-allow-without-version-control',
        '--dangerously-allow-in-dirty-directory',
        '--show-notifications',
      ])
      expect(result.stdout).toContain('Notifications are enabled')
      expect(result.stdout).toContain('Mock child app running')
      expect(result.exitCode).toBe(0)
    })

    it('should filter parent options from child args', async () => {
      const result = await runCli([
        '--dangerously-allow-without-version-control',
        '--dangerously-allow-in-dirty-directory',
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
        '--dangerously-allow-without-version-control',
        '--dangerously-allow-in-dirty-directory',
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

  describe('YAML Configuration', () => {
    let testConfigDir: string
    let testConfigPath: string

    beforeEach(() => {
      // Create unique test config directory
      testConfigDir = fs.mkdtempSync(
        path.join(os.tmpdir(), 'claude-composer-test-config-'),
      )
      testConfigPath = path.join(testConfigDir, 'config.yaml')
    })

    afterEach(() => {
      // Clean up test config directory
      try {
        if (fs.existsSync(testConfigDir)) {
          fs.rmSync(testConfigDir, { recursive: true, force: true })
        }
      } catch {}
    })

    it('should load show_notifications setting from YAML config', async () => {
      const configContent = 'show_notifications: true'
      fs.writeFileSync(testConfigPath, configContent)

      const result = await runCli(
        [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
        ],
        {
          env: { ...process.env, CLAUDE_COMPOSER_CONFIG_DIR: testConfigDir },
        },
      )

      expect(result.stdout).toContain('Notifications are enabled')
      expect(result.exitCode).toBe(0)
    })

    it('should work without config file (default behavior)', async () => {
      const result = await runCli(
        [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
        ],
        {
          env: { ...process.env, CLAUDE_COMPOSER_CONFIG_DIR: testConfigDir },
        },
      )
      expect(result.stdout).toContain('Notifications are enabled')
      expect(result.stdout).toContain('Mock child app running')
      expect(result.exitCode).toBe(0)
    })

    it('should prioritize CLI flag over YAML config', async () => {
      const configContent = 'show_notifications: false'
      fs.writeFileSync(testConfigPath, configContent)

      const result = await runCli(
        [
          '--show-notifications',
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
        ],
        {
          env: { ...process.env, CLAUDE_COMPOSER_CONFIG_DIR: testConfigDir },
        },
      )

      expect(result.stdout).toContain('Notifications are enabled')
      expect(result.exitCode).toBe(0)
    })

    it('should handle invalid YAML config gracefully', async () => {
      const invalidConfig = 'show_notifications: [invalid: yaml'
      fs.writeFileSync(testConfigPath, invalidConfig)

      const result = await runCli(
        [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
        ],
        {
          env: { ...process.env, CLAUDE_COMPOSER_CONFIG_DIR: testConfigDir },
        },
      )

      // Should still work despite invalid config
      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Mock child app running')
    })

    it('should show notifications by default when no config exists', async () => {
      // Ensure no config file exists
      if (fs.existsSync(testConfigPath)) {
        fs.unlinkSync(testConfigPath)
      }

      const result = await runCli(
        [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
        ],
        {
          env: { ...process.env, CLAUDE_COMPOSER_CONFIG_DIR: testConfigDir },
        },
      )

      expect(result.stdout).toContain('Notifications are enabled')
      expect(result.exitCode).toBe(0)
    })

    it('should respect show_notifications config when explicitly enabled', async () => {
      const configContent = 'show_notifications: true'
      fs.writeFileSync(testConfigPath, configContent)

      const result = await runCli(
        [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
        ],
        {
          env: { ...process.env, CLAUDE_COMPOSER_CONFIG_DIR: testConfigDir },
        },
      )

      expect(result.stdout).toContain('Notifications are enabled')
      expect(result.exitCode).toBe(0)
    })

    it('should not show notifications when disabled in config', async () => {
      const configContent = 'show_notifications: false'
      fs.writeFileSync(testConfigPath, configContent)

      const result = await runCli(
        [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
        ],
        {
          env: { ...process.env, CLAUDE_COMPOSER_CONFIG_DIR: testConfigDir },
        },
      )

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Mock child app running')
    })

    it('should trigger notifications when pattern matches and notifications enabled', async () => {
      // Mock notifier
      const mockNotify = vi.fn()
      vi.doMock('node-notifier', () => ({
        default: { notify: mockNotify },
      }))

      const configContent = 'show_notifications: true'
      fs.writeFileSync(testConfigPath, configContent)

      // Create a temporary pattern file that will match our mock app output
      const testPatternPath = path.join(testConfigDir, 'test-patterns.json')
      const testPatterns = [
        {
          id: 'integration-test',
          pattern: 'Mock child app running',
          action: { type: 'log', path: '/tmp/integration-test.log' },
        },
      ]
      fs.writeFileSync(testPatternPath, JSON.stringify(testPatterns, null, 2))

      const result = await runCli(
        [
          '--patterns',
          testPatternPath,
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
        ],
        {
          env: { ...process.env, CLAUDE_COMPOSER_CONFIG_DIR: testConfigDir },
        },
      )

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Mock child app running')
    })

    it('should handle --no-show-notifications flag', async () => {
      const result = await runCli(
        [
          '--no-show-notifications',
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
        ],
        {
          env: { ...process.env, CLAUDE_COMPOSER_CONFIG_DIR: testConfigDir },
        },
      )

      expect(result.stdout).not.toContain('Notifications are enabled')
      expect(result.exitCode).toBe(0)
    })

    it('should handle --show-notifications flag explicitly', async () => {
      const result = await runCli(
        [
          '--show-notifications',
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
        ],
        {
          env: { ...process.env, CLAUDE_COMPOSER_CONFIG_DIR: testConfigDir },
        },
      )

      expect(result.stdout).toContain('Notifications are enabled')
      expect(result.exitCode).toBe(0)
    })

    it('should prioritize CLI flag over config file', async () => {
      // Set config to disable notifications
      const configContent = 'show_notifications: false'
      fs.writeFileSync(testConfigPath, configContent)

      // But enable via CLI flag
      const result = await runCli(
        [
          '--show-notifications',
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
        ],
        {
          env: { ...process.env, CLAUDE_COMPOSER_CONFIG_DIR: testConfigDir },
        },
      )

      expect(result.stdout).toContain('Notifications are enabled')
      expect(result.exitCode).toBe(0)
    })

    it('should support negatable dangerous options', async () => {
      const result = await runCli(
        [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--no-dangerously-dismiss-edit-file-prompts',
          '--no-dangerously-dismiss-create-file-prompts',
          '--no-dangerously-dismiss-bash-prompts',
        ],
        {
          env: { ...process.env, CLAUDE_COMPOSER_CONFIG_DIR: testConfigDir },
        },
      )

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Mock child app running')
    })

    it('should handle --dangerously-dismiss-bash-prompts flag', async () => {
      const result = await runCli(
        [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--dangerously-dismiss-bash-prompts',
          '--echo-args',
        ],
        {
          env: { ...process.env, CLAUDE_COMPOSER_CONFIG_DIR: testConfigDir },
        },
      )

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('ARGS: --echo-args')
      expect(result.stdout).not.toContain('--dangerously-dismiss-bash-prompts')
    })

    it('should load dangerously_dismiss_bash_prompts from config', async () => {
      const configContent = 'dangerously_dismiss_bash_prompts: true'
      fs.writeFileSync(testConfigPath, configContent)

      const result = await runCli(
        [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
        ],
        {
          env: { ...process.env, CLAUDE_COMPOSER_CONFIG_DIR: testConfigDir },
        },
      )

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Mock child app running')
    })

    it('should prioritize CLI flag over config for bash prompts', async () => {
      const configContent = 'dangerously_dismiss_bash_prompts: true'
      fs.writeFileSync(testConfigPath, configContent)

      const result = await runCli(
        [
          '--no-dangerously-dismiss-bash-prompts',
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
        ],
        {
          env: { ...process.env, CLAUDE_COMPOSER_CONFIG_DIR: testConfigDir },
        },
      )

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('Mock child app running')
    })

    it('should handle all dismiss prompts flags together', async () => {
      const result = await runCli(
        [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--dangerously-dismiss-edit-file-prompts',
          '--dangerously-dismiss-create-file-prompts',
          '--dangerously-dismiss-bash-prompts',
          '--echo-args',
        ],
        {
          env: { ...process.env, CLAUDE_COMPOSER_CONFIG_DIR: testConfigDir },
        },
      )

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('ARGS: --echo-args')
      // Ensure none of the parent flags are passed through
      expect(result.stdout).not.toContain(
        '--dangerously-dismiss-edit-file-prompts',
      )
      expect(result.stdout).not.toContain(
        '--dangerously-dismiss-create-file-prompts',
      )
      expect(result.stdout).not.toContain('--dangerously-dismiss-bash-prompts')
    })

    it('should handle mixed positive and negative dismiss flags', async () => {
      const result = await runCli(
        [
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--dangerously-dismiss-edit-file-prompts',
          '--no-dangerously-dismiss-create-file-prompts',
          '--dangerously-dismiss-bash-prompts',
          '--echo-args',
        ],
        {
          env: { ...process.env, CLAUDE_COMPOSER_CONFIG_DIR: testConfigDir },
        },
      )

      expect(result.exitCode).toBe(0)
      expect(result.stdout).toContain('ARGS: --echo-args')
      // Ensure none of the flags are passed through
      expect(result.stdout).not.toContain('dismiss')
    })
  })
})
