import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MatchResult } from '../pattern-matcher'
import stripAnsi from 'strip-ansi'

vi.mock('node-notifier', () => ({
  default: {
    notify: vi.fn(),
  },
}))

import notifier from 'node-notifier'
const mockNotify = vi.mocked(notifier.notify)

describe('Notification functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call notifier.notify with correct parameters', () => {
    const match: MatchResult = {
      patternId: 'test-pattern',
      action: { type: 'log', path: '/tmp/test.log' },
      matchedText: 'Welcome to Claude Code!',
      bufferContent: 'Some buffer content with Welcome to Claude Code! in it',
    }

    const showNotification = (match: MatchResult) => {
      const title = '🤖 Claude Composer'
      const message = `Pattern triggered: ${match.patternId}\nMatched: ${match.matchedText.substring(0, 100)}`

      notifier.notify({
        title,
        message,
        timeout: false,
        wait: false,
        sound: false,
      })
    }

    showNotification(match)

    expect(mockNotify).toHaveBeenCalledOnce()
    expect(mockNotify).toHaveBeenCalledWith({
      title: '🤖 Claude Composer',
      message:
        'Pattern triggered: test-pattern\nMatched: Welcome to Claude Code!',
      timeout: false,
      wait: false,
      sound: false,
    })
  })

  it('should truncate long matched text to 100 characters', () => {
    const longText = 'A'.repeat(150)
    const match: MatchResult = {
      patternId: 'long-pattern',
      action: { type: 'input', response: 'test' },
      matchedText: longText,
      bufferContent: 'buffer content',
    }

    const showNotification = (match: MatchResult) => {
      const title = '🤖 Claude Composer'
      const message = `Pattern triggered: ${match.patternId}\nMatched: ${match.matchedText.substring(0, 100)}`

      notifier.notify({
        title,
        message,
        timeout: false,
        wait: false,
        sound: false,
      })
    }

    showNotification(match)

    expect(mockNotify).toHaveBeenCalledWith({
      title: '🤖 Claude Composer',
      message: `Pattern triggered: long-pattern\nMatched: ${'A'.repeat(100)}`,
      timeout: false,
      wait: false,
      sound: false,
    })
  })

  it('should handle different pattern action types', () => {
    const inputMatch: MatchResult = {
      patternId: 'input-pattern',
      action: { type: 'input', response: ['response1', 'response2'] },
      matchedText: 'trigger text',
      bufferContent: 'buffer',
    }

    const logMatch: MatchResult = {
      patternId: 'log-pattern',
      action: { type: 'log', path: '/tmp/log.json' },
      matchedText: 'log trigger',
      bufferContent: 'buffer',
    }

    const showNotification = (match: MatchResult) => {
      const title = '🤖 Claude Composer'
      const message = `Pattern triggered: ${match.patternId}\nMatched: ${match.matchedText.substring(0, 100)}`

      notifier.notify({
        title,
        message,
        timeout: false,
        wait: false,
        sound: false,
      })
    }

    showNotification(inputMatch)
    showNotification(logMatch)

    expect(mockNotify).toHaveBeenCalledTimes(2)
    expect(mockNotify).toHaveBeenNthCalledWith(1, {
      title: '🤖 Claude Composer',
      message: 'Pattern triggered: input-pattern\nMatched: trigger text',
      timeout: false,
      wait: false,
      sound: false,
    })
    expect(mockNotify).toHaveBeenNthCalledWith(2, {
      title: '🤖 Claude Composer',
      message: 'Pattern triggered: log-pattern\nMatched: log trigger',
      timeout: false,
      wait: false,
      sound: false,
    })
  })

  it('should strip ANSI color codes from matched text', () => {
    const coloredText =
      '\x1b[36mColored text\x1b[0m with \x1b[31mred\x1b[0m content'
    const match: MatchResult = {
      patternId: 'ansi-pattern',
      action: { type: 'log', path: '/tmp/test.log' },
      matchedText: coloredText,
      bufferContent: 'buffer',
    }

    const showNotification = (match: MatchResult) => {
      const title = '🤖 Claude Composer Next'
      const message = `Pattern triggered: ${match.patternId}\nMatched: ${stripAnsi(match.matchedText).substring(0, 100)}`

      notifier.notify({
        title,
        message,
        timeout: false,
        wait: false,
        sound: false,
      })
    }

    showNotification(match)

    expect(mockNotify).toHaveBeenCalledWith({
      title: '🤖 Claude Composer Next',
      message:
        'Pattern triggered: ansi-pattern\nMatched: Colored text with red content',
      timeout: false,
      wait: false,
      sound: false,
    })
  })
})
