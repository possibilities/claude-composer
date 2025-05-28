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
        response: 'world',
      }
      matcher.addPattern(config)
      const matches = matcher.processData('hello')
      expect(matches).toHaveLength(1)
      expect(matches[0].response).toBe('world')
    })

    it('should remove pattern', () => {
      const config: PatternConfig = {
        id: 'test1',
        pattern: 'hello',
        response: 'world',
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
        response: 'Error detected!',
      }
      matcher.addPattern(config)
      const matches = matcher.processData('An error occurred')
      expect(matches).toHaveLength(1)
      expect(matches[0]).toEqual({
        patternId: 'test1',
        response: 'Error detected!',
        delay: 0,
      })
    })

    it('should match regex pattern', () => {
      const config: PatternConfig = {
        id: 'test1',
        pattern: /\d{3}-\d{3}-\d{4}/,
        response: 'Phone number found',
      }
      matcher.addPattern(config)
      const matches = matcher.processData('Call me at 123-456-7890')
      expect(matches).toHaveLength(1)
      expect(matches[0].response).toBe('Phone number found')
    })

    it('should handle case-insensitive matching', () => {
      const config: PatternConfig = {
        id: 'test1',
        pattern: 'ERROR',
        response: 'Found error',
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
        response: 'Found error',
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
        response: 'Line starts with ERROR',
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
        response: 'Question found',
      }
      matcher.addPattern(config)
      const matches = matcher.processData('What? is happening')
      expect(matches).toHaveLength(1)
    })

    it('should return multiple matches for multiple patterns', () => {
      matcher.addPattern({
        id: 'test1',
        pattern: 'error',
        response: 'Error found',
      })
      matcher.addPattern({
        id: 'test2',
        pattern: 'warning',
        response: 'Warning found',
      })
      const matches = matcher.processData('error and warning')
      expect(matches).toHaveLength(2)
      expect(matches.map(m => m.response)).toContain('Error found')
      expect(matches.map(m => m.response)).toContain('Warning found')
    })

    it('should handle array responses', () => {
      const config: PatternConfig = {
        id: 'test1',
        pattern: 'help',
        response: ['Sure!', 'How can I help?'],
      }
      matcher.addPattern(config)
      const matches = matcher.processData('I need help')
      expect(matches).toHaveLength(1)
      expect(matches[0].response).toEqual(['Sure!', 'How can I help?'])
    })

    it('should include delay in match result', () => {
      const config: PatternConfig = {
        id: 'test1',
        pattern: 'wait',
        response: 'Waiting...',
        delay: 1000,
      }
      matcher.addPattern(config)
      const matches = matcher.processData('please wait')
      expect(matches).toHaveLength(1)
      expect(matches[0].delay).toBe(1000)
    })
  })

  describe('Cooldown Behavior', () => {
    it('should respect cooldown period', () => {
      const config: PatternConfig = {
        id: 'test1',
        pattern: 'trigger',
        response: 'Response',
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
        response: 'Response',
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
        response: 'Response1',
        cooldown: 2000,
      })
      matcher.addPattern({
        id: 'test2',
        pattern: 'pattern2',
        response: 'Response2',
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
        response: 'Found it!',
      }
      matcher.addPattern(config)

      matcher.processData('This is a comp')
      const matches = matcher.processData('lete message')
      expect(matches).toHaveLength(1)
      expect(matches[0].response).toBe('Found it!')
    })

    it('should respect buffer size limit', () => {
      const smallMatcher = new PatternMatcher(10)
      const config: PatternConfig = {
        id: 'test1',
        pattern: 'old',
        response: 'Found old',
      }
      smallMatcher.addPattern(config)

      smallMatcher.processData('old data here')
      const matches = smallMatcher.processData(' new stuff')
      expect(matches).toHaveLength(0)
    })
  })
})
