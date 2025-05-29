import { expect, test, describe, beforeEach } from 'vitest'
import { spawn } from 'child_process'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'

const CLI_PATH = path.join(__dirname, '..', 'cli.ts')

// Helper to capture output from spawned process
async function runCliWithArgs(args: string[], env: any): Promise<string> {
  return new Promise((resolve, reject) => {
    let output = ''
    const proc = spawn('tsx', [CLI_PATH, ...args], {
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    proc.stdout.on('data', data => {
      output += data.toString()
    })

    proc.stderr.on('data', data => {
      output += data.toString()
    })

    proc.on('close', code => {
      resolve(output)
    })

    proc.on('error', reject)

    // Give it a moment to show warnings then kill it
    setTimeout(() => {
      proc.kill()
    }, 2000)
  })
}

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
    const env = {
      ...process.env,
      CLAUDE_COMPOSER_CONFIG_DIR: path.join(tmpDir, '.claude-composer'),
      CLAUDE_APP_PATH: path.join(__dirname, 'mock-child-app.ts'),
      PWD: tmpDir,
    }

    const output = await runCliWithArgs(
      [
        '--dangerously-dismiss-edit-file-prompts',
        '--dangerously-allow-in-dirty-directory',
      ],
      env,
    )

    expect(output).toContain(
      '⚠️  WARNING: --dangerously-dismiss-edit-file-prompts is enabled',
    )
    expect(output).toContain(
      'All file edit prompts will be automatically dismissed!',
    )
  })

  test('shows warning for --dangerously-dismiss-create-file-prompts', async () => {
    const env = {
      ...process.env,
      CLAUDE_COMPOSER_CONFIG_DIR: path.join(tmpDir, '.claude-composer'),
      CLAUDE_APP_PATH: path.join(__dirname, 'mock-child-app.ts'),
      PWD: tmpDir,
    }

    const output = await runCliWithArgs(
      [
        '--dangerously-dismiss-create-file-prompts',
        '--dangerously-allow-in-dirty-directory',
      ],
      env,
    )

    expect(output).toContain(
      '⚠️  WARNING: --dangerously-dismiss-create-file-prompts is enabled',
    )
    expect(output).toContain(
      'All file creation prompts will be automatically dismissed!',
    )
  })

  test('shows warning for --dangerously-dismiss-bash-command-prompts', async () => {
    const env = {
      ...process.env,
      CLAUDE_COMPOSER_CONFIG_DIR: path.join(tmpDir, '.claude-composer'),
      CLAUDE_APP_PATH: path.join(__dirname, 'mock-child-app.ts'),
      PWD: tmpDir,
    }

    const output = await runCliWithArgs(
      [
        '--dangerously-dismiss-bash-command-prompts',
        '--dangerously-allow-in-dirty-directory',
      ],
      env,
    )

    expect(output).toContain(
      '⚠️  WARNING: --dangerously-dismiss-bash-command-prompts is enabled',
    )
    expect(output).toContain(
      'All bash command prompts will be automatically dismissed!',
    )
  })

  test('shows all warnings when multiple dangerous flags are set', async () => {
    const env = {
      ...process.env,
      CLAUDE_COMPOSER_CONFIG_DIR: path.join(tmpDir, '.claude-composer'),
      CLAUDE_APP_PATH: path.join(__dirname, 'mock-child-app.ts'),
      PWD: tmpDir,
    }

    const output = await runCliWithArgs(
      [
        '--dangerously-dismiss-edit-file-prompts',
        '--dangerously-dismiss-create-file-prompts',
        '--dangerously-dismiss-bash-command-prompts',
        '--dangerously-allow-in-dirty-directory',
      ],
      env,
    )

    expect(output).toContain(
      '⚠️  WARNING: --dangerously-dismiss-edit-file-prompts is enabled',
    )
    expect(output).toContain(
      'All file edit prompts will be automatically dismissed!',
    )
    expect(output).toContain(
      '⚠️  WARNING: --dangerously-dismiss-create-file-prompts is enabled',
    )
    expect(output).toContain(
      'All file creation prompts will be automatically dismissed!',
    )
    expect(output).toContain(
      '⚠️  WARNING: --dangerously-dismiss-bash-command-prompts is enabled',
    )
    expect(output).toContain(
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

    const env = {
      ...process.env,
      CLAUDE_COMPOSER_CONFIG_DIR: path.join(tmpDir, '.claude-composer'),
      CLAUDE_APP_PATH: path.join(__dirname, 'mock-child-app.ts'),
      PWD: tmpDir,
    }

    const output = await runCliWithArgs(
      ['--dangerously-allow-in-dirty-directory'],
      env,
    )

    expect(output).toContain(
      '⚠️  WARNING: --dangerously-dismiss-edit-file-prompts is enabled',
    )
    expect(output).toContain(
      'All file edit prompts will be automatically dismissed!',
    )
    expect(output).toContain(
      '⚠️  WARNING: --dangerously-dismiss-create-file-prompts is enabled',
    )
    expect(output).toContain(
      'All file creation prompts will be automatically dismissed!',
    )
    expect(output).toContain(
      '⚠️  WARNING: --dangerously-dismiss-bash-command-prompts is enabled',
    )
    expect(output).toContain(
      'All bash command prompts will be automatically dismissed!',
    )
  })
})
