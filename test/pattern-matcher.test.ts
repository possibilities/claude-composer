import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  CircularBuffer,
  PatternMatcher,
  type PatternConfig,
} from '../pattern-matcher'

describe('CircularBuffer', () => {
  let buffer: CircularBuffer

  beforeEach(() => {
    buffer = new CircularBuffer(10)
  })

  it('should append data to buffer', () => {
    buffer.append('hello')
    expect(buffer.getContent()).toBe('hello')
  })

  it('should maintain max size by removing oldest data', () => {
    buffer.append('1234567890')
    buffer.append('abc')
    expect(buffer.getContent()).toBe('4567890abc')
  })

  it('should clear buffer', () => {
    buffer.append('test data')
    buffer.clear()
    expect(buffer.getContent()).toBe('')
  })

  it('should handle empty data', () => {
    buffer.append('')
    expect(buffer.getContent()).toBe('')
  })
})

describe('PatternMatcher', () => {
  let matcher: PatternMatcher

  beforeEach(() => {
    matcher = new PatternMatcher(100)
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Pattern Management', () => {
    it('should add pattern', () => {
      const config: PatternConfig = {
        id: 'test1',
        pattern: 'hello',
        action: { type: 'input', response: 'world' },
      }
      matcher.addPattern(config)
      const matches = matcher.processData('hello')
      expect(matches).toHaveLength(1)
      expect(matches[0].action.type).toBe('input')
      expect((matches[0].action as any).response).toBe('world')
    })

    it('should remove pattern', () => {
      const config: PatternConfig = {
        id: 'test1',
        pattern: 'hello',
        action: { type: 'input', response: 'world' },
      }
      matcher.addPattern(config)
      matcher.removePattern('test1')
      const matches = matcher.processData('hello')
      expect(matches).toHaveLength(0)
    })
  })

  describe('Pattern Matching', () => {
    it('should match simple string pattern', () => {
      const config: PatternConfig = {
        id: 'test1',
        pattern: 'error',
        action: { type: 'input', response: 'Error detected!' },
      }
      matcher.addPattern(config)
      const matches = matcher.processData('An error occurred')
      expect(matches).toHaveLength(1)
      expect(matches[0].patternId).toBe('test1')
      expect(matches[0].action.type).toBe('input')
      expect((matches[0].action as any).response).toBe('Error detected!')
      expect(matches[0].matchedText).toBe('error')
    })

    it('should match regex pattern', () => {
      const config: PatternConfig = {
        id: 'test1',
        pattern: /\d{3}-\d{3}-\d{4}/,
        action: { type: 'input', response: 'Phone number found' },
      }
      matcher.addPattern(config)
      const matches = matcher.processData('Call me at 123-456-7890')
      expect(matches).toHaveLength(1)
      expect((matches[0].action as any).response).toBe('Phone number found')
      expect(matches[0].matchedText).toBe('123-456-7890')
    })

    it('should handle case-insensitive matching', () => {
      const config: PatternConfig = {
        id: 'test1',
        pattern: 'ERROR',
        action: { type: 'input', response: 'Found error' },
        caseSensitive: false,
      }
      matcher.addPattern(config)
      const matches = matcher.processData('error in system')
      expect(matches).toHaveLength(1)
    })

    it('should handle case-sensitive matching', () => {
      const config: PatternConfig = {
        id: 'test1',
        pattern: 'ERROR',
        action: { type: 'input', response: 'Found error' },
        caseSensitive: true,
      }
      matcher.addPattern(config)
      const matches = matcher.processData('error in system')
      expect(matches).toHaveLength(0)
    })

    it('should handle multiline pattern', () => {
      const config: PatternConfig = {
        id: 'test1',
        pattern: /^ERROR/m,
        action: { type: 'input', response: 'Line starts with ERROR' },
        multiline: true,
      }
      matcher.addPattern(config)
      const matches = matcher.processData('Some text\nERROR: failed')
      expect(matches).toHaveLength(1)
    })

    it('should escape special regex characters in string patterns', () => {
      const config: PatternConfig = {
        id: 'test1',
        pattern: 'What?',
        action: { type: 'input', response: 'Question found' },
      }
      matcher.addPattern(config)
      const matches = matcher.processData('What? is happening')
      expect(matches).toHaveLength(1)
    })

    it('should return multiple matches for multiple patterns', () => {
      matcher.addPattern({
        id: 'test1',
        pattern: 'error',
        action: { type: 'input', response: 'Error found' },
      })
      matcher.addPattern({
        id: 'test2',
        pattern: 'warning',
        action: { type: 'input', response: 'Warning found' },
      })
      const matches = matcher.processData('error and warning')
      expect(matches).toHaveLength(2)
      expect(matches.map(m => (m.action as any).response)).toContain(
        'Error found',
      )
      expect(matches.map(m => (m.action as any).response)).toContain(
        'Warning found',
      )
    })

    it('should handle array responses', () => {
      const config: PatternConfig = {
        id: 'test1',
        pattern: 'help',
        action: { type: 'input', response: ['Sure!', 'How can I help?'] },
      }
      matcher.addPattern(config)
      const matches = matcher.processData('I need help')
      expect(matches).toHaveLength(1)
      expect((matches[0].action as any).response).toEqual([
        'Sure!',
        'How can I help?',
      ])
    })

    it('should handle log action type', () => {
      const config: PatternConfig = {
        id: 'test1',
        pattern: 'ERROR',
        action: { type: 'log', logFile: '/tmp/test.log' },
      }
      matcher.addPattern(config)
      const matches = matcher.processData('ERROR: something went wrong')
      expect(matches).toHaveLength(1)
      expect(matches[0].action.type).toBe('log')
      expect((matches[0].action as any).logFile).toBe('/tmp/test.log')
      expect(matches[0].matchedText).toBe('ERROR')
      expect(matches[0].bufferContent).toContain('ERROR: something went wrong')
    })
  })

  describe('Cooldown Behavior', () => {
    it('should respect cooldown period', () => {
      const config: PatternConfig = {
        id: 'test1',
        pattern: 'trigger',
        action: { type: 'input', response: 'Response' },
        cooldown: 5000,
      }
      matcher.addPattern(config)

      const matches1 = matcher.processData('trigger')
      expect(matches1).toHaveLength(1)

      vi.advanceTimersByTime(3000)
      const matches2 = matcher.processData('trigger')
      expect(matches2).toHaveLength(0)

      vi.advanceTimersByTime(2001)
      const matches3 = matcher.processData('trigger')
      expect(matches3).toHaveLength(1)
    })

    it('should use default cooldown of 1000ms when not specified', () => {
      const config: PatternConfig = {
        id: 'test1',
        pattern: 'trigger',
        action: { type: 'input', response: 'Response' },
      }
      matcher.addPattern(config)

      const matches1 = matcher.processData('trigger')
      expect(matches1).toHaveLength(1)

      vi.advanceTimersByTime(999)
      const matches2 = matcher.processData('trigger')
      expect(matches2).toHaveLength(0)

      vi.advanceTimersByTime(2)
      const matches3 = matcher.processData('trigger')
      expect(matches3).toHaveLength(1)
    })

    it('should track cooldowns separately for different patterns', () => {
      matcher.addPattern({
        id: 'test1',
        pattern: 'pattern1',
        action: { type: 'input', response: 'Response1' },
        cooldown: 2000,
      })
      matcher.addPattern({
        id: 'test2',
        pattern: 'pattern2',
        action: { type: 'input', response: 'Response2' },
        cooldown: 3000,
      })

      const matches1 = matcher.processData('pattern1 pattern2')
      expect(matches1).toHaveLength(2)

      vi.advanceTimersByTime(2500)
      const matches2 = matcher.processData('pattern1 pattern2')
      expect(matches2).toHaveLength(1)
      expect(matches2[0].patternId).toBe('test1')
    })
  })

  describe('Buffer Behavior', () => {
    it('should match patterns across multiple data chunks', () => {
      const config: PatternConfig = {
        id: 'test1',
        pattern: 'complete message',
        action: { type: 'input', response: 'Found it!' },
      }
      matcher.addPattern(config)

      matcher.processData('This is a comp')
      const matches = matcher.processData('lete message')
      expect(matches).toHaveLength(1)
      expect((matches[0].action as any).response).toBe('Found it!')
    })

    it('should respect buffer size limit', () => {
      const smallMatcher = new PatternMatcher(10)
      const config: PatternConfig = {
        id: 'test1',
        pattern: 'old',
        action: { type: 'input', response: 'Found old' },
      }
      smallMatcher.addPattern(config)

      smallMatcher.processData('old data here')
      const matches = smallMatcher.processData(' new stuff')
      expect(matches).toHaveLength(0)
    })
  })
})
