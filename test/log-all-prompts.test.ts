import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

describe('--log-all-prompts flag', () => {
  const cliPath = path.join(__dirname, '..', 'cli.ts')
  const mockAppPath = path.join(__dirname, 'mock-child-app.ts')
  let tempConfigDir: string
  let originalConfigDir: string | undefined

  beforeEach(() => {
    // Save original config dir env
    originalConfigDir = process.env.CLAUDE_COMPOSER_CONFIG_DIR

    // Create temp config directory
    tempConfigDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'claude-composer-test-'),
    )
    process.env.CLAUDE_COMPOSER_CONFIG_DIR = tempConfigDir

    // Clean up any existing log files
    const logFiles = [
      '/tmp/claude-edit-file-prompts.log',
      '/tmp/claude-create-file-prompts.log',
      '/tmp/claude-bash-command-prompts.log',
    ]
    logFiles.forEach(file => {
      if (fs.existsSync(file)) {
        fs.unlinkSync(file)
      }
    })
  })

  afterEach(() => {
    // Restore original config dir
    if (originalConfigDir !== undefined) {
      process.env.CLAUDE_COMPOSER_CONFIG_DIR = originalConfigDir
    } else {
      delete process.env.CLAUDE_COMPOSER_CONFIG_DIR
    }

    // Clean up temp directory
    fs.rmSync(tempConfigDir, { recursive: true, force: true })
  })

  it('should enable logging when --log-all-prompts is used', async () => {
    const result = await new Promise<{
      stdout: string
      stderr: string
      exitCode: number | null
    }>(resolve => {
      const child = spawn(
        'npx',
        [
          'tsx',
          cliPath,
          '--log-all-prompts',
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
        ],
        {
          env: {
            ...process.env,
            CLAUDE_COMPOSER_CONFIG_DIR: tempConfigDir,
            CLAUDE_APP_PATH: mockAppPath,
          },
        },
      )

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', data => {
        stdout += data.toString()
      })

      child.stderr.on('data', data => {
        stderr += data.toString()
      })

      child.on('exit', code => {
        resolve({ stdout, stderr, exitCode: code })
      })
    })

    // Should see the log message about logging being enabled
    expect(result.stdout).toContain('※ Logging all prompts to /tmp')
  })

  it('should not enable logging when --no-log-all-prompts is used', async () => {
    // Create a config file with log_all_prompts enabled
    const configPath = path.join(tempConfigDir, 'config.yaml')
    const testConfig = `log_all_prompts: true`
    fs.writeFileSync(configPath, testConfig)

    const result = await new Promise<{
      stdout: string
      stderr: string
      exitCode: number | null
    }>(resolve => {
      const child = spawn(
        'npx',
        [
          'tsx',
          cliPath,
          '--no-log-all-prompts',
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
        ],
        {
          env: {
            ...process.env,
            CLAUDE_COMPOSER_CONFIG_DIR: tempConfigDir,
            CLAUDE_APP_PATH: mockAppPath,
          },
        },
      )

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', data => {
        stdout += data.toString()
      })

      child.stderr.on('data', data => {
        stderr += data.toString()
      })

      child.on('exit', code => {
        resolve({ stdout, stderr, exitCode: code })
      })
    })

    // Should NOT see the log message
    expect(result.stdout).not.toContain('※ Logging all prompts to /tmp')
  })

  it('should load log_all_prompts from config file', async () => {
    // Create a config file with log_all_prompts enabled
    const configPath = path.join(tempConfigDir, 'config.yaml')
    const testConfig = `log_all_prompts: true`
    fs.writeFileSync(configPath, testConfig)

    const result = await new Promise<{
      stdout: string
      stderr: string
      exitCode: number | null
    }>(resolve => {
      const child = spawn(
        'npx',
        [
          'tsx',
          cliPath,
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
        ],
        {
          env: {
            ...process.env,
            CLAUDE_COMPOSER_CONFIG_DIR: tempConfigDir,
            CLAUDE_APP_PATH: mockAppPath,
          },
        },
      )

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', data => {
        stdout += data.toString()
      })

      child.stderr.on('data', data => {
        stderr += data.toString()
      })

      child.on('exit', code => {
        resolve({ stdout, stderr, exitCode: code })
      })
    })

    // Should see the log message from config
    expect(result.stdout).toContain('※ Logging all prompts to /tmp')
  })

  it('should prioritize CLI flag over config file', async () => {
    // Create a config file with log_all_prompts disabled
    const configPath = path.join(tempConfigDir, 'config.yaml')
    const testConfig = `log_all_prompts: false`
    fs.writeFileSync(configPath, testConfig)

    const result = await new Promise<{
      stdout: string
      stderr: string
      exitCode: number | null
    }>(resolve => {
      const child = spawn(
        'npx',
        [
          'tsx',
          cliPath,
          '--log-all-prompts',
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
        ],
        {
          env: {
            ...process.env,
            CLAUDE_COMPOSER_CONFIG_DIR: tempConfigDir,
            CLAUDE_APP_PATH: mockAppPath,
          },
        },
      )

      let stdout = ''
      let stderr = ''

      child.stdout.on('data', data => {
        stdout += data.toString()
      })

      child.stderr.on('data', data => {
        stderr += data.toString()
      })

      child.on('exit', code => {
        resolve({ stdout, stderr, exitCode: code })
      })
    })

    // CLI flag should override config - logging should be enabled
    expect(result.stdout).toContain('※ Logging all prompts to /tmp')
  })
})
