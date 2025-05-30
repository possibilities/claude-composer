import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { execSync } from 'child_process'
import { runCli } from './test-utils'

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
    const result = await runCli({ cwd: testDir })
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

    const result = await runCli({
      args: ['--dangerously-allow-in-dirty-directory'],
      cwd: testDir,
    })
    expect([0, 143]).toContain(result.exitCode)
    expect(result.output).not.toContain('Do you want to continue?')
    expect(result.output).toContain(
      '※ Dangerously running in directory with uncommitted changes',
    )
    expect(result.output).toContain(
      '※ Ready, Passing off control to Claude CLI',
    )
  })
})
