import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { execSync } from 'child_process'

const CLI_PATH = path.join(process.cwd(), 'cli.ts')
const MOCK_APP_PATH = path.join(process.cwd(), 'test', 'mock-child-app.ts')

describe('Dirty Directory Check', () => {
  let testDir: string

  beforeEach(() => {
    // Create a temporary directory for testing
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-composer-test-'))

    // Initialize git repo
    execSync('git init', { cwd: testDir })
    execSync('git config user.email "test@example.com"', { cwd: testDir })
    execSync('git config user.name "Test User"', { cwd: testDir })
  })

  afterEach(async () => {
    // Give any running processes a moment to finish
    await new Promise(resolve => setTimeout(resolve, 50))

    // Clean up the temporary directory
    try {
      fs.rmSync(testDir, { recursive: true, force: true })
    } catch (error) {}
  })

  it('should proceed normally when git directory is clean', async () => {
    const result = await runCli([], testDir)
    expect([0, 143]).toContain(result.exitCode)
    expect(result.output).not.toContain(
      'Running in directory with uncommitted changes',
    )
    expect(result.output).toContain(
      '※ Ready, Passing off control to Claude CLI',
    )
  })

  it('should skip prompt when --dangerously-allow-in-dirty-directory flag is used', async () => {
    // Create a dirty file
    fs.writeFileSync(path.join(testDir, 'dirty.txt'), 'uncommitted changes')

    const result = await runCli(
      ['--dangerously-allow-in-dirty-directory'],
      testDir,
    )
    expect([0, 143]).toContain(result.exitCode)
    expect(result.output).not.toContain('Do you want to continue?')
    expect(result.output).toContain(
      'Dangerously running in directory with uncommitted changes',
    )
    expect(result.output).toContain(
      '※ Ready, Passing off control to Claude CLI',
    )
  })
})

function runCli(
  args: string[],
  cwd: string,
): Promise<{ output: string; exitCode: number }> {
  return new Promise(resolve => {
    const child = spawn('tsx', [CLI_PATH, ...args], {
      cwd,
      env: {
        ...process.env,
        CLAUDE_APP_PATH: MOCK_APP_PATH,
      },
    })

    let output = ''
    child.stderr.on('data', data => {
      output += data.toString()
    })

    child.stdout.on('data', data => {
      output += data.toString()
    })

    child.on('exit', code => {
      resolve({ output, exitCode: code || 0 })
    })

    setTimeout(() => {
      if (!child.killed) {
        child.kill()
      }
    }, 500)
  })
}
