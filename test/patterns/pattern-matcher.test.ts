import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { PatternMatcher, type PatternConfig } from '../../src/patterns/matcher'
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
        title: 'Test Pattern',
        pattern: ['hello', 'world'],
        response: 'matched',
      }
      matcher.addPattern(config)
      const matches = matcher.processData('hello\nworld')
      expect(matches).toHaveLength(1)
      // action.type check removed - now using response directly
      expect(matches[0].response).toBe('matched')
    })

    it('should handle patterns without pattern array', () => {
      const config: PatternConfig = {
        id: 'test-no-pattern',
        title: 'No Pattern Test',
        response: 'immediate-match',
        triggerText: 'trigger',
      }
      matcher.addPattern(config)
      const matches = matcher.processData('some content with trigger text')
      expect(matches).toHaveLength(1)
      expect(matches[0].response).toBe('immediate-match')
      expect(matches[0].fullMatchedContent).toBe(
        'some content with trigger text',
      )
    })

    it('should remove pattern', () => {
      const config: PatternConfig = {
        id: 'test1',
        title: 'Test Pattern',
        pattern: ['hello', 'world'],
        response: 'matched',
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
        title: 'Error Pattern',
        pattern: ['error', 'occurred'],
        response: 'Error found',
      })
      matcher.addPattern({
        id: 'test2',
        title: 'Warning Pattern',
        pattern: ['warning', 'issued'],
        response: 'Warning found',
      })
      const matches = matcher.processData('error\noccurred\nwarning\nissued')
      expect(matches).toHaveLength(1)
      expect(matches[0].response).toBe('Warning found')
      expect(matches[0].lastLineNumber).toBe(3)
    })

    it('should handle array responses', () => {
      const config: PatternConfig = {
        id: 'test1',
        title: 'Help Pattern',
        pattern: ['help', 'needed'],
        response: ['Sure!', 'How can I help?'],
      }
      matcher.addPattern(config)
      const matches = matcher.processData('I need help\nHelp needed')
      expect(matches).toHaveLength(1)
      expect(matches[0].response).toEqual(['Sure!', 'How can I help?'])
    })
  })

  describe('Direct Content Processing', () => {
    it('should match patterns in complete screen content', () => {
      const config: PatternConfig = {
        id: 'test1',
        title: 'Complete Message',
        pattern: ['complete', 'message'],
        response: 'Found it!',
      }
      matcher.addPattern(config)

      const matches = matcher.processData('This is a complete\nmessage')
      expect(matches).toHaveLength(1)
      expect(matches[0].response).toBe('Found it!')
    })

    it('should process each data call independently', () => {
      const config: PatternConfig = {
        id: 'test1',
        title: 'Old Data Pattern',
        pattern: ['old', 'data'],
        response: 'Found old',
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
        title: 'ANSI Test Pattern',
        pattern: ['Edit', 'file'],
        response: 'yes',
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
        title: 'Bash Command Pattern',
        pattern: ['Bash', 'command'],
        response: { type: 'log', path: '/tmp/test.log' },
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
        title: 'Basic Sequence Pattern',
        pattern: ['First line', 'Second line', 'Third line'],
        response: 'Sequence found!',
      }
      matcher.addPattern(config)

      const matches = matcher.processData('First line\nSecond line\nThird line')
      expect(matches).toHaveLength(1)
      expect(matches[0].patternId).toBe('seq1')
      expect(matches[0].response).toBe('Sequence found!')
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
        title: 'Start Middle End Pattern',
        pattern: ['Start', 'Middle', 'End'],
        response: 'Found it',
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
        title: 'Incomplete Sequence Test',
        pattern: ['First', 'Second', 'Third'],
        response: 'Complete',
      }
      matcher.addPattern(config)

      const matches = matcher.processData('First\nSecond\nFourth')
      expect(matches).toHaveLength(0)
    })

    it('should not match sequence in wrong order', () => {
      const config: PatternConfig = {
        id: 'seq1',
        title: 'ABC Order Test Pattern',
        pattern: ['A', 'B', 'C'],
        response: 'ABC',
      }
      matcher.addPattern(config)

      const matches = matcher.processData('B\nA\nC')
      expect(matches).toHaveLength(0)
    })

    it('should match sequence case-sensitively', () => {
      const config: PatternConfig = {
        id: 'seq1',
        title: 'Case Sensitive Hello World',
        pattern: ['hello', 'world'],
        response: 'Hi!',
      }
      matcher.addPattern(config)

      const matches = matcher.processData('hello there\nworld')
      expect(matches).toHaveLength(1)
    })

    it('should match sequence with ANSI codes stripped', () => {
      const largeMatcher = new PatternMatcher()
      const config: PatternConfig = {
        id: 'edit-prompt',
        title: 'Edit File Prompt with ANSI',
        pattern: ['Edit file', 'Do you want to make this edit', '❯ 1. Yes'],
        response: '1',
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
        title: 'Complex UI Prompt Sequence',
        pattern: [
          'Edit file',
          'Do you want to make this edit to',
          '❯ 1. Yes',
          "2. Yes, and don't ask again this session (shift+tab)",
          '3. No, and tell Claude what to do differently (esc)',
        ],
        response: '1',
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
      // action.type check removed - now using response directly
      expect(matches[0].response).toBe('1')
    })

    it('should match complete sequence in single data input', () => {
      const config: PatternConfig = {
        id: 'seq1',
        title: 'Complete Sequence in Single Input',
        pattern: ['Beginning', 'Middle part', 'The end'],
        response: 'Complete sequence',
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
        title: 'Empty Sequence Test',
        pattern: [],
        response: 'Empty',
      }
      matcher.addPattern(config)

      const matches = matcher.processData('Any text')
      expect(matches).toHaveLength(1)
      expect(matches[0].response).toBe('Empty')
      expect(matches[0].fullMatchedContent).toBe('Any text')
    })

    it('should match partial strings within lines', () => {
      const config: PatternConfig = {
        id: 'partial',
        title: 'Partial String Match Pattern',
        pattern: ['file', 'edit', 'Yes'],
        response: '1',
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
        title: 'Optimization Test Pattern',
        pattern: ['Start of sequence', 'Middle part', 'Final line'],
        response: 'Found',
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
        title: 'Long Sequence Efficiency Test',
        pattern: longSequence,
        response: 'Long sequence found',
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
        title: 'Deduplication Test Pattern',
        pattern: ['hello', 'world'],
        response: 'matched',
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
        title: 'Content Change Test Pattern',
        pattern: ['edit', 'file'],
        response: '1',
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
        title: 'Upper Match Pattern',
        pattern: ['start', 'middle'],
        response: 'upper',
      })
      matcher.addPattern({
        id: 'lower',
        title: 'Lower Match Pattern',
        pattern: ['middle', 'end'],
        response: 'lower',
      })

      const matches = matcher.processData('start\nmiddle\nend')
      expect(matches).toHaveLength(1)
      expect(matches[0].patternId).toBe('lower')
      expect(matches[0].lastLineNumber).toBe(2)
      expect(matches[0].response).toBe('lower')
    })

    it('should handle scrolled content with deduplication', () => {
      const config: PatternConfig = {
        id: 'scroll-test',
        title: 'Scrolled Content Test',
        pattern: ['Do you want', 'Yes'],
        response: '1',
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
        title: 'Full Content Capture Test',
        pattern: ['first', 'last'],
        response: 'found',
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
        title: 'File Edit Placeholder Test',
        pattern: [
          'Edit file',
          'Do you want to make this edit to {{ fileName }}',
        ],
        response: '1',
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
        title: 'Multiple Placeholders Test',
        pattern: ['Process {{ action }} on {{ fileName }} at {{ timestamp }}'],
        response: 'ok',
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
        title: 'Multi-line Extraction Test',
        pattern: [
          'Edit file',
          'Do you want to make this edit to {{ fileName }}',
          '❯ 1. Yes',
          "2. Yes, and don't ask again this {{ sessionType }}",
        ],
        response: '1',
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
        title: 'Spaced Placeholder Name Test',
        pattern: ['File: {{ file name }}'],
        response: 'found',
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
        title: 'No Placeholders Test',
        pattern: ['Edit file', 'Do you want to proceed'],
        response: '1',
      }
      matcher.addPattern(config)

      const matches = matcher.processData('Edit file\nDo you want to proceed')
      expect(matches).toHaveLength(1)
      expect(matches[0].extractedData).toBeUndefined()
    })

    it('should handle greedy matching for placeholders', () => {
      const config: PatternConfig = {
        id: 'greedy-match',
        title: 'Greedy Matching Test',
        pattern: ['Path: {{ fullPath }}'],
        response: 'found',
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
        title: 'Special Characters Test',
        pattern: ['Error: {{ message }} (code: {{ code }})'],
        response: 'error',
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
        title: 'No Match Test Pattern',
        pattern: ['Expected: {{ value }}'],
        response: 'found',
      }
      matcher.addPattern(config)

      const matches = matcher.processData('Different text format')
      expect(matches).toHaveLength(0)
    })

    it('should handle empty placeholder values', () => {
      const config: PatternConfig = {
        id: 'empty-placeholder',
        title: 'Empty Placeholder Test',
        pattern: ['Value: {{ data }}'],
        response: 'found',
      }
      matcher.addPattern(config)

      const matches = matcher.processData('Value: ')
      expect(matches).toHaveLength(1)
      expect(matches[0].extractedData).toEqual({ data: '' })
    })

    it('should extract file names from real Claude create file prompts', () => {
      const config: PatternConfig = {
        id: 'real-create-file',
        title: 'Real Create File Prompt',
        pattern: ['Create file', 'Do you want to create {{ fileName }}?'],
        response: '1',
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
        title: 'Real Edit File Prompt',
        pattern: [
          'Edit file',
          'Do you want to make this edit to {{ fileName }}?',
        ],
        response: '1',
      }
      matcher.addPattern(config)

      const matches = matcher.processData(
        'Edit file\nDo you want to make this edit to config.json?',
      )
      expect(matches).toHaveLength(1)
      expect(matches[0].extractedData).toEqual({ fileName: 'config.json' })
    })
  })

  describe('Multiline Placeholder Extraction', () => {
    it('should extract content between two concrete patterns', () => {
      const config: PatternConfig = {
        id: 'multiline-test',
        title: 'Multiline Content Test',
        pattern: [
          'Edit file',
          '{{ diffContent | multiline }}',
          'Do you want to make this edit to {{ fileName }}?',
        ],
        response: '1',
      }
      matcher.addPattern(config)

      const matches = matcher.processData(
        'Edit file\n' +
          'line 1 of diff\n' +
          'line 2 of diff\n' +
          'line 3 of diff\n' +
          'Do you want to make this edit to config.json?',
      )
      expect(matches).toHaveLength(1)
      expect(matches[0].extractedData).toEqual({
        diffContent: 'line 1 of diff\nline 2 of diff\nline 3 of diff',
        fileName: 'config.json',
      })
    })

    it('should extract multiple multiline sections', () => {
      const config: PatternConfig = {
        id: 'multiple-multiline',
        title: 'Multiple Multiline Sections',
        pattern: [
          'Start',
          '{{ section1 | multiline }}',
          'Middle',
          '{{ section2 | multiline }}',
          'End',
        ],
        response: 'ok',
      }
      matcher.addPattern(config)

      const matches = matcher.processData(
        'Start\n' +
          'content A\n' +
          'content B\n' +
          'Middle\n' +
          'content C\n' +
          'content D\n' +
          'End',
      )
      expect(matches).toHaveLength(1)
      expect(matches[0].extractedData).toEqual({
        section1: 'content A\ncontent B',
        section2: 'content C\ncontent D',
      })
    })

    it('should handle empty multiline sections', () => {
      const config: PatternConfig = {
        id: 'empty-multiline',
        title: 'Empty Multiline Section',
        pattern: ['Start', '{{ empty | multiline }}', 'End'],
        response: 'ok',
      }
      matcher.addPattern(config)

      const matches = matcher.processData('Start\nEnd')
      expect(matches).toHaveLength(1)
      expect(matches[0].extractedData).toEqual({
        empty: '',
      })
    })

    it('should handle multiline at beginning of pattern', () => {
      const config: PatternConfig = {
        id: 'multiline-start',
        title: 'Multiline at Start Test',
        pattern: ['{{ header | multiline }}', 'Important line'],
        response: 'ok',
      }
      matcher.addPattern(config)

      const matches = matcher.processData(
        'Header line 1\n' + 'Header line 2\n' + 'Important line',
      )
      expect(matches).toHaveLength(1)
      expect(matches[0].extractedData).toEqual({
        header: 'Header line 1\nHeader line 2',
      })
    })

    it('should handle multiline at end of pattern', () => {
      const config: PatternConfig = {
        id: 'multiline-end',
        title: 'Multiline at End Test',
        pattern: ['Important line', '{{ footer | multiline }}'],
        response: 'ok',
      }
      matcher.addPattern(config)

      const matches = matcher.processData(
        'Important line\n' + 'Footer line 1\n' + 'Footer line 2',
      )
      expect(matches).toHaveLength(1)
      expect(matches[0].extractedData).toEqual({
        footer: 'Footer line 1\nFooter line 2',
      })
    })

    it('should mix regular and multiline placeholders', () => {
      const config: PatternConfig = {
        id: 'mixed-placeholders',
        title: 'Mixed Placeholder Types',
        pattern: [
          'Process {{ action }} file',
          '{{ diffContent | multiline }}',
          'Save to {{ fileName }}?',
          '{{ options | multiline }}',
          '❯ 1. {{ choice }}',
        ],
        response: '1',
      }
      matcher.addPattern(config)

      const matches = matcher.processData(
        'Process edit file\n' +
          'diff line 1\n' +
          'diff line 2\n' +
          'Save to test.txt?\n' +
          'option 1\n' +
          'option 2\n' +
          '❯ 1. Yes',
      )
      expect(matches).toHaveLength(1)
      expect(matches[0].extractedData).toEqual({
        action: 'edit',
        diffContent: 'diff line 1\ndiff line 2',
        fileName: 'test.txt',
        options: 'option 1\noption 2',
        choice: 'Yes',
      })
    })

    it('should handle real-world Claude edit file prompt with diff', () => {
      const config: PatternConfig = {
        id: 'claude-edit-with-diff',
        title: 'Claude Edit with Diff',
        pattern: [
          'Edit file',
          '{{ diffContent | multiline }}',
          'Do you want to make this edit to {{ fileName }}?',
          '❯ 1. Yes',
        ],
        response: '1',
      }
      matcher.addPattern(config)

      const matches = matcher.processData(
        'Edit file\n' +
          '  1  - old line\n' +
          '  2  + new line\n' +
          '  3    unchanged line\n' +
          'Do you want to make this edit to app.js?\n' +
          '❯ 1. Yes\n' +
          "  2. Yes, and don't ask again this session\n" +
          '  3. No, and tell Claude what to do differently',
      )
      expect(matches).toHaveLength(1)
      expect(matches[0].extractedData).toEqual({
        diffContent: '  1  - old line\n  2  + new line\n  3    unchanged line',
        fileName: 'app.js',
      })
    })

    it('should handle multiline placeholders with ANSI codes', () => {
      const config: PatternConfig = {
        id: 'ansi-multiline',
        title: 'ANSI Multiline Test',
        pattern: [
          'Edit file',
          '{{ diffContent | multiline }}',
          'Do you want to proceed?',
        ],
        response: '1',
      }
      matcher.addPattern(config)

      const matches = matcher.processData(
        '\x1b[1mEdit file\x1b[0m\n' +
          '\x1b[32m+ added line\x1b[0m\n' +
          '\x1b[31m- removed line\x1b[0m\n' +
          'Do you want to proceed?',
      )
      expect(matches).toHaveLength(1)
      expect(matches[0].extractedData).toEqual({
        diffContent: '+ added line\n- removed line',
      })
    })

    it('should not match if concrete patterns are missing', () => {
      const config: PatternConfig = {
        id: 'missing-concrete',
        title: 'Missing Concrete Pattern Test',
        pattern: ['Start pattern', '{{ content | multiline }}', 'End pattern'],
        response: 'ok',
      }
      matcher.addPattern(config)

      // Missing the end pattern
      const matches = matcher.processData(
        'Start pattern\n' + 'some content\n' + 'more content',
      )
      expect(matches).toHaveLength(0)
    })

    it('should handle whitespace in multiline placeholder names', () => {
      const config: PatternConfig = {
        id: 'whitespace-name',
        title: 'Whitespace in Name Test',
        pattern: ['Begin', '{{ diff content | multiline }}', 'End'],
        response: 'ok',
      }
      matcher.addPattern(config)

      const matches = matcher.processData(
        'Begin\n' + 'line 1\n' + 'line 2\n' + 'End',
      )
      expect(matches).toHaveLength(1)
      expect(matches[0].extractedData).toEqual({
        'diff content': 'line 1\nline 2',
      })
    })
  })
})
