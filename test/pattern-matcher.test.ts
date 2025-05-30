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
    it('should return only bottommost match when multiple patterns match', () => {
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
      expect(matches).toHaveLength(1)
      expect((matches[0].action as any).response).toBe('Warning found')
      expect(matches[0].lastLineNumber).toBe(3)
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
      expect(matches[0].firstLineNumber).toBe(0)
      expect(matches[0].lastLineNumber).toBe(1)
      expect(matches[0].fullMatchedContent).toBe('Edit\nfile')
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
      expect(matches[0].firstLineNumber).toBe(0)
      expect(matches[0].lastLineNumber).toBe(1)
      expect(matches[0].fullMatchedContent).toBe('Bash\ncommand')
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
      expect(matches[0].firstLineNumber).toBe(0)
      expect(matches[0].lastLineNumber).toBe(2)
      expect(matches[0].fullMatchedContent).toBe(
        'First line\nSecond line\nThird line',
      )
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

    it('should match sequence case-sensitively', () => {
      const config: PatternConfig = {
        id: 'seq1',
        pattern: ['hello', 'world'],
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

  describe('Deduplication and Bottommost Selection', () => {
    it('should prevent duplicate matches on same content', () => {
      const config: PatternConfig = {
        id: 'test-dup',
        pattern: ['hello', 'world'],
        action: { type: 'input', response: 'matched' },
      }
      matcher.addPattern(config)

      // First match should work
      const matches1 = matcher.processData('hello\nworld')
      expect(matches1).toHaveLength(1)
      expect(matches1[0].fullMatchedContent).toBe('hello\nworld')

      // Same content should not trigger again
      const matches2 = matcher.processData('hello\nworld')
      expect(matches2).toHaveLength(0)
    })

    it('should allow new matches when content changes', () => {
      const config: PatternConfig = {
        id: 'test-change',
        pattern: ['edit', 'file'],
        action: { type: 'input', response: '1' },
      }
      matcher.addPattern(config)

      // First match
      const matches1 = matcher.processData('edit\nfile foo.txt')
      expect(matches1).toHaveLength(1)
      expect(matches1[0].fullMatchedContent).toBe('edit\nfile foo.txt')

      // Different content should trigger new match
      const matches2 = matcher.processData('edit\nfile bar.txt')
      expect(matches2).toHaveLength(1)
      expect(matches2[0].fullMatchedContent).toBe('edit\nfile bar.txt')
    })

    it('should select bottommost match when multiple patterns match', () => {
      matcher.addPattern({
        id: 'upper',
        pattern: ['start', 'middle'],
        action: { type: 'input', response: 'upper' },
      })
      matcher.addPattern({
        id: 'lower',
        pattern: ['middle', 'end'],
        action: { type: 'input', response: 'lower' },
      })

      const matches = matcher.processData('start\nmiddle\nend')
      expect(matches).toHaveLength(1)
      expect(matches[0].patternId).toBe('lower')
      expect(matches[0].lastLineNumber).toBe(2)
      expect((matches[0].action as any).response).toBe('lower')
    })

    it('should handle scrolled content with deduplication', () => {
      const config: PatternConfig = {
        id: 'scroll-test',
        pattern: ['Do you want', 'Yes'],
        action: { type: 'input', response: '1' },
      }
      matcher.addPattern(config)

      // Initial match at bottom
      const matches1 = matcher.processData(
        'Some output\nDo you want to proceed?\nYes',
      )
      expect(matches1).toHaveLength(1)
      expect(matches1[0].lastLineNumber).toBe(2)

      // Same content scrolled up (with new content below) should not trigger
      const matches2 = matcher.processData(
        'Do you want to proceed?\nYes\nNew content below',
      )
      expect(matches2).toHaveLength(0)
    })

    it('should capture full matched content including intermediate lines', () => {
      const config: PatternConfig = {
        id: 'full-content',
        pattern: ['first', 'last'],
        action: { type: 'input', response: 'found' },
      }
      matcher.addPattern(config)

      const matches = matcher.processData(
        'first line\nintermediate line 1\nintermediate line 2\nlast line',
      )
      expect(matches).toHaveLength(1)
      expect(matches[0].firstLineNumber).toBe(0)
      expect(matches[0].lastLineNumber).toBe(3)
      expect(matches[0].fullMatchedContent).toBe(
        'first line\nintermediate line 1\nintermediate line 2\nlast line',
      )
      expect(matches[0].matchedText).toBe(
        'first line\nintermediate line 1\nintermediate line 2\nlast line',
      )
    })
  })

  describe('Placeholder Extraction', () => {
    it('should extract data from simple placeholder', () => {
      const config: PatternConfig = {
        id: 'file-edit',
        pattern: [
          'Edit file',
          'Do you want to make this edit to {{ fileName }}',
        ],
        action: { type: 'input', response: '1' },
      }
      matcher.addPattern(config)

      const matches = matcher.processData(
        'Edit file\nDo you want to make this edit to config.json',
      )
      expect(matches).toHaveLength(1)
      expect(matches[0].extractedData).toEqual({ fileName: 'config.json' })
    })

    it('should extract multiple placeholders from same line', () => {
      const config: PatternConfig = {
        id: 'multiple-placeholders',
        pattern: ['Process {{ action }} on {{ fileName }} at {{ timestamp }}'],
        action: { type: 'input', response: 'ok' },
      }
      matcher.addPattern(config)

      const matches = matcher.processData(
        'Process create on test.js at 2023-01-01',
      )
      expect(matches).toHaveLength(1)
      expect(matches[0].extractedData).toEqual({
        action: 'create',
        fileName: 'test.js',
        timestamp: '2023-01-01',
      })
    })

    it('should extract placeholders from different lines in sequence', () => {
      const config: PatternConfig = {
        id: 'multi-line-extract',
        pattern: [
          'Edit file',
          'Do you want to make this edit to {{ fileName }}',
          '❯ 1. Yes',
          "2. Yes, and don't ask again this {{ sessionType }}",
        ],
        action: { type: 'input', response: '1' },
      }
      matcher.addPattern(config)

      const matches = matcher.processData(
        "Edit file\nDo you want to make this edit to app.ts\n❯ 1. Yes\n2. Yes, and don't ask again this session",
      )
      expect(matches).toHaveLength(1)
      expect(matches[0].extractedData).toEqual({
        fileName: 'app.ts',
        sessionType: 'session',
      })
    })

    it('should handle placeholders with spaces in variable names', () => {
      const config: PatternConfig = {
        id: 'spaced-placeholder',
        pattern: ['File: {{ file name }}'],
        action: { type: 'input', response: 'found' },
      }
      matcher.addPattern(config)

      const matches = matcher.processData('File: my document.txt')
      expect(matches).toHaveLength(1)
      expect(matches[0].extractedData).toEqual({
        'file name': 'my document.txt',
      })
    })

    it('should work with patterns without placeholders', () => {
      const config: PatternConfig = {
        id: 'no-placeholders',
        pattern: ['Edit file', 'Do you want to proceed'],
        action: { type: 'input', response: '1' },
      }
      matcher.addPattern(config)

      const matches = matcher.processData('Edit file\nDo you want to proceed')
      expect(matches).toHaveLength(1)
      expect(matches[0].extractedData).toBeUndefined()
    })

    it('should handle greedy matching for placeholders', () => {
      const config: PatternConfig = {
        id: 'greedy-match',
        pattern: ['Path: {{ fullPath }}'],
        action: { type: 'input', response: 'found' },
      }
      matcher.addPattern(config)

      const matches = matcher.processData(
        'Path: /very/long/path/to/my/file.txt',
      )
      expect(matches).toHaveLength(1)
      expect(matches[0].extractedData).toEqual({
        fullPath: '/very/long/path/to/my/file.txt',
      })
    })

    it('should handle special regex characters in non-placeholder text', () => {
      const config: PatternConfig = {
        id: 'special-chars',
        pattern: ['Error: {{ message }} (code: {{ code }})'],
        action: { type: 'input', response: 'error' },
      }
      matcher.addPattern(config)

      const matches = matcher.processData('Error: File not found (code: 404)')
      expect(matches).toHaveLength(1)
      expect(matches[0].extractedData).toEqual({
        message: 'File not found',
        code: '404',
      })
    })

    it('should return empty extractedData when no placeholders match', () => {
      const config: PatternConfig = {
        id: 'no-match',
        pattern: ['Expected: {{ value }}'],
        action: { type: 'input', response: 'found' },
      }
      matcher.addPattern(config)

      const matches = matcher.processData('Different text format')
      expect(matches).toHaveLength(0)
    })

    it('should handle empty placeholder values', () => {
      const config: PatternConfig = {
        id: 'empty-placeholder',
        pattern: ['Value: {{ data }}'],
        action: { type: 'input', response: 'found' },
      }
      matcher.addPattern(config)

      const matches = matcher.processData('Value: ')
      expect(matches).toHaveLength(1)
      expect(matches[0].extractedData).toEqual({ data: '' })
    })

    it('should extract file names from real Claude create file prompts', () => {
      const config: PatternConfig = {
        id: 'real-create-file',
        pattern: ['Create file', 'Do you want to create {{ fileName }}?'],
        action: { type: 'input', response: '1' },
      }
      matcher.addPattern(config)

      const matches = matcher.processData(
        'Create file\nDo you want to create @foo.txt?',
      )
      expect(matches).toHaveLength(1)
      expect(matches[0].extractedData).toEqual({ fileName: '@foo.txt' })
    })

    it('should extract file names from real Claude edit file prompts', () => {
      const config: PatternConfig = {
        id: 'real-edit-file',
        pattern: [
          'Edit file',
          'Do you want to make this edit to {{ fileName }}?',
        ],
        action: { type: 'input', response: '1' },
      }
      matcher.addPattern(config)

      const matches = matcher.processData(
        'Edit file\nDo you want to make this edit to config.json?',
      )
      expect(matches).toHaveLength(1)
      expect(matches[0].extractedData).toEqual({ fileName: 'config.json' })
    })
  })
})
