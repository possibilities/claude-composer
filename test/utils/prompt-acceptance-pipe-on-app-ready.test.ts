import { describe, it, expect } from 'vitest'
import { shouldAcceptPrompt } from '../../src/utils/prompt-acceptance'
import type { RulesetConfig } from '../../src/config/schemas'
import type { MatchResult } from '../../src/patterns/matcher'

describe('Prompt Acceptance - Pipe on App Ready', () => {
  const emptyRuleset: RulesetConfig = {
    acceptances: {},
  }

  const createPipeOnAppReadyMatch = (
    overrides?: Partial<MatchResult>,
  ): MatchResult => ({
    patternId: 'pipe-on-app-ready',
    patternTitle: 'Pipe on app ready',
    response: ['test response'],
    matchedText: '? for shortcuts',
    fullMatchedContent: '? for shortcuts',
    firstLineNumber: 1,
    lastLineNumber: 1,
    bufferContent: '? for shortcuts',
    strippedBufferContent: '? for shortcuts',
    ...overrides,
  })

  it('should auto-accept pipe-on-app-ready prompts', () => {
    const match = createPipeOnAppReadyMatch()
    const result = shouldAcceptPrompt(match, undefined, emptyRuleset)
    expect(result).toBe(true)
  })

  it('should auto-accept pipe-on-app-ready even with restrictive ruleset', () => {
    const restrictiveRuleset: RulesetConfig = {
      acceptances: {
        promptDomainDenyList: ['*'],
        bashCommandPaths: [],
        fetchContentDomains: [],
      },
    }

    const match = createPipeOnAppReadyMatch()
    const result = shouldAcceptPrompt(match, undefined, restrictiveRuleset)
    expect(result).toBe(true)
  })

  it('should auto-accept pipe-on-app-ready regardless of extracted data', () => {
    const match = createPipeOnAppReadyMatch({
      extractedData: { body: 'some data', domain: 'example.com' },
    })
    const result = shouldAcceptPrompt(match, undefined, emptyRuleset)
    expect(result).toBe(true)
  })
})
