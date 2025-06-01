import { describe, it, expect, beforeEach, vi } from 'vitest'
import { MatchResult } from '../src/patterns/matcher'
import stripAnsi from 'strip-ansi'

vi.mock('node-notifier', () => ({
  default: {
    notify: vi.fn(),
  },
}))

import notifier from 'node-notifier'
const mockNotify = vi.mocked(notifier.notify)

describe('Notification filtering by action type', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should only show notifications for input action type patterns', () => {
    // Test matches with different action types
    const inputMatch: MatchResult = {
      patternId: 'edit-file-prompt',
      patternTitle: 'Edit File',
      response: '1',
      matchedText: 'Edit file prompt',
      bufferContent: 'buffer',
      strippedBufferContent: 'buffer',
    }

    const logMatch: MatchResult = {
      patternId: 'edit-file-log',
      patternTitle: 'Edit File Log',
      response: { type: 'log', path: '/tmp/test.log' },
      matchedText: 'Edit file prompt',
      bufferContent: 'buffer',
      strippedBufferContent: 'buffer',
    }

    // Simulate the notification logic from cli.ts
    const showNotificationForMatch = (
      match: MatchResult,
      showNotifications: boolean,
    ) => {
      // Check if response is a simple string/array (input type) vs object (log type)
      const isInputPattern =
        typeof match.response === 'string' || Array.isArray(match.response)
      if (showNotifications && isInputPattern) {
        const projectName = 'test-project'
        const title = '🤖 Claude Composer'
        const message = `Project: ${projectName}\nPattern triggered: ${match.patternId}`

        notifier.notify({
          title,
          message,
          wait: false,
          sound: false,
          timeout: 5000,
        })
      }
    }

    // Test with notifications enabled
    showNotificationForMatch(inputMatch, true)
    showNotificationForMatch(logMatch, true)

    // Should only have been called once for the input match
    expect(mockNotify).toHaveBeenCalledTimes(1)
    expect(mockNotify).toHaveBeenCalledWith({
      title: '🤖 Claude Composer',
      message: 'Project: test-project\nPattern triggered: edit-file-prompt',
      wait: false,
      sound: false,
      timeout: 5000,
    })

    // Clear mocks
    mockNotify.mockClear()

    // Test with notifications disabled
    showNotificationForMatch(inputMatch, false)
    showNotificationForMatch(logMatch, false)

    // Should not have been called when notifications are disabled
    expect(mockNotify).not.toHaveBeenCalled()
  })

  it('should handle multiple input patterns correctly', () => {
    const matches: MatchResult[] = [
      {
        patternId: 'edit-file-prompt',
        patternTitle: 'Edit File',
        response: '1',
        matchedText: 'Edit file',
        bufferContent: 'buffer',
        strippedBufferContent: 'buffer',
      },
      {
        patternId: 'create-file-prompt',
        patternTitle: 'Create File',
        response: '1',
        matchedText: 'Create file',
        bufferContent: 'buffer',
        strippedBufferContent: 'buffer',
      },
      {
        patternId: 'edit-file-log',
        patternTitle: 'Edit File Log',
        response: { type: 'log', path: '/tmp/edit.log' },
        matchedText: 'Edit file',
        bufferContent: 'buffer',
        strippedBufferContent: 'buffer',
      },
      {
        patternId: 'create-file-log',
        patternTitle: 'Create File Log',
        response: { type: 'log', path: '/tmp/create.log' },
        matchedText: 'Create file',
        bufferContent: 'buffer',
        strippedBufferContent: 'buffer',
      },
    ]

    // Simulate processing matches
    const processMatches = (
      matches: MatchResult[],
      showNotifications: boolean,
    ) => {
      for (const match of matches) {
        // Check if response is a simple string/array (input type) vs object (log type)
        const isInputPattern =
          typeof match.response === 'string' || Array.isArray(match.response)
        if (showNotifications && isInputPattern) {
          const projectName = 'test-project'
          const title = '🤖 Claude Composer'
          const message = `Project: ${projectName}\nPattern triggered: ${match.patternId}`

          notifier.notify({
            title,
            message,
            wait: false,
            sound: false,
            timeout: 5000,
          })
        }
      }
    }

    processMatches(matches, true)

    // Should only be called for the two input action matches
    expect(mockNotify).toHaveBeenCalledTimes(2)
    expect(mockNotify).toHaveBeenNthCalledWith(1, {
      title: '🤖 Claude Composer',
      message: 'Project: test-project\nPattern triggered: edit-file-prompt',
      wait: false,
      sound: false,
      timeout: 5000,
    })
    expect(mockNotify).toHaveBeenNthCalledWith(2, {
      title: '🤖 Claude Composer',
      message: 'Project: test-project\nPattern triggered: create-file-prompt',
      wait: false,
      sound: false,
      timeout: 5000,
    })
  })
})
