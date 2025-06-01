import { describe, it, expect, beforeEach, vi } from 'vitest'
import {
  showNotification,
  showPatternNotification,
  showSnapshotNotification,
  notifier,
} from '../src/utils/notifications'
import { MatchResult } from '../src/patterns/matcher'
import { AppConfig } from '../src/config/schemas'

vi.mock('node-notifier', () => ({
  default: {
    notify: vi.fn(),
  },
}))

const mockNotify = vi.mocked(notifier.notify)

describe('Sticky notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should use timeout: 86400 when sticky_notifications is true', () => {
    const appConfig: AppConfig = {
      sticky_notifications: true,
    }

    showNotification({ message: 'Test message' }, appConfig)

    expect(mockNotify).toHaveBeenCalledWith({
      title: '🤖 Claude Composer',
      message: 'Test message',
      timeout: 86400, // 24 hours for sticky
      wait: false,
      sound: false,
    })
  })

  it('should use timeout: undefined when sticky_notifications is false', () => {
    const appConfig: AppConfig = {
      sticky_notifications: false,
    }

    showNotification({ message: 'Test message' }, appConfig)

    expect(mockNotify).toHaveBeenCalledWith({
      title: '🤖 Claude Composer',
      message: 'Test message',
      timeout: undefined,
      wait: false,
      sound: false,
    })
  })

  it('should use timeout: undefined when sticky_notifications is not set', () => {
    const appConfig: AppConfig = {}

    showNotification({ message: 'Test message' }, appConfig)

    expect(mockNotify).toHaveBeenCalledWith({
      title: '🤖 Claude Composer',
      message: 'Test message',
      timeout: undefined,
      wait: false,
      sound: false,
    })
  })

  it('should respect sticky setting in pattern notifications', () => {
    const match: MatchResult = {
      patternId: 'test-pattern',
      patternTitle: 'Test Pattern',
      response: '1',
      matchedText: 'test',
      bufferContent: 'buffer',
      strippedBufferContent: 'buffer',
      notification: 'Pattern: {{title}}',
    }

    const stickyConfig: AppConfig = {
      sticky_notifications: true,
    }

    showPatternNotification(match, stickyConfig)

    expect(mockNotify).toHaveBeenCalledWith({
      title: '🤖 Claude Composer',
      message: 'Pattern: Test Pattern',
      timeout: 86400, // 24 hours for sticky
      wait: false,
      sound: false,
    })
  })

  it('should respect sticky setting in snapshot notifications', () => {
    const stickyConfig: AppConfig = {
      sticky_notifications: true,
    }

    showSnapshotNotification('my-project', stickyConfig)

    expect(mockNotify).toHaveBeenCalledWith({
      title: '📸 Claude Composer',
      message:
        'Terminal snapshot saved\nProject: my-project\nPath to snapshot copied to clipboard',
      timeout: 86400, // 24 hours for sticky
      wait: false,
      sound: false,
    })
  })

  it('should allow explicit timeout to override sticky setting', () => {
    const stickyConfig: AppConfig = {
      sticky_notifications: true,
    }

    // Explicit timeout should override the sticky setting
    showNotification({ message: 'Test', timeout: 10 }, stickyConfig)

    expect(mockNotify).toHaveBeenCalledWith({
      title: '🤖 Claude Composer',
      message: 'Test',
      timeout: 10, // Explicit timeout overrides sticky
      wait: false,
      sound: false,
    })
  })
})
