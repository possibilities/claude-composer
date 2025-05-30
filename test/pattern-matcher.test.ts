import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import { PatternMatcher, type PatternConfig } from '../pattern-matcher'
import { readFileSync, unlinkSync, existsSync } from 'fs'

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

  describe('Duplicate Prevention Behavior', () => {
    it('should prevent duplicate matches of the same text', () => {
      const config: PatternConfig = {
        id: 'test1',
        pattern: ['trigger', 'response'],
        action: { type: 'input', response: 'Response' },
      }
      matcher.addPattern(config)

      const matches1 = matcher.processData('trigger\nresponse')
      expect(matches1).toHaveLength(1)

      const matches2 = matcher.processData('')
      expect(matches2).toHaveLength(0)

      const matches3 = matcher.processData('\nextra')
      expect(matches3).toHaveLength(0)
    })

    it('should track duplicates separately for different patterns', () => {
      matcher.addPattern({
        id: 'test1',
        pattern: ['pattern1', 'first'],
        action: { type: 'input', response: 'Response1' },
      })
      matcher.addPattern({
        id: 'test2',
        pattern: ['pattern2', 'second'],
        action: { type: 'input', response: 'Response2' },
      })

      const matches1 = matcher.processData('pattern1\nfirst\npattern2\nsecond')
      expect(matches1).toHaveLength(2)

      const matches2 = matcher.processData('')
      expect(matches2).toHaveLength(0)

      matcher = new PatternMatcher(2048)
      matcher.addPattern({
        id: 'test1',
        pattern: ['pattern1', 'first'],
        action: { type: 'input', response: 'Response1' },
      })
      matcher.addPattern({
        id: 'test2',
        pattern: ['pattern2', 'second'],
        action: { type: 'input', response: 'Response2' },
      })

      const matches3 = matcher.processData('pattern1\nfirst')
      expect(matches3).toHaveLength(1)
      expect(matches3[0].patternId).toBe('test1')
    })

    it('should allow matching when the matched text changes', () => {
      const config: PatternConfig = {
        id: 'test1',
        pattern: ['start', 'end'],
        action: { type: 'input', response: 'Response' },
      }
      matcher.addPattern(config)

      const matches1 = matcher.processData('start\nmiddle\nend')
      expect(matches1).toHaveLength(1)
      expect(matches1[0].matchedText).toBe('start\nmiddle\nend')

      const matches2 = matcher.processData('')
      expect(matches2).toHaveLength(0)

      matcher = new PatternMatcher(2048)
      matcher.addPattern(config)

      const matches3 = matcher.processData('start\ndifferent\nend')
      expect(matches3).toHaveLength(1)
      expect(matches3[0].matchedText).toBe('start\ndifferent\nend')
    })
  })

  describe('Buffer Behavior', () => {
    it('should match patterns across multiple data chunks', () => {
      const config: PatternConfig = {
        id: 'test1',
        pattern: ['complete', 'message'],
        action: { type: 'input', response: 'Found it!' },
      }
      matcher.addPattern(config)

      matcher.processData('This is a comp')
      const matches = matcher.processData('lete\nmessage')
      expect(matches).toHaveLength(1)
      expect((matches[0].action as any).response).toBe('Found it!')
    })

    it('should respect buffer size limit', () => {
      const smallMatcher = new PatternMatcher(10)
      const config: PatternConfig = {
        id: 'test1',
        pattern: ['old', 'data'],
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

    it('should prevent duplicate sequence matches', () => {
      const config: PatternConfig = {
        id: 'seq1',
        pattern: ['A', 'B'],
        action: { type: 'input', response: 'AB' },
      }
      matcher.addPattern(config)

      const matches1 = matcher.processData('A\nB')
      expect(matches1).toHaveLength(1)

      const matches2 = matcher.processData('')
      expect(matches2).toHaveLength(0)

      matcher = new PatternMatcher(2048)
      matcher.addPattern(config)

      const matches3 = matcher.processData('A\nC\nB')
      expect(matches3).toHaveLength(1)
      expect(matches3[0].matchedText).toBe('A\nC\nB')
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
      const testMatcher = new PatternMatcher(500)

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
      const largeMatcher = new PatternMatcher(2000)

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

  describe('Pattern Matching With Duplicate Prevention', () => {
    it('should prevent duplicate responses for identical text within time window', () => {
      const config: PatternConfig = {
        id: 'edit-prompt',
        pattern: ['Edit file', 'Do you want to make this edit', '❯ 1. Yes'],
        action: { type: 'input', response: '1' },
      }

      // Use a 1000ms window for testing
      const testMatcher = new PatternMatcher(2048, 1000)
      testMatcher.addPattern(config)

      // Simulate the real scenario: first, we get some screen content that matches
      const promptText =
        'Edit file\nDo you want to make this edit to file1.js?\n❯ 1. Yes'
      const matches1 = testMatcher.processData(promptText)
      expect(matches1).toHaveLength(1)

      // Simulate the 100ms screen polling seeing the same content again (common in real usage)
      // This should be blocked as a duplicate
      const matches2 = testMatcher.processData('') // Empty data but pattern still in buffer
      expect(matches2).toHaveLength(0)

      // Clear buffer and test different content
      const testMatcher2 = new PatternMatcher(2048, 1000)
      testMatcher2.addPattern(config)

      // Different file should be allowed immediately
      const matches3 = testMatcher2.processData(
        'Edit file\nDo you want to make this edit to file2.js?\n❯ 1. Yes',
      )
      expect(matches3).toHaveLength(1)

      // Same file after time window should be allowed
      vi.advanceTimersByTime(1100)
      const matches4 = testMatcher2.processData(
        'Edit file\nDo you want to make this edit to file1.js?\n❯ 1. Yes',
      )
      expect(matches4).toHaveLength(1)
    })

    it('should allow different prompt types within time window', () => {
      const editConfig: PatternConfig = {
        id: 'edit-prompt',
        pattern: ['Edit file', 'Do you want to make this edit', '❯ 1. Yes'],
        action: { type: 'input', response: '1' },
      }

      const createConfig: PatternConfig = {
        id: 'create-prompt',
        pattern: ['Create file', 'Do you want to create', '❯ 1. Yes'],
        action: { type: 'input', response: '1' },
      }

      // Test edit prompt first
      const editMatcher = new PatternMatcher(2048, 1000)
      editMatcher.addPattern(editConfig)
      const matches1 = editMatcher.processData(
        'Edit file\nDo you want to make this edit to file.js?\n❯ 1. Yes',
      )
      expect(matches1).toHaveLength(1)
      expect(matches1[0].patternId).toBe('edit-prompt')

      // Test create prompt separately - different pattern types should always be allowed
      const createMatcher = new PatternMatcher(2048, 1000)
      createMatcher.addPattern(createConfig)
      const matches2 = createMatcher.processData(
        'Create file\nDo you want to create newfile.js?\n❯ 1. Yes',
      )
      expect(matches2).toHaveLength(1)
      expect(matches2[0].patternId).toBe('create-prompt')
    })

    it('should only match when content changes', () => {
      const config: PatternConfig = {
        id: 'test1',
        pattern: ['prompt', '>'],
        action: { type: 'input', response: 'ok' },
      }
      matcher.addPattern(config)

      const matches1 = matcher.processData('prompt\n>')
      expect(matches1).toHaveLength(1)

      // Same content, no match
      const matches2 = matcher.processData('')
      expect(matches2).toHaveLength(0)

      // Clear buffer for new test
      matcher = new PatternMatcher(2048)
      matcher.addPattern(config)

      // New instance with different surrounding content
      const matches3 = matcher.processData('prompt\n>\nnew line')
      expect(matches3).toHaveLength(1)

      // Same content, no match
      const matches4 = matcher.processData('')
      expect(matches4).toHaveLength(0)
    })

    it('should match again when matched text differs', () => {
      const config: PatternConfig = {
        id: 'test1',
        pattern: ['test', 'data'],
        action: { type: 'input', response: 'found' },
      }
      matcher.addPattern(config)

      const matches1 = matcher.processData('test\ndata')
      expect(matches1).toHaveLength(1)

      const matches2 = matcher.processData('')
      expect(matches2).toHaveLength(0)

      matcher = new PatternMatcher(2048)
      matcher.addPattern(config)

      const matches3 = matcher.processData('test\nmiddle\ndata')
      expect(matches3).toHaveLength(1)
      expect(matches3[0].matchedText).toBe('test\nmiddle\ndata')

      const matches4 = matcher.processData('')
      expect(matches4).toHaveLength(0)
    })
  })
})
