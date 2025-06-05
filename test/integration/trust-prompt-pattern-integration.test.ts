import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PatternMatcher } from '../../src/patterns/matcher'
import { trustPromptPattern } from '../../src/patterns/registry'

// Mock the notifications module
vi.mock('../../src/utils/notifications', () => ({
  showNotification: vi.fn(),
}))

// Mock the index module
vi.mock('../../src/index', () => ({
  appConfig: {
    roots: ['~/test-root'],
  },
}))

describe('Trust Prompt Pattern Integration', () => {
  let patternMatcher: PatternMatcher

  beforeEach(() => {
    vi.clearAllMocks()
    patternMatcher = new PatternMatcher()
    patternMatcher.addPattern(trustPromptPattern)
  })

  it('should match trust prompt dialog', () => {
    const terminalOutput = `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Claude Code may read files in this folder            ┃
┃                                                       ┃
┃ Do you trust the files in this folder?               ┃
┃                                                       ┃
┃ 1. Yes                                                ┃
┃ 2. Yes, and remember this decision                    ┃
┃ 3. No                                                 ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
`

    const matches = patternMatcher.processData(terminalOutput)

    expect(matches).toHaveLength(1)
    expect(matches[0].patternId).toBe('trust-folder-prompt')
    expect(matches[0].patternTitle).toBe('Trust folder')
    expect(matches[0].type).toBe('confirmation')
  })

  it('should return response from checkIfPwdParentInRoots function', () => {
    const terminalOutput = 'Claude Code may read files in this folder'

    // Mock the response function to return a specific value
    const originalResponse = trustPromptPattern.response
    trustPromptPattern.response = () => ['1']

    const matches = patternMatcher.processData(terminalOutput)

    expect(matches).toHaveLength(1)
    expect(matches[0].response).toEqual(['1'])

    // Restore original response
    trustPromptPattern.response = originalResponse
  })

  it('should match only confirmation type patterns', () => {
    const terminalOutput = 'Claude Code may read files in this folder'

    const matches = patternMatcher.processDataByType(
      terminalOutput,
      'confirmation',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0].patternId).toBe('trust-folder-prompt')
  })

  it('should not match partial text', () => {
    const terminalOutput = 'Claude Code may read files'

    const matches = patternMatcher.processData(terminalOutput)

    expect(matches).toHaveLength(0)
  })

  it('should match with surrounding text', () => {
    const terminalOutput = `
Some other output
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Claude Code may read files in this folder            ┃
┃ Do you trust the files in this folder?               ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
More output
`

    const matches = patternMatcher.processData(terminalOutput)

    expect(matches).toHaveLength(1)
    expect(matches[0].patternId).toBe('trust-folder-prompt')
  })
})
