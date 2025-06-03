import { expect, test, describe, beforeEach } from 'vitest'
import { runCliInteractive } from '../utils/test-utils'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

describe('Automatic acceptance warnings', () => {
  let tmpDir: string
  let configFile: string
  let rulesetsDir: string

  beforeEach(() => {
    // Create a temporary directory for the test
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-composer-test-'))
    const configDir = path.join(tmpDir, '.claude-composer')
    fs.mkdirSync(configDir, { recursive: true })
    configFile = path.join(configDir, 'config.yaml')
    rulesetsDir = path.join(configDir, 'rulesets')
    fs.mkdirSync(rulesetsDir, { recursive: true })

    // Create empty git directory to avoid version control prompt
    const gitDir = path.join(tmpDir, '.git')
    fs.mkdirSync(gitDir, { recursive: true })
  })

  test('shows automatic acceptance warning when rulesets are configured', async () => {
    // Create a ruleset that accepts edits
    const rulesetContent = `accept_project_edit_file_prompts: true
accept_project_create_file_prompts: true
accept_project_bash_command_prompts: true
`
    fs.writeFileSync(
      path.join(rulesetsDir, 'test-ruleset.yaml'),
      rulesetContent,
    )

    // Create config that uses the ruleset
    const config = `rulesets:
  - test-ruleset
`
    fs.writeFileSync(configFile, config)

    const result = await runCliInteractive({
      args: ['--dangerously-allow-in-dirty-directory'],
      env: {
        CLAUDE_COMPOSER_CONFIG_DIR: path.join(tmpDir, '.claude-composer'),
        PWD: tmpDir,
      },
      cwd: tmpDir,
      interactions: [
        {
          waitFor: 'Do you want to continue with automatic acceptance enabled?',
          respond: 'y\n',
        },
      ],
    })

    expect(result.output).toContain('⚠️  AUTOMATIC ACCEPTANCE ENABLED ⚠️')
    expect(result.output).toContain(
      '(Skipping interactive prompt in test mode)',
    )
  })

  test('skips warning when --safe flag is used', async () => {
    // Create a ruleset that accepts edits
    const rulesetContent = `accept_project_edit_file_prompts: true
accept_project_create_file_prompts: true
`
    fs.writeFileSync(
      path.join(rulesetsDir, 'test-ruleset.yaml'),
      rulesetContent,
    )

    // Create config that uses the ruleset
    const config = `rulesets:
  - test-ruleset
`
    fs.writeFileSync(configFile, config)

    const result = await runCliInteractive({
      args: ['--safe', '--version'],
      env: {
        CLAUDE_COMPOSER_CONFIG_DIR: path.join(tmpDir, '.claude-composer'),
        PWD: tmpDir,
      },
      cwd: tmpDir,
      interactions: [],
    })

    expect(result.output).not.toContain('⚠️  AUTOMATIC ACCEPTANCE ENABLED ⚠️')
    expect(result.output).not.toContain(
      'Do you want to continue with automatic acceptance enabled?',
    )
  })

  test('shows warning in test mode when rulesets have acceptance rules', async () => {
    // Create a ruleset that accepts edits
    const rulesetContent = `accept_project_edit_file_prompts: true`
    fs.writeFileSync(
      path.join(rulesetsDir, 'test-ruleset.yaml'),
      rulesetContent,
    )

    // Create config that uses the ruleset
    const config = `rulesets:
  - test-ruleset
`
    fs.writeFileSync(configFile, config)

    const result = await runCliInteractive({
      args: ['--dangerously-allow-in-dirty-directory'],
      env: {
        CLAUDE_COMPOSER_CONFIG_DIR: path.join(tmpDir, '.claude-composer'),
        PWD: tmpDir,
      },
      cwd: tmpDir,
      interactions: [],
    })

    // In test mode, it just shows the warning and continues
    expect(result.output).toContain('⚠️  AUTOMATIC ACCEPTANCE ENABLED ⚠️')
    expect(result.output).toContain(
      '(Skipping interactive prompt in test mode)',
    )
    expect(result.exitCode).toBe(0)
  })

  test('does not show warning for rulesets without acceptance rules', async () => {
    // Create a ruleset without any acceptance rules (empty object)
    const rulesetContent = `{}`
    fs.writeFileSync(
      path.join(rulesetsDir, 'test-ruleset.yaml'),
      rulesetContent,
    )

    // Create config that uses the ruleset
    const config = `rulesets:
  - test-ruleset
`
    fs.writeFileSync(configFile, config)

    const result = await runCliInteractive({
      args: ['--dangerously-allow-in-dirty-directory'],
      env: {
        CLAUDE_COMPOSER_CONFIG_DIR: path.join(tmpDir, '.claude-composer'),
        PWD: tmpDir,
      },
      cwd: tmpDir,
      interactions: [],
    })

    // Should not show warning since no acceptance rules are active
    expect(result.output).not.toContain('⚠️  AUTOMATIC ACCEPTANCE ENABLED ⚠️')
    expect(result.exitCode).toBe(0)
  })

  test('shows no warning when no rulesets are configured', async () => {
    const result = await runCliInteractive({
      args: ['--dangerously-allow-in-dirty-directory'],
      env: {
        CLAUDE_COMPOSER_CONFIG_DIR: path.join(tmpDir, '.claude-composer'),
        PWD: tmpDir,
      },
      cwd: tmpDir,
      interactions: [],
    })

    expect(result.output).not.toContain('⚠️  AUTOMATIC ACCEPTANCE ENABLED ⚠️')
    expect(result.output).not.toContain(
      'Do you want to continue with automatic acceptance enabled?',
    )
  })
})
