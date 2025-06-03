import { expect, test, describe, beforeEach } from 'vitest'
import { runCliInteractive } from '../utils/test-utils'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

describe('Dangerous flags warnings', () => {
  let tmpDir: string
  let configFile: string

  beforeEach(() => {
    // Create a temporary directory for the test
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-composer-test-'))
    const configDir = path.join(tmpDir, '.claude-composer')
    fs.mkdirSync(configDir, { recursive: true })
    configFile = path.join(configDir, 'config.yaml')

    // Create empty git directory to avoid version control prompt
    const gitDir = path.join(tmpDir, '.git')
    fs.mkdirSync(gitDir, { recursive: true })
  })

  test('shows warning for --dangerously-dismiss-edit-file-prompts', async () => {
    const result = await runCliInteractive({
      args: [
        '--dangerously-dismiss-edit-file-prompts',
        '--dangerously-allow-in-dirty-directory',
      ],
      env: {
        CLAUDE_COMPOSER_CONFIG_DIR: path.join(tmpDir, '.claude-composer'),
        PWD: tmpDir,
      },
      cwd: tmpDir,
      interactions: [
        {
          waitFor: 'Do you want to continue with these dangerous settings?',
          respond: 'y\n',
        },
      ],
    })

    expect(result.output).toContain('⚠️  DANGER FLAGS SET ⚠️')
    expect(result.output).toContain(
      '(Skipping interactive prompt in test mode)',
    )
    expect(result.output).toContain(
      '⚠️  WARNING: --dangerously-dismiss-edit-file-prompts is enabled',
    )
    expect(result.output).toContain(
      'All file edit prompts will be automatically dismissed!',
    )
  })

  test('shows warning for --dangerously-dismiss-create-file-prompts', async () => {
    const result = await runCliInteractive({
      args: [
        '--dangerously-dismiss-create-file-prompts',
        '--dangerously-allow-in-dirty-directory',
      ],
      env: {
        CLAUDE_COMPOSER_CONFIG_DIR: path.join(tmpDir, '.claude-composer'),
        PWD: tmpDir,
      },
      cwd: tmpDir,
      interactions: [
        {
          waitFor: 'Do you want to continue with these dangerous settings?',
          respond: 'y\n',
        },
      ],
    })

    expect(result.output).toContain('⚠️  DANGER FLAGS SET ⚠️')
    expect(result.output).toContain(
      '(Skipping interactive prompt in test mode)',
    )
    expect(result.output).toContain(
      '⚠️  WARNING: --dangerously-dismiss-create-file-prompts is enabled',
    )
    expect(result.output).toContain(
      'All file creation prompts will be automatically dismissed!',
    )
  })

  test('shows warning for --dangerously-dismiss-bash-command-prompts', async () => {
    const result = await runCliInteractive({
      args: [
        '--dangerously-dismiss-bash-command-prompts',
        '--dangerously-allow-in-dirty-directory',
      ],
      env: {
        CLAUDE_COMPOSER_CONFIG_DIR: path.join(tmpDir, '.claude-composer'),
        PWD: tmpDir,
      },
      cwd: tmpDir,
      interactions: [
        {
          waitFor: 'Do you want to continue with these dangerous settings?',
          respond: 'y\n',
        },
      ],
    })

    expect(result.output).toContain('⚠️  DANGER FLAGS SET ⚠️')
    expect(result.output).toContain(
      '(Skipping interactive prompt in test mode)',
    )
    expect(result.output).toContain(
      '⚠️  WARNING: --dangerously-dismiss-bash-command-prompts is enabled',
    )
    expect(result.output).toContain(
      'All bash command prompts will be automatically dismissed!',
    )
  })

  test('shows all warnings when multiple dangerous flags are set', async () => {
    const result = await runCliInteractive({
      args: [
        '--dangerously-dismiss-edit-file-prompts',
        '--dangerously-dismiss-create-file-prompts',
        '--dangerously-dismiss-bash-command-prompts',
        '--dangerously-allow-in-dirty-directory',
      ],
      env: {
        CLAUDE_COMPOSER_CONFIG_DIR: path.join(tmpDir, '.claude-composer'),
        PWD: tmpDir,
      },
      cwd: tmpDir,
      interactions: [
        {
          waitFor: 'Do you want to continue with these dangerous settings?',
          respond: 'y\n',
        },
      ],
    })

    expect(result.output).toContain('⚠️  DANGER FLAGS SET ⚠️')
    expect(result.output).toContain(
      '(Skipping interactive prompt in test mode)',
    )
    expect(result.output).toContain(
      '⚠️  WARNING: --dangerously-dismiss-edit-file-prompts is enabled',
    )
    expect(result.output).toContain(
      'All file edit prompts will be automatically dismissed!',
    )
    expect(result.output).toContain(
      '⚠️  WARNING: --dangerously-dismiss-create-file-prompts is enabled',
    )
    expect(result.output).toContain(
      'All file creation prompts will be automatically dismissed!',
    )
    expect(result.output).toContain(
      '⚠️  WARNING: --dangerously-dismiss-bash-command-prompts is enabled',
    )
    expect(result.output).toContain(
      'All bash command prompts will be automatically dismissed!',
    )
  })

  test('shows warnings when dangerous flags are set via config file', async () => {
    // Write config file with dangerous flags
    const config = `dangerously_dismiss_edit_file_prompts: true
dangerously_dismiss_create_file_prompts: true
dangerously_dismiss_bash_command_prompts: true
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
          waitFor: 'Do you want to continue with these dangerous settings?',
          respond: 'y\n',
        },
      ],
    })

    expect(result.output).toContain('⚠️  DANGER FLAGS SET ⚠️')
    expect(result.output).toContain(
      '(Skipping interactive prompt in test mode)',
    )
    expect(result.output).toContain(
      '⚠️  WARNING: --dangerously-dismiss-edit-file-prompts is enabled',
    )
    expect(result.output).toContain(
      'All file edit prompts will be automatically dismissed!',
    )
    expect(result.output).toContain(
      '⚠️  WARNING: --dangerously-dismiss-create-file-prompts is enabled',
    )
    expect(result.output).toContain(
      'All file creation prompts will be automatically dismissed!',
    )
    expect(result.output).toContain(
      '⚠️  WARNING: --dangerously-dismiss-bash-command-prompts is enabled',
    )
    expect(result.output).toContain(
      'All bash command prompts will be automatically dismissed!',
    )
  })

  test('skips interactive prompt in test mode and continues', async () => {
    const result = await runCliInteractive({
      args: [
        '--dangerously-dismiss-edit-file-prompts',
        '--dangerously-allow-in-dirty-directory',
      ],
      env: {
        CLAUDE_COMPOSER_CONFIG_DIR: path.join(tmpDir, '.claude-composer'),
        PWD: tmpDir,
      },
      cwd: tmpDir,
      interactions: [],
    })

    expect(result.output).toContain('⚠️  DANGER FLAGS SET ⚠️')
    expect(result.output).toContain(
      '(Skipping interactive prompt in test mode)',
    )
    expect(result.output).toContain(
      '⚠️  WARNING: --dangerously-dismiss-edit-file-prompts is enabled',
    )
    expect(result.exitCode).toBe(0)
  })
})
