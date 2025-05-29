import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import {
  CircularBuffer,
  PatternMatcher,
  type PatternConfig,
} from '../pattern-matcher'
import { readFileSync, unlinkSync, existsSync } from 'fs'

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
        action: { type: 'log', path: '/tmp/test.log' },
      }
      matcher.addPattern(config)
      const matches = matcher.processData('ERROR: something went wrong')
      expect(matches).toHaveLength(1)
      expect(matches[0].action.type).toBe('log')
      expect((matches[0].action as any).path).toBe('/tmp/test.log')
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

  describe('ANSI Code Handling', () => {
    it('should strip ANSI codes before matching patterns', () => {
      const matcher = new PatternMatcher()
      matcher.addPattern({
        id: 'test-ansi',
        pattern: 'Edit file',
        action: { type: 'input', response: 'yes' },
      })

      // Text with ANSI color codes (red)
      const matches = matcher.processData('\x1b[31mEdit file\x1b[0m')

      expect(matches).toHaveLength(1)
      expect(matches[0].patternId).toBe('test-ansi')
      expect(matches[0].matchedText).toBe('Edit file')
      // bufferContent should still contain the original ANSI codes
      expect(matches[0].bufferContent).toContain('\x1b[31m')
    })

    it('should match patterns with complex ANSI sequences', () => {
      const matcher = new PatternMatcher()
      matcher.addPattern({
        id: 'bash-pattern',
        pattern: 'Bash',
        action: { type: 'log', path: '/tmp/test.log' },
      })

      // Text with multiple ANSI codes (bold, underline, color)
      const matches = matcher.processData(
        '\x1b[1m\x1b[4m\x1b[32mBash\x1b[0m\x1b[0m\x1b[0m command',
      )

      expect(matches).toHaveLength(1)
      expect(matches[0].patternId).toBe('bash-pattern')
      expect(matches[0].matchedText).toBe('Bash')
    })
  })

  describe('Sequence Pattern Matching', () => {
    it('should match basic sequence pattern', () => {
      const config: PatternConfig = {
        id: 'seq1',
        pattern: ['First line', 'Second line', 'Third line'],
        action: { type: 'input', response: 'Sequence found!' },
      }
      matcher.addPattern(config)

      const matches = matcher.processData('First line\nSecond line\nThird line')
      expect(matches).toHaveLength(1)
      expect(matches[0].patternId).toBe('seq1')
      expect((matches[0].action as any).response).toBe('Sequence found!')
      expect(matches[0].matchedText).toBe('First line\nSecond line\nThird line')
    })

    it('should match sequence with lines in between', () => {
      const config: PatternConfig = {
        id: 'seq1',
        pattern: ['Start', 'Middle', 'End'],
        action: { type: 'input', response: 'Found it' },
      }
      matcher.addPattern(config)

      const matches = matcher.processData(
        'Start\nSome other text\nMiddle\nMore text\nEnd',
      )
      expect(matches).toHaveLength(1)
      expect(matches[0].matchedText).toBe(
        'Start\nSome other text\nMiddle\nMore text\nEnd',
      )
    })

    it('should not match incomplete sequence', () => {
      const config: PatternConfig = {
        id: 'seq1',
        pattern: ['First', 'Second', 'Third'],
        action: { type: 'input', response: 'Complete' },
      }
      matcher.addPattern(config)

      const matches = matcher.processData('First\nSecond\nFourth')
      expect(matches).toHaveLength(0)
    })

    it('should not match sequence in wrong order', () => {
      const config: PatternConfig = {
        id: 'seq1',
        pattern: ['A', 'B', 'C'],
        action: { type: 'input', response: 'ABC' },
      }
      matcher.addPattern(config)

      const matches = matcher.processData('B\nA\nC')
      expect(matches).toHaveLength(0)
    })

    it('should match sequence case-insensitively when configured', () => {
      const config: PatternConfig = {
        id: 'seq1',
        pattern: ['HELLO', 'WORLD'],
        action: { type: 'input', response: 'Hi!' },
        caseSensitive: false,
      }
      matcher.addPattern(config)

      const matches = matcher.processData('hello there\nworld')
      expect(matches).toHaveLength(1)
    })

    it('should not match sequence case-insensitively when case sensitive', () => {
      const config: PatternConfig = {
        id: 'seq1',
        pattern: ['HELLO', 'WORLD'],
        action: { type: 'input', response: 'Hi!' },
        caseSensitive: true,
      }
      matcher.addPattern(config)

      const matches = matcher.processData('hello\nworld')
      expect(matches).toHaveLength(0)
    })

    it('should match sequence with ANSI codes stripped', () => {
      const largeMatcher = new PatternMatcher(500) // Use larger buffer for this test
      const config: PatternConfig = {
        id: 'edit-prompt',
        pattern: ['Edit file', 'Do you want to make this edit', '❯ 1. Yes'],
        action: { type: 'input', response: '1' },
      }
      largeMatcher.addPattern(config)

      const matches = largeMatcher.processData(
        '\x1b[1m\x1b[38;2;153;204;255mEdit file\x1b[39m\x1b[22m\n' +
          'Some diff content\n' +
          'Do you want to make this edit to foo.txt?\n' +
          '\x1b[34m❯ \x1b[2m1.\x1b[22m Yes\x1b[39m',
      )

      expect(matches).toHaveLength(1)
      expect(matches[0].patternId).toBe('edit-prompt')
    })

    it('should match complex UI prompt sequence', () => {
      const largeMatcher = new PatternMatcher(2000) // Use larger buffer for complex UI
      const config: PatternConfig = {
        id: 'complex-prompt',
        pattern: [
          'Edit file',
          'Do you want to make this edit to',
          '❯ 1. Yes',
          "2. Yes, and don't ask again this session (shift+tab)",
          '3. No, and tell Claude what to do differently (esc)',
        ],
        action: { type: 'input', response: '1' },
      }
      largeMatcher.addPattern(config)

      // Create a properly formatted test with ANSI escape codes
      const buffer = [
        '\x1b[1mEdit file\x1b[0m',
        'Some diff content here',
        'foo.txt',
        '  1  old line',
        '  2  another line',
        'Do you want to make this edit to foo.txt?',
        '\x1b[34m❯ 1. Yes\x1b[0m',
        "  2. Yes, and don't ask again this session (shift+tab)",
        '  3. No, and tell Claude what to do differently (esc)',
        '',
      ].join('\n')

      const matches = largeMatcher.processData(buffer)
      expect(matches).toHaveLength(1)
      expect(matches[0].action.type).toBe('input')
      expect((matches[0].action as any).response).toBe('1')
    })

    it('should match sequence across multiple data chunks', () => {
      const config: PatternConfig = {
        id: 'seq1',
        pattern: ['Beginning', 'Middle part', 'The end'],
        action: { type: 'input', response: 'Complete sequence' },
      }
      matcher.addPattern(config)

      matcher.processData('Beginning of the story\n')
      matcher.processData('Some filler text\n')
      matcher.processData('Middle part is here\n')
      const matches = matcher.processData('More text\nThe end')

      expect(matches).toHaveLength(1)
      expect(matches[0].patternId).toBe('seq1')
    })

    it('should respect cooldown for sequence patterns', () => {
      const config: PatternConfig = {
        id: 'seq1',
        pattern: ['A', 'B'],
        action: { type: 'input', response: 'AB' },
        cooldown: 2000,
      }
      matcher.addPattern(config)

      const matches1 = matcher.processData('A\nB')
      expect(matches1).toHaveLength(1)

      vi.advanceTimersByTime(1000)
      const matches2 = matcher.processData('A\nB')
      expect(matches2).toHaveLength(0)

      vi.advanceTimersByTime(1001)
      const matches3 = matcher.processData('A\nB')
      expect(matches3).toHaveLength(1)
    })

    it('should handle empty sequence array', () => {
      const config: PatternConfig = {
        id: 'empty',
        pattern: [],
        action: { type: 'input', response: 'Empty' },
      }
      matcher.addPattern(config)

      const matches = matcher.processData('Any text')
      expect(matches).toHaveLength(0)
    })

    it('should match partial strings within lines', () => {
      const config: PatternConfig = {
        id: 'partial',
        pattern: ['file', 'edit', 'Yes'],
        action: { type: 'input', response: '1' },
      }
      matcher.addPattern(config)

      const matches = matcher.processData(
        'Edit file operation\n' +
          'Do you want to edit this?\n' +
          'Yes, proceed',
      )
      expect(matches).toHaveLength(1)
    })
  })
})
