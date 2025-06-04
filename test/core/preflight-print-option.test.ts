import { describe, it, expect, beforeEach, vi } from 'vitest'
import { runPreflight } from '../../src/core/preflight'
import * as fs from 'fs'

vi.mock('fs')
vi.mock('../../src/config/loader')
vi.mock('../../src/utils/logging')

describe('Preflight - Print Option', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fs.existsSync).mockReturnValue(false)
  })

  it('should set hasPrintOption to true when --print is present', async () => {
    const argv = ['node', 'script.js', '--print', 'some text']
    const result = await runPreflight(argv)

    expect(result.hasPrintOption).toBe(true)
    expect(result.knownOptions.has('print')).toBe(false)
  })

  it('should set hasPrintOption to false when --print is not present', async () => {
    const argv = ['node', 'script.js', 'some text']
    const result = await runPreflight(argv)

    expect(result.hasPrintOption).toBe(false)
  })

  it('should handle --print with equals syntax', async () => {
    const argv = ['node', 'script.js', '--print=some text']
    const result = await runPreflight(argv)

    expect(result.hasPrintOption).toBe(true)
    expect(result.knownOptions.has('print')).toBe(false)
  })

  it('should detect --print among other options', async () => {
    const argv = [
      'node',
      'script.js',
      '--verbose',
      '--print',
      'text',
      '--model',
      'claude-3',
    ]
    const result = await runPreflight(argv)

    expect(result.hasPrintOption).toBe(true)
    expect(result.knownOptions.has('print')).toBe(false)
  })

  it('should handle empty --print option', async () => {
    const argv = ['node', 'script.js', '--print']
    const result = await runPreflight(argv)

    expect(result.hasPrintOption).toBe(true)
    expect(result.shouldExit).toBe(true)
    expect(result.exitCode).toBe(0)
  })
})
