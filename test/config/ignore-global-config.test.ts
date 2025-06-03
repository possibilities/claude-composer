import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { runCli } from '../utils/test-utils'

describe('--ignore-global-config flag', () => {
  let tempConfigDir: string
  let tempWorkDir: string
  let originalConfigDir: string | undefined

  beforeEach(() => {
    // Save original config dir env
    originalConfigDir = process.env.CLAUDE_COMPOSER_CONFIG_DIR

    // Create temp config directory for global config
    tempConfigDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'claude-composer-test-'),
    )
    process.env.CLAUDE_COMPOSER_CONFIG_DIR = tempConfigDir

    // Create temp working directory without any project config
    tempWorkDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'claude-composer-work-'),
    )

    // Create a test config file with non-default values
    const configPath = path.join(tempConfigDir, 'config.yaml')
    const testConfig = `
show_notifications: true
rulesets:
  - test-ruleset
`
    fs.writeFileSync(configPath, testConfig)

    // Create a ruleset that accepts prompts
    const rulesetsDir = path.join(tempConfigDir, 'rulesets')
    fs.mkdirSync(rulesetsDir, { recursive: true })
    const rulesetContent = `accept_project_edit_file_prompts: true
accept_project_create_file_prompts: true
accept_project_bash_command_prompts: true
`
    fs.writeFileSync(
      path.join(rulesetsDir, 'test-ruleset.yaml'),
      rulesetContent,
    )
  })

  afterEach(() => {
    // Restore original config dir
    if (originalConfigDir !== undefined) {
      process.env.CLAUDE_COMPOSER_CONFIG_DIR = originalConfigDir
    } else {
      delete process.env.CLAUDE_COMPOSER_CONFIG_DIR
    }

    // Clean up temp directories
    fs.rmSync(tempConfigDir, { recursive: true, force: true })
    fs.rmSync(tempWorkDir, { recursive: true, force: true })
  })

  it('should ignore global config file when --ignore-global-config is used', async () => {
    // Create a .git directory in the temp work dir to avoid version control warning
    fs.mkdirSync(path.join(tempWorkDir, '.git'), { recursive: true })

    const result = await runCli({
      args: [
        '--ignore-global-config',
        '--dangerously-allow-in-dirty-directory',
      ],
      env: {
        CLAUDE_COMPOSER_CONFIG_DIR: tempConfigDir,
      },
      cwd: tempWorkDir,
      timeout: 8000,
    })

    // Should see the log message about ignoring config
    expect(result.stdout).toContain('※ Ignoring global configuration file')

    // Should NOT see the automatic acceptance warning because global config with rulesets was ignored
    // Note: This only works if there's no project-level config in the working directory
    expect(result.stdout).not.toContain('⚠️  AUTOMATIC ACCEPTANCE ENABLED ⚠️')
  })

  it('should load global config file when --ignore-global-config is NOT used', async () => {
    // Create a .git directory in the temp work dir to avoid version control warning
    fs.mkdirSync(path.join(tempWorkDir, '.git'), { recursive: true })

    const result = await runCli({
      args: ['--dangerously-allow-in-dirty-directory'],
      env: {
        CLAUDE_COMPOSER_CONFIG_DIR: tempConfigDir,
      },
      cwd: tempWorkDir,
      timeout: 8000,
    })

    // Should NOT see the ignore message
    expect(result.stdout).not.toContain('※ Ignoring global configuration file')

    // Should see automatic acceptance warning from the global config file rulesets
    expect(result.stdout).toContain('⚠️  AUTOMATIC ACCEPTANCE ENABLED ⚠️')
    expect(result.stdout).toContain(
      '(Skipping interactive prompt in test mode)',
    )
  })

  it('should still accept command line flags when --ignore-global-config is used', async () => {
    // Create a .git directory in the temp work dir to avoid version control warning
    fs.mkdirSync(path.join(tempWorkDir, '.git'), { recursive: true })

    const result = await runCli({
      args: [
        '--ignore-global-config',
        '--show-notifications',
        '--dangerously-allow-in-dirty-directory',
      ],
      env: {
        CLAUDE_COMPOSER_CONFIG_DIR: tempConfigDir,
      },
      cwd: tempWorkDir,
      timeout: 8000,
    })

    // Should ignore config file
    expect(result.stdout).toContain('※ Ignoring global configuration file')

    // Should still show notifications based on CLI flag
    expect(result.stdout).toContain('※ Notifications are enabled')
  })
})
