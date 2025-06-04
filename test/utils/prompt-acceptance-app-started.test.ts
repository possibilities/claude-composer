import { describe, it, expect } from 'vitest'
import { shouldAcceptPrompt } from '../../src/utils/prompt-acceptance'
import type { RulesetConfig } from '../../src/config/schemas'
import type { MatchResult } from '../../src/patterns/matcher'

describe('Prompt Acceptance - App Started', () => {
  const emptyRuleset: RulesetConfig = {
    acceptances: {},
  }

  const createAppStartedMatch = (
    overrides?: Partial<MatchResult>,
  ): MatchResult => ({
    patternId: 'app-started',
    patternTitle: 'App started',
    type: 'confirmation',
    response: ['test response'],
    matchedText: '? for shortcuts',
    fullMatchedContent: '? for shortcuts',
    firstLineNumber: 1,
    lastLineNumber: 1,
    bufferContent: '? for shortcuts',
    strippedBufferContent: '? for shortcuts',
    ...overrides,
  })

  it('should auto-accept app-started prompts', () => {
    const match = createAppStartedMatch()
    const result = shouldAcceptPrompt(match, undefined, emptyRuleset)
    expect(result).toBe(true)
  })

  it('should auto-accept app-started even with restrictive ruleset', () => {
    const restrictiveRuleset: RulesetConfig = {
      acceptances: {
        promptDomainDenyList: ['*'],
        bashCommandPaths: [],
        fetchContentDomains: [],
      },
    }

    const match = createAppStartedMatch()
    const result = shouldAcceptPrompt(match, undefined, restrictiveRuleset)
    expect(result).toBe(true)
  })

  it('should auto-accept app-started regardless of extracted data', () => {
    const match = createAppStartedMatch({
      extractedData: { body: 'some data', domain: 'example.com' },
    })
    const result = shouldAcceptPrompt(match, undefined, emptyRuleset)
    expect(result).toBe(true)
  })
})
