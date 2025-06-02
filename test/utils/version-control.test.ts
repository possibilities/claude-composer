import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { runCli, runCliInteractive } from './test-utils'

describe('Version Control Check', () => {
  let testDir: string

  beforeEach(() => {
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-composer-test-'))
  })

  afterEach(() => {
    fs.rmSync(testDir, { recursive: true, force: true })
  })

  it('should exit when no git directory exists and user responds no', async () => {
    const result = await runCliInteractive({
      cwd: testDir,
      interactions: [
        {
          waitFor: '※ Do you want to continue? (y/N):',
          respond: 'n\n',
        },
      ],
    })

    expect(result.exitCode).toBe(1)
    expect(result.output).toContain(
      'Running in project without version control',
    )
    expect(result.output).toContain('Exiting: Version control is required')
  })

  it('should continue when no git directory exists and user responds yes', async () => {
    const result = await runCliInteractive({
      cwd: testDir,
      interactions: [
        {
          waitFor: '※ Do you want to continue? (y/N):',
          respond: 'y\n',
        },
      ],
    })

    expect(result.exitCode).toBe(0)
    expect(result.output).toContain(
      'Running in project without version control',
    )
    expect(result.output).toContain(
      '※ Dangerously running in project without version control',
    )
    expect(result.output).toContain(
      '※ Ready, Passing off control to Claude CLI',
    )
  })

  it('should skip prompt when --dangerously-allow-without-version-control flag is used', async () => {
    const result = await runCli({
      args: ['--dangerously-allow-without-version-control'],
      cwd: testDir,
    })

    expect(result.exitCode).toBe(0)
    expect(result.output).not.toContain('※ Do you want to continue?')
    expect(result.output).toContain(
      '※ Dangerously running in project without version control',
    )
    expect(result.output).toContain(
      '※ Ready, Passing off control to Claude CLI',
    )
  })

  it('should proceed normally when git directory exists', async () => {
    fs.mkdirSync(path.join(testDir, '.git'))

    const result = await runCli({
      cwd: testDir,
    })

    expect(result.exitCode).toBe(0)
    expect(result.output).not.toContain(
      'Running in project without version control',
    )
    expect(result.output).not.toContain(
      'Dangerously running in project without version control',
    )
    expect(result.output).toContain(
      '※ Ready, Passing off control to Claude CLI',
    )
  })

  it('should skip prompt when dangerously_allow_without_version_control is set in config', async () => {
    const testConfigDir = path.join(testDir, 'test-config')
    const configPath = path.join(testConfigDir, 'config.yaml')

    if (!fs.existsSync(testConfigDir)) {
      fs.mkdirSync(testConfigDir, { recursive: true })
    }
    fs.writeFileSync(
      configPath,
      'dangerously_allow_without_version_control: true\n',
    )

    const result = await runCli({
      cwd: testDir,
      env: {
        CLAUDE_COMPOSER_CONFIG_DIR: testConfigDir,
      },
    })

    expect(result.exitCode).toBe(0)
    expect(result.output).not.toContain('※ Do you want to continue?')
    expect(result.output).toContain(
      '※ Dangerously running in project without version control',
    )
    expect(result.output).toContain(
      '※ Ready, Passing off control to Claude CLI',
    )
  })
})
