import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { InterruptMonitor } from '../../src/core/interrupt-monitor'
import * as notifications from '../../src/utils/notifications'

vi.mock('../../src/utils/notifications')

describe('InterruptMonitor', () => {
  let monitor: InterruptMonitor
  let mockShowNotification: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    mockShowNotification = vi.fn()
    vi.mocked(notifications.showNotification).mockImplementation(
      mockShowNotification,
    )

    const mockConfig = {
      show_notifications: true,
    }
    monitor = new InterruptMonitor(mockConfig as any)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  describe('Text presence detection', () => {
    it('should detect when target text appears', () => {
      const snapshot = 'Some output... esc to interrupt) more text'
      monitor.checkSnapshot(snapshot)

      // Should not trigger notification yet
      expect(mockShowNotification).not.toHaveBeenCalled()
    })

    it('should detect when target text is not present', () => {
      const snapshot = 'Some output without the trigger text'
      monitor.checkSnapshot(snapshot)

      // Should not trigger notification
      expect(mockShowNotification).not.toHaveBeenCalled()
    })
  })

  describe('Persistence tracking', () => {
    it('should track persistent presence after 2 seconds', () => {
      const snapshotWithText =
        'Press ENTER to continue or Ctrl+C to interrupt) waiting...'

      // First appearance
      monitor.checkSnapshot(snapshotWithText)
      expect(mockShowNotification).not.toHaveBeenCalled()

      // Still present after 1 second
      vi.advanceTimersByTime(1000)
      monitor.checkSnapshot(snapshotWithText)
      expect(mockShowNotification).not.toHaveBeenCalled()

      // Still present after 2+ seconds - now considered persistently present
      vi.advanceTimersByTime(1100)
      monitor.checkSnapshot(snapshotWithText)
      expect(mockShowNotification).not.toHaveBeenCalled()
    })

    it('should reset persistence tracking if text disappears before 2 seconds', () => {
      const snapshotWithText =
        'Press ENTER to continue or Ctrl+C to interrupt) waiting...'
      const snapshotWithoutText = 'Working... processing data...'

      // Text appears
      monitor.checkSnapshot(snapshotWithText)

      // Disappears after 1 second (before persistence threshold)
      vi.advanceTimersByTime(1000)
      monitor.checkSnapshot(snapshotWithoutText)

      // Wait 3 more seconds - should not trigger notification
      vi.advanceTimersByTime(3000)
      monitor.checkSnapshot(snapshotWithoutText)
      expect(mockShowNotification).not.toHaveBeenCalled()
    })
  })

  describe('Notification triggering', () => {
    it('should trigger notification when text absent for 2 seconds after being persistently present', () => {
      const snapshotWithText =
        'Press ENTER to continue or Ctrl+C to interrupt) waiting...'
      const snapshotWithoutText = 'Working... processing data...'

      // Make text persistently present (2+ seconds)
      monitor.checkSnapshot(snapshotWithText)
      vi.advanceTimersByTime(2100)
      monitor.checkSnapshot(snapshotWithText)

      // Text disappears
      monitor.checkSnapshot(snapshotWithoutText)
      expect(mockShowNotification).not.toHaveBeenCalled()

      // Still absent after 1 second
      vi.advanceTimersByTime(1000)
      monitor.checkSnapshot(snapshotWithoutText)
      expect(mockShowNotification).not.toHaveBeenCalled()

      // Still absent after 2+ seconds - should trigger notification
      vi.advanceTimersByTime(1100)
      monitor.checkSnapshot(snapshotWithoutText)
      expect(mockShowNotification).toHaveBeenCalledOnce()
      expect(mockShowNotification).toHaveBeenCalledWith(
        { message: 'Claude Composer is done working' },
        expect.any(Object),
      )
    })

    it('should not trigger notification if text reappears before 2 second absence', () => {
      const snapshotWithText =
        'Press ENTER to continue or Ctrl+C to interrupt) waiting...'
      const snapshotWithoutText = 'Working... processing data...'

      // Make text persistently present
      monitor.checkSnapshot(snapshotWithText)
      vi.advanceTimersByTime(2100)
      monitor.checkSnapshot(snapshotWithText)

      // Text disappears
      monitor.checkSnapshot(snapshotWithoutText)

      // Reappears after 1 second
      vi.advanceTimersByTime(1000)
      monitor.checkSnapshot(snapshotWithText)

      // Wait more time
      vi.advanceTimersByTime(3000)
      monitor.checkSnapshot(snapshotWithText)

      // Should not have triggered notification
      expect(mockShowNotification).not.toHaveBeenCalled()
    })

    it('should only trigger notification once per cycle', () => {
      const snapshotWithText =
        'Press ENTER to continue or Ctrl+C to interrupt) waiting...'
      const snapshotWithoutText = 'Working... processing data...'

      // Make text persistently present
      monitor.checkSnapshot(snapshotWithText)
      vi.advanceTimersByTime(2100)
      monitor.checkSnapshot(snapshotWithText)

      // Text disappears and stays absent
      monitor.checkSnapshot(snapshotWithoutText)
      vi.advanceTimersByTime(2100)
      monitor.checkSnapshot(snapshotWithoutText)

      // First notification
      expect(mockShowNotification).toHaveBeenCalledOnce()

      // Continue checking - should not trigger again
      vi.advanceTimersByTime(5000)
      monitor.checkSnapshot(snapshotWithoutText)
      expect(mockShowNotification).toHaveBeenCalledOnce()
    })

    it('should reset and allow new notification after text reappears and disappears again', () => {
      const snapshotWithText =
        'Press ENTER to continue or Ctrl+C to interrupt) waiting...'
      const snapshotWithoutText = 'Working... processing data...'

      // First cycle - make text persistently present
      monitor.checkSnapshot(snapshotWithText)
      vi.advanceTimersByTime(2100)
      monitor.checkSnapshot(snapshotWithText)

      // Text disappears and triggers notification
      monitor.checkSnapshot(snapshotWithoutText)
      vi.advanceTimersByTime(2100)
      monitor.checkSnapshot(snapshotWithoutText)
      expect(mockShowNotification).toHaveBeenCalledOnce()

      // Text reappears and becomes persistently present again
      monitor.checkSnapshot(snapshotWithText)
      vi.advanceTimersByTime(2100)
      monitor.checkSnapshot(snapshotWithText)

      // Text disappears again
      monitor.checkSnapshot(snapshotWithoutText)
      vi.advanceTimersByTime(2100)
      monitor.checkSnapshot(snapshotWithoutText)

      // Should trigger second notification
      expect(mockShowNotification).toHaveBeenCalledTimes(2)
    })
  })

  describe('Edge cases', () => {
    it('should handle rapid changes between present and absent', () => {
      const snapshotWithText =
        'Press ENTER to continue or Ctrl+C to interrupt) waiting...'
      const snapshotWithoutText = 'Working... processing data...'

      // Rapid alternation
      for (let i = 0; i < 10; i++) {
        monitor.checkSnapshot(
          i % 2 === 0 ? snapshotWithText : snapshotWithoutText,
        )
        vi.advanceTimersByTime(100)
      }

      // Should not trigger notification due to rapid changes
      expect(mockShowNotification).not.toHaveBeenCalled()
    })

    it('should handle empty snapshots', () => {
      monitor.checkSnapshot('')
      vi.advanceTimersByTime(5000)
      monitor.checkSnapshot('')

      expect(mockShowNotification).not.toHaveBeenCalled()
    })

    it('should handle snapshots with partial text matches', () => {
      // Should not match partial text
      const partialSnapshot = 'to interrupt but not the full pattern'
      monitor.checkSnapshot(partialSnapshot)
      vi.advanceTimersByTime(5000)
      monitor.checkSnapshot(partialSnapshot)

      expect(mockShowNotification).not.toHaveBeenCalled()
    })
  })

  describe('Reset functionality', () => {
    it('should reset all state when reset() is called', () => {
      const snapshotWithText =
        'Press ENTER to continue or Ctrl+C to interrupt) waiting...'
      const snapshotWithoutText = 'Working... processing data...'

      // Make text persistently present
      monitor.checkSnapshot(snapshotWithText)
      vi.advanceTimersByTime(2100)
      monitor.checkSnapshot(snapshotWithText)

      // Reset before text disappears
      monitor.reset()

      // Text disappears after reset
      monitor.checkSnapshot(snapshotWithoutText)
      vi.advanceTimersByTime(3000)
      monitor.checkSnapshot(snapshotWithoutText)

      // Should not trigger notification because state was reset
      expect(mockShowNotification).not.toHaveBeenCalled()
    })
  })

  describe('Integration with config', () => {
    it('should pass correct parameters to showNotification', () => {
      const snapshotWithText =
        'Press ENTER to continue or Ctrl+C to interrupt) waiting...'
      const snapshotWithoutText = 'Working... processing data...'
      const mockConfig = {
        show_notifications: true,
        some_other_setting: 'value',
      }

      const customMonitor = new InterruptMonitor(mockConfig as any)

      // Trigger notification
      customMonitor.checkSnapshot(snapshotWithText)
      vi.advanceTimersByTime(2100)
      customMonitor.checkSnapshot(snapshotWithText)
      customMonitor.checkSnapshot(snapshotWithoutText)
      vi.advanceTimersByTime(2100)
      customMonitor.checkSnapshot(snapshotWithoutText)

      expect(mockShowNotification).toHaveBeenCalledWith(
        { message: 'Claude Composer is done working' },
        mockConfig,
      )
    })
  })
})
