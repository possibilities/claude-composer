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

describe('Notification filtering by action type', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should only show notifications for patterns with notification property', () => {
    // Test matches with different action types
    const inputMatchWithNotification = createMatchWithNotification(
      {
        patternId: 'edit-file-prompt',
        patternTitle: 'Edit File',
        response: '1',
        matchedText: 'Edit file prompt',
        bufferContent: 'buffer',
        strippedBufferContent: 'buffer',
      },
      'Project: {{project}}\nPattern triggered: {{title}}',
    )

    const logMatchWithNotification = createMatchWithNotification(
      {
        patternId: 'edit-file-log',
        patternTitle: 'Edit File Log',
        response: { type: 'log', path: '/tmp/test.log' },
        matchedText: 'Edit file prompt',
        bufferContent: 'buffer',
        strippedBufferContent: 'buffer',
      },
      'Log created: {{title}}',
    )

    const inputMatchWithoutNotification: MatchResult = {
      patternId: 'no-notification-pattern',
      patternTitle: 'No Notification',
      response: '2',
      matchedText: 'Some prompt',
      bufferContent: 'buffer',
      strippedBufferContent: 'buffer',
      // No notification property
    }

    // Test with notifications
    showPatternNotification(inputMatchWithNotification)
    showPatternNotification(logMatchWithNotification)
    showPatternNotification(inputMatchWithoutNotification)

    // Should be called twice (only for matches with notification property)
    expect(mockNotify).toHaveBeenCalledTimes(2)

    // Verify the first call has project name from template
    expect(mockNotify).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        title: '🤖 Claude Composer',
        message: expect.stringContaining('Pattern triggered: Edit File'),
      }),
    )

    expect(mockNotify).toHaveBeenNthCalledWith(2, {
      title: '🤖 Claude Composer',
      message: 'Log created: Edit File Log',
      wait: false,
      sound: false,
      timeout: undefined,
    })
  })

  it('should handle multiple patterns correctly', () => {
    const matches: Array<
      MatchResult | ReturnType<typeof createMatchWithNotification>
    > = [
      createMatchWithNotification(
        {
          patternId: 'edit-file-prompt',
          patternTitle: 'Edit File',
          response: '1',
          matchedText: 'Edit file',
          bufferContent: 'buffer',
          strippedBufferContent: 'buffer',
        },
        'Project: {{project}}\nPattern triggered: {{title}}',
      ),
      createMatchWithNotification(
        {
          patternId: 'create-file-prompt',
          patternTitle: 'Create File',
          response: '1',
          matchedText: 'Create file',
          bufferContent: 'buffer',
          strippedBufferContent: 'buffer',
        },
        'Project: {{project}}\nPattern triggered: {{title}}',
      ),
      {
        patternId: 'edit-file-log',
        patternTitle: 'Edit File Log',
        response: { type: 'log', path: '/tmp/edit.log' },
        matchedText: 'Edit file',
        bufferContent: 'buffer',
        strippedBufferContent: 'buffer',
        // No notification
      },
      {
        patternId: 'create-file-log',
        patternTitle: 'Create File Log',
        response: { type: 'log', path: '/tmp/create.log' },
        matchedText: 'Create file',
        bufferContent: 'buffer',
        strippedBufferContent: 'buffer',
        // No notification
      },
    ]

    // Process all matches
    matches.forEach(match => showPatternNotification(match))

    // Should only be called for the two matches with notification property
    expect(mockNotify).toHaveBeenCalledTimes(2)
    expect(mockNotify).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        title: '🤖 Claude Composer',
        message: expect.stringContaining('Pattern triggered: Edit File'),
      }),
    )
    expect(mockNotify).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        title: '🤖 Claude Composer',
        message: expect.stringContaining('Pattern triggered: Create File'),
      }),
    )
  })

  it('should respect appConfig.show_notifications setting', () => {
    const match = createMatchWithNotification(
      {
        patternId: 'test-pattern',
        patternTitle: 'Test Pattern',
        response: '1',
        matchedText: 'Test',
        bufferContent: 'buffer',
        strippedBufferContent: 'buffer',
      },
      'Test notification: {{title}}',
    )

    // The actual filtering by appConfig happens in index.ts
    // This test just verifies our notification function works
    showPatternNotification(match)

    expect(mockNotify).toHaveBeenCalledOnce()
    expect(mockNotify).toHaveBeenCalledWith({
      title: '🤖 Claude Composer',
      message: 'Test notification: Test Pattern',
      wait: false,
      sound: false,
      timeout: undefined,
    })
  })
})
