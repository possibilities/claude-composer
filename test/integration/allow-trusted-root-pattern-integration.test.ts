import { describe, it, expect, beforeEach, vi } from 'vitest'
import { PatternMatcher } from '../../src/patterns/matcher'
import { createTrustPromptPattern } from '../../src/patterns/registry'
import { type AppConfig } from '../../src/config/schemas'

vi.mock('../../src/utils/notifications', () => ({
  showNotification: vi.fn(),
}))

describe('Allow Trusted Root Pattern Integration', () => {
  let patternMatcher: PatternMatcher
  let mockAppConfig: AppConfig
  let allowTrustedRootPattern: ReturnType<typeof createTrustPromptPattern>

  beforeEach(() => {
    vi.clearAllMocks()
    mockAppConfig = {
      roots: ['~/test-root'],
    }
    allowTrustedRootPattern = createTrustPromptPattern(() => mockAppConfig)
    patternMatcher = new PatternMatcher()
    patternMatcher.addPattern(allowTrustedRootPattern)
  })

  it('should match allow trusted root dialog', () => {
    const terminalOutput = `
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Do you trust the files in this folder?               ┃
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
    expect(matches[0].patternId).toBe('allow-trusted-root')
    expect(matches[0].patternTitle).toBe('Allow trusted root')
  })

  it('should return response from checkIfPwdParentInRoots function', () => {
    const terminalOutput = 'Do you trust the files in this folder?'

    const originalResponse = allowTrustedRootPattern.response
    allowTrustedRootPattern.response = () => ['1']

    const matches = patternMatcher.processData(terminalOutput)

    expect(matches).toHaveLength(1)
    expect(matches[0].response).toEqual(['1'])

    allowTrustedRootPattern.response = originalResponse
  })

  it('should match only confirmation type patterns', () => {
    const terminalOutput = 'Do you trust the files in this folder?'

    const matches = patternMatcher.processDataByType(
      terminalOutput,
      'confirmation',
    )

    expect(matches).toHaveLength(1)
    expect(matches[0].patternId).toBe('allow-trusted-root')
  })

  it('should not match partial text', () => {
    const terminalOutput = 'Do you trust the files'

    const matches = patternMatcher.processData(terminalOutput)

    expect(matches).toHaveLength(0)
  })

  it('should match with surrounding text', () => {
    const terminalOutput = `
Some other output
┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Do you trust the files in this folder?               ┃
┃ Do you trust the files in this folder?               ┃
┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛
More output
`

    const matches = patternMatcher.processData(terminalOutput)

    expect(matches).toHaveLength(1)
    expect(matches[0].patternId).toBe('allow-trusted-root')
  })
})
