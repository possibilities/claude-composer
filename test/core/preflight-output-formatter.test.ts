import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { runPreflight } from '../../src/core/preflight'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

describe('Preflight - Output Formatter', () => {
  let tempDir: string
  let configPath: string
  let originalCwd: string

  beforeEach(() => {
    originalCwd = process.cwd()
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'preflight-outfmt-'))
    process.chdir(tempDir)
    fs.mkdirSync(path.join(tempDir, '.git'))
    configPath = path.join(tempDir, 'config.yaml')
  })

  afterEach(() => {
    process.chdir(originalCwd)
    fs.rmSync(tempDir, { recursive: true, force: true })
  })

  it('should use CLI output formatter over config', async () => {
    fs.writeFileSync(configPath, 'output_formatter: cat\n')
    const result = await runPreflight(
      ['node', 'claude-composer', '--output-formatter', 'jq'],
      { configPath },
    )
    expect(result.appConfig.output_formatter).toBe('jq')
  })

  it('should use config output formatter when no CLI flag', async () => {
    fs.writeFileSync(configPath, 'output_formatter: jq\n')
    const result = await runPreflight(['node', 'claude-composer'], {
      configPath,
    })
    expect(result.appConfig.output_formatter).toBe('jq')
  })

  it('should remove formatter with --no-output-formatter', async () => {
    fs.writeFileSync(configPath, 'output_formatter: jq\n')
    const result = await runPreflight(
      ['node', 'claude-composer', '--no-output-formatter'],
      { configPath },
    )
    expect(result.appConfig.output_formatter).toBeUndefined()
  })
})
