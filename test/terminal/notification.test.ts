import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MatchResult } from '../../src/patterns/matcher'
import {
  showPatternNotification,
  notifier,
} from '../../src/utils/notifications'
import { createMatchWithNotification } from '../utils/test-notification-utils'
import { AppConfig } from '../../src/config/schemas'

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

  const defaultAppConfig: AppConfig = {
    show_notifications: true,
    show_confirm_notify: true,
    show_accepted_confirm_notify: false,
    show_prompted_confirm_notify: true,
    confirm_notify: {
      edit_file: true,
      create_file: true,
      bash_command: true,
      read_file: true,
      fetch_content: true,
    },
  }

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

    showPatternNotification(match, defaultAppConfig, 'Prompted', '❤')

    expect(mockNotify).toHaveBeenCalledOnce()
    expect(mockNotify).toHaveBeenCalledWith({
      title: '🤖 Claude Composer',
      message:
        'Pattern triggered: Test Notification\nMatched: Welcome to Claude Code!',
      timeout: 86400, // prompted confirmations are sticky by default
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
        response: { type: 'log' },
        matchedText: longText,
        bufferContent: `Buffer with ${longText}`,
        strippedBufferContent: `Buffer with ${longText}`,
      },
      'Pattern triggered: {{title}}\nMatched: {{matchedText}}',
    )

    showPatternNotification(match, defaultAppConfig, 'Prompted', '❤')

    expect(mockNotify).toHaveBeenCalledWith({
      title: '🤖 Claude Composer',
      message: `Pattern triggered: Long Text Pattern\nMatched: ${'A'.repeat(150)}`,
      timeout: 86400, // prompted confirmations are sticky by default
      wait: false,
      sound: false,
    })
  })

  it('should handle different pattern action types', () => {
    const inputMatch = createMatchWithNotification(
      {
        patternId: 'test-input',
        patternTitle: 'Test Input',
        response: '1',
        matchedText: 'input trigger',
        bufferContent: 'buffer',
        strippedBufferContent: 'buffer',
      },
      'Pattern triggered: {{title}}\nAction: Input',
    )

    const logMatch = createMatchWithNotification(
      {
        patternId: 'test-log',
        patternTitle: 'Test Log',
        response: { type: 'log', path: '/tmp/test.log' },
        matchedText: 'log trigger',
        bufferContent: 'buffer',
        strippedBufferContent: 'buffer',
      },
      'Pattern triggered: {{title}}\nAction: Log',
    )

    showPatternNotification(inputMatch, defaultAppConfig, 'Prompted', '❤')
    showPatternNotification(logMatch, defaultAppConfig, 'Prompted', '❤')

    expect(mockNotify).toHaveBeenCalledTimes(2)
    expect(mockNotify).toHaveBeenNthCalledWith(1, {
      title: '🤖 Claude Composer',
      message: 'Pattern triggered: Test Input\nAction: Input',
      timeout: 86400, // prompted confirmations are sticky by default
      wait: false,
      sound: false,
    })
    expect(mockNotify).toHaveBeenNthCalledWith(2, {
      title: '🤖 Claude Composer',
      message: 'Pattern triggered: Test Log\nAction: Log',
      timeout: 86400, // prompted confirmations are sticky by default
      wait: false,
      sound: false,
    })
  })

  it('should strip ANSI color codes from matched text', () => {
    const ansiText = '\x1b[31mRed Text\x1b[0m'
    const match = createMatchWithNotification(
      {
        patternId: 'ansi-pattern',
        patternTitle: 'ANSI Pattern',
        response: '1',
        matchedText: ansiText,
        bufferContent: `Buffer with ${ansiText}`,
        strippedBufferContent: 'Buffer with Red Text',
      },
      'Pattern triggered: {{title}}\nMatched: {{matchedText}}',
    )

    showPatternNotification(match, defaultAppConfig, 'Prompted', '❤')

    // The template utils should handle stripping ANSI codes
    expect(mockNotify).toHaveBeenCalledWith({
      title: '🤖 Claude Composer',
      message: 'Pattern triggered: ANSI Pattern\nMatched: Red Text',
      timeout: 86400, // prompted confirmations are sticky by default
      wait: false,
      sound: false,
    })
  })

  it('should not show notification when notification property is not set', () => {
    const match: MatchResult = {
      patternId: 'no-notify',
      patternTitle: 'No Notification',
      response: '1',
      matchedText: 'test',
      bufferContent: 'buffer',
      strippedBufferContent: 'buffer',
      // No notification property
    }

    showPatternNotification(match, defaultAppConfig, undefined, undefined)

    expect(mockNotify).not.toHaveBeenCalled()
  })
})
