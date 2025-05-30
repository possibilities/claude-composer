import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { PatternMatcher, type PatternConfig } from '../pattern-matcher'
import { readFileSync, unlinkSync, existsSync } from 'fs'

describe('PatternMatcher', () => {
  let matcher: PatternMatcher

  beforeEach(() => {
    matcher = new PatternMatcher()
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Pattern Management', () => {
    it('should add pattern', () => {
      const config: PatternConfig = {
        id: 'test1',
        pattern: ['hello', 'world'],
        action: { type: 'input', response: 'matched' },
      }
      matcher.addPattern(config)
      const matches = matcher.processData('hello\nworld')
      expect(matches).toHaveLength(1)
      expect(matches[0].action.type).toBe('input')
      expect((matches[0].action as any).response).toBe('matched')
    })

    it('should remove pattern', () => {
      const config: PatternConfig = {
        id: 'test1',
        pattern: ['hello', 'world'],
        action: { type: 'input', response: 'matched' },
      }
      matcher.addPattern(config)
      matcher.removePattern('test1')
      const matches = matcher.processData('hello\nworld')
      expect(matches).toHaveLength(0)
    })
  })

  describe('Pattern Matching', () => {
    it('should return multiple matches for multiple patterns', () => {
      matcher.addPattern({
        id: 'test1',
        pattern: ['error', 'occurred'],
        action: { type: 'input', response: 'Error found' },
      })
      matcher.addPattern({
        id: 'test2',
        pattern: ['warning', 'issued'],
        action: { type: 'input', response: 'Warning found' },
      })
      const matches = matcher.processData('error\noccurred\nwarning\nissued')
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
        pattern: ['help', 'needed'],
        action: { type: 'input', response: ['Sure!', 'How can I help?'] },
      }
      matcher.addPattern(config)
      const matches = matcher.processData('I need help\nHelp needed')
      expect(matches).toHaveLength(1)
      expect((matches[0].action as any).response).toEqual([
        'Sure!',
        'How can I help?',
      ])
    })
  })

  describe('Direct Content Processing', () => {
    it('should match patterns in complete screen content', () => {
      const config: PatternConfig = {
        id: 'test1',
        pattern: ['complete', 'message'],
        action: { type: 'input', response: 'Found it!' },
      }
      matcher.addPattern(config)

      const matches = matcher.processData('This is a complete\nmessage')
      expect(matches).toHaveLength(1)
      expect((matches[0].action as any).response).toBe('Found it!')
    })

    it('should process each data call independently', () => {
      const config: PatternConfig = {
        id: 'test1',
        pattern: ['old', 'data'],
        action: { type: 'input', response: 'Found old' },
      }
      matcher.addPattern(config)

      // First call with complete content that matches
      const matches1 = matcher.processData('old line here\ndata is present')
      expect(matches1).toHaveLength(1)

      // Second call with different content should not affect previous state
      const matches2 = matcher.processData('new stuff')
      expect(matches2).toHaveLength(0)
    })
  })

  describe('ANSI Code Handling', () => {
    it('should strip ANSI codes before matching patterns', () => {
      const matcher = new PatternMatcher()
      matcher.addPattern({
        id: 'test-ansi',
        pattern: ['Edit', 'file'],
        action: { type: 'input', response: 'yes' },
      })

      const matches = matcher.processData(
        '\x1b[31mEdit\x1b[0m\n\x1b[32mfile\x1b[0m',
      )

      expect(matches).toHaveLength(1)
      expect(matches[0].patternId).toBe('test-ansi')
      expect(matches[0].matchedText).toBe('Edit\nfile')
      expect(matches[0].bufferContent).toContain('\x1b[31m')
    })

    it('should match patterns with complex ANSI sequences', () => {
      const matcher = new PatternMatcher()
      matcher.addPattern({
        id: 'bash-pattern',
        pattern: ['Bash', 'command'],
        action: { type: 'log', path: '/tmp/test.log' },
      })

      const matches = matcher.processData(
        '\x1b[1m\x1b[4m\x1b[32mBash\x1b[0m\x1b[0m\x1b[0m\ncommand',
      )

      expect(matches).toHaveLength(1)
      expect(matches[0].patternId).toBe('bash-pattern')
      expect(matches[0].matchedText).toBe('Bash\ncommand')
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

    it('should match sequence case-insensitively by default', () => {
      const config: PatternConfig = {
        id: 'seq1',
        pattern: ['HELLO', 'WORLD'],
        action: { type: 'input', response: 'Hi!' },
      }
      matcher.addPattern(config)

      const matches = matcher.processData('hello there\nworld')
      expect(matches).toHaveLength(1)
    })

    it('should match sequence with ANSI codes stripped', () => {
      const largeMatcher = new PatternMatcher()
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
      const largeMatcher = new PatternMatcher()
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

    it('should match complete sequence in single data input', () => {
      const config: PatternConfig = {
        id: 'seq1',
        pattern: ['Beginning', 'Middle part', 'The end'],
        action: { type: 'input', response: 'Complete sequence' },
      }
      matcher.addPattern(config)

      const fullContent =
        'Beginning of the story\nSome filler text\nMiddle part is here\nMore text\nThe end'
      const matches = matcher.processData(fullContent)

      expect(matches).toHaveLength(1)
      expect(matches[0].patternId).toBe('seq1')
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

    it('should optimize sequence matching by checking last line first', () => {
      // Create a fresh matcher for this test to avoid buffer contamination
      const testMatcher = new PatternMatcher()

      const config: PatternConfig = {
        id: 'optimized',
        pattern: ['Start of sequence', 'Middle part', 'Final line'],
        action: { type: 'input', response: 'Found' },
      }
      testMatcher.addPattern(config)

      const matches1 = testMatcher.processData(
        'Start of sequence\nMiddle part\nNot the final',
      )
      expect(matches1).toHaveLength(0)

      const matches2 = testMatcher.processData(
        'Start of sequence\nMiddle part\nFinal line',
      )
      expect(matches2).toHaveLength(1)
    })

    it('should handle very long sequences efficiently', () => {
      // Create a matcher with larger buffer for this test
      const largeMatcher = new PatternMatcher()

      // Create a long sequence pattern with unique lines
      const longSequence = Array.from(
        { length: 20 },
        (_, i) => `Unique pattern line number ${i + 1}`,
      )
      const config: PatternConfig = {
        id: 'long-seq',
        pattern: longSequence,
        action: { type: 'input', response: 'Long sequence found' },
      }
      largeMatcher.addPattern(config)

      // Build data without the last line - should not perform full match
      const incompleteData = longSequence.slice(0, -1).join('\n')
      const matches1 = largeMatcher.processData(incompleteData)
      expect(matches1).toHaveLength(0)

      // Add the last line - now it should match
      const completeData = longSequence.join('\n')
      const matches2 = largeMatcher.processData(completeData)
      expect(matches2).toHaveLength(1)
    })
  })
})
