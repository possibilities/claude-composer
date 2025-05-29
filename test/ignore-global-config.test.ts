import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

describe('--ignore-global-config flag', () => {
  const cliPath = path.join(__dirname, '..', 'cli.ts')
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

    // Create a test config file with non-default values
    const configPath = path.join(tempConfigDir, 'config.yaml')
    const testConfig = `
show_notifications: true
dangerously_dismiss_edit_file_prompts: true
dangerously_dismiss_create_file_prompts: true
dangerously_dismiss_bash_command_prompts: true
`
    fs.writeFileSync(configPath, testConfig)
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

  it('should ignore config file when --ignore-global-config is used', async () => {
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
          '--ignore-global-config',
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
        ],
        {
          env: {
            ...process.env,
            CLAUDE_COMPOSER_CONFIG_DIR: tempConfigDir,
            CLAUDE_APP_PATH: path.join(__dirname, 'mock-child-app.ts'),
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

    // Should see the log message about ignoring config
    expect(result.stdout).toContain('※ Ignoring global configuration file')

    // Should NOT see the dangerous flag warnings (which would appear if config was loaded)
    expect(result.stdout).not.toContain(
      'WARNING: --dangerously-dismiss-edit-file-prompts is enabled',
    )
    expect(result.stdout).not.toContain(
      'WARNING: --dangerously-dismiss-create-file-prompts is enabled',
    )
    expect(result.stdout).not.toContain(
      'WARNING: --dangerously-dismiss-bash-command-prompts is enabled',
    )
  })

  it('should load config file when --ignore-global-config is NOT used', async () => {
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
            CLAUDE_APP_PATH: path.join(__dirname, 'mock-child-app.ts'),
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

    // Should NOT see the ignore message
    expect(result.stdout).not.toContain('※ Ignoring global configuration file')

    // Should see warnings from the config file values
    expect(result.stdout).toContain(
      'WARNING: --dangerously-dismiss-edit-file-prompts is enabled',
    )
    expect(result.stdout).toContain(
      'WARNING: --dangerously-dismiss-create-file-prompts is enabled',
    )
    expect(result.stdout).toContain(
      'WARNING: --dangerously-dismiss-bash-command-prompts is enabled',
    )
  })

  it('should still accept command line flags when --ignore-global-config is used', async () => {
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
          '--ignore-global-config',
          '--show-notifications',
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
        ],
        {
          env: {
            ...process.env,
            CLAUDE_COMPOSER_CONFIG_DIR: tempConfigDir,
            CLAUDE_APP_PATH: path.join(__dirname, 'mock-child-app.ts'),
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

    // Should ignore config file
    expect(result.stdout).toContain('※ Ignoring global configuration file')

    // Should still show notifications based on CLI flag
    expect(result.stdout).toContain('※ Notifications are enabled')
  })
})
