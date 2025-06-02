import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MatchResult } from '../../src/patterns/matcher'
import {
  showPatternNotification,
  notifier,
} from '../../src/utils/notifications'
import { createMatchWithNotification } from '../utils/test-notification-utils'

vi.mock('node-notifier', () => ({
  default: {
    notify: vi.fn(),
  },
}))

const mockNotify = vi.mocked(notifier.notify)

describe('Notification functionality', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should call notifier.notify with correct parameters', () => {
    const match: MatchResult = {
      patternId: 'test-pattern',
      patternTitle: 'Test Notification',
      response: { type: 'log', path: '/tmp/test.log' },
      matchedText: 'Welcome to Claude Code!',
      bufferContent: 'Some buffer content with Welcome to Claude Code! in it',
      strippedBufferContent:
        'Some buffer content with Welcome to Claude Code! in it',
      notification: 'Pattern triggered: {{title}}\nMatched: {{matchedText}}',
    }

    showPatternNotification(match)

    expect(mockNotify).toHaveBeenCalledOnce()
    expect(mockNotify).toHaveBeenCalledWith({
      title: '🤖 Claude Composer',
      message:
        'Pattern triggered: Test Notification\nMatched: Welcome to Claude Code!',
      timeout: undefined,
      wait: false,
      sound: false,
    })
  })

  it('should truncate long matched text to 100 characters', () => {
    const longText = 'A'.repeat(150)
    const match = createMatchWithNotification(
      {
        patternId: 'long-pattern',
        patternTitle: 'Long Text Pattern',
        response: 'test',
        matchedText: longText,
        bufferContent: 'buffer content',
        strippedBufferContent: 'buffer content',
      },
      'Pattern triggered: {{title}}\nMatched: {{matchedText}}',
    )

    showPatternNotification(match)

    expect(mockNotify).toHaveBeenCalledWith({
      title: '🤖 Claude Composer',
      message: `Pattern triggered: Long Text Pattern\nMatched: ${'A'.repeat(150)}`,
      timeout: undefined,
      wait: false,
      sound: false,
    })
  })

  it('should handle different pattern action types', () => {
    const inputMatch = createMatchWithNotification(
      {
        patternId: 'input-pattern',
        patternTitle: 'Input Test Pattern',
        response: ['response1', 'response2'],
        matchedText: 'trigger text',
        bufferContent: 'buffer',
        strippedBufferContent: 'buffer',
      },
      'Pattern triggered: {{title}}\nAction: Input',
    )

    const logMatch = createMatchWithNotification(
      {
        patternId: 'log-pattern',
        patternTitle: 'Log Test Pattern',
        response: { type: 'log', path: '/tmp/log.json' },
        matchedText: 'log trigger',
        bufferContent: 'buffer',
        strippedBufferContent: 'buffer',
      },
      'Pattern triggered: {{title}}\nAction: Log',
    )

    showPatternNotification(inputMatch)
    showPatternNotification(logMatch)

    expect(mockNotify).toHaveBeenCalledTimes(2)
    expect(mockNotify).toHaveBeenNthCalledWith(1, {
      title: '🤖 Claude Composer',
      message: 'Pattern triggered: Input Test Pattern\nAction: Input',
      timeout: undefined,
      wait: false,
      sound: false,
    })
    expect(mockNotify).toHaveBeenNthCalledWith(2, {
      title: '🤖 Claude Composer',
      message: 'Pattern triggered: Log Test Pattern\nAction: Log',
      timeout: undefined,
      wait: false,
      sound: false,
    })
  })

  it('should strip ANSI color codes from matched text', () => {
    const coloredText =
      '\x1b[36mColored text\x1b[0m with \x1b[31mred\x1b[0m content'
    const match = createMatchWithNotification(
      {
        patternId: 'ansi-pattern',
        patternTitle: 'ANSI Color Pattern',
        response: { type: 'log', path: '/tmp/test.log' },
        matchedText: coloredText,
        bufferContent: 'buffer',
        strippedBufferContent: 'buffer',
      },
      'Pattern triggered: {{title}}\nMatched: {{matchedText}}',
    )

    showPatternNotification(match)

    // The template utils should handle stripping ANSI codes
    expect(mockNotify).toHaveBeenCalledWith({
      title: '🤖 Claude Composer',
      message:
        'Pattern triggered: ANSI Color Pattern\nMatched: Colored text with red content',
      timeout: undefined,
      wait: false,
      sound: false,
    })
  })

  it('should not show notification when notification property is not set', () => {
    const match: MatchResult = {
      patternId: 'no-notification',
      patternTitle: 'No Notification Pattern',
      response: 'test',
      matchedText: 'some text',
      bufferContent: 'buffer',
      strippedBufferContent: 'buffer',
      // No notification property
    }

    showPatternNotification(match)

    expect(mockNotify).not.toHaveBeenCalled()
  })
})
