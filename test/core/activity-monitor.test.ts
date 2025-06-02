import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ActivityMonitor } from '../../src/core/activity-monitor'
import * as notifications from '../../src/utils/notifications'

vi.mock('../../src/utils/notifications')

describe('ActivityMonitor', () => {
  let monitor: ActivityMonitor
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
    monitor = new ActivityMonitor(mockConfig as any)
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
    it('should track persistent presence after 1 second', () => {
      const snapshotWithText =
        'Press ENTER to continue or Ctrl+C to interrupt) waiting...'

      // First appearance
      monitor.checkSnapshot(snapshotWithText)
      expect(mockShowNotification).not.toHaveBeenCalled()

      // Still present after 0.5 seconds
      vi.advanceTimersByTime(500)
      monitor.checkSnapshot(snapshotWithText)
      expect(mockShowNotification).not.toHaveBeenCalled()

      // Still present after 1+ seconds - now considered persistently present
      vi.advanceTimersByTime(600)
      monitor.checkSnapshot(snapshotWithText)
      expect(mockShowNotification).not.toHaveBeenCalled()
    })

    it('should reset persistence tracking if text disappears before 1 second', () => {
      const snapshotWithText =
        'Press ENTER to continue or Ctrl+C to interrupt) waiting...'
      const snapshotWithoutText = 'Working... processing data...'

      // Text appears
      monitor.checkSnapshot(snapshotWithText)

      // Disappears after 0.5 seconds (before persistence threshold)
      vi.advanceTimersByTime(500)
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

      // Make text persistently present (1+ seconds)
      monitor.checkSnapshot(snapshotWithText)
      vi.advanceTimersByTime(1100)
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
        { message: expect.stringContaining('Claude Composer is done working') },
        expect.any(Object),
      )
    })

    it('should not trigger notification if text reappears before 2 second absence', () => {
      const snapshotWithText =
        'Press ENTER to continue or Ctrl+C to interrupt) waiting...'
      const snapshotWithoutText = 'Working... processing data...'

      // Make text persistently present
      monitor.checkSnapshot(snapshotWithText)
      vi.advanceTimersByTime(1100)
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

  describe('Confirmation prompt detection', () => {
    it.skip('should detect confirmation prompt anywhere in snapshot as activity', () => {
      const snapshotWithInterrupt =
        'Press ENTER to continue or Ctrl+C to interrupt) waiting...'
      monitor.checkSnapshot(snapshotWithInterrupt)
      vi.advanceTimersByTime(1100)
      monitor.checkSnapshot(snapshotWithInterrupt)
      const snapshotWithPrompt = `Line 1
Line 2
Line 3
Line 4
Line 5
Line 6
Line 7
Line 8
Line 9
Line 10
Line 11
Line 12
Line 13
Line 14
Line 15
│ ❯ 1. Yes                                             │
│   2. Yes, and don't ask again this session           │
│   3. No, and tell Claude what to do differently      │
╰───────────────────────────────────────────────────────╯
`

      monitor.checkSnapshot(snapshotWithPrompt)
      vi.advanceTimersByTime(100)
      monitor.checkSnapshot(snapshotWithPrompt)

      const snapshotWithoutPrompt = 'Working... processing data...'
      monitor.checkSnapshot(snapshotWithoutPrompt)
      vi.advanceTimersByTime(5000)
      monitor.checkSnapshot(snapshotWithoutPrompt)
      expect(mockShowNotification).not.toHaveBeenCalled()
      vi.advanceTimersByTime(7000)
      monitor.checkSnapshot(snapshotWithoutPrompt)
      expect(mockShowNotification).toHaveBeenCalledOnce()
    })

    it.skip('should maintain activity when switching from interrupt text to confirmation prompt', () => {
      const snapshotWithInterrupt =
        'Press ENTER to continue or Ctrl+C to interrupt) waiting...'
      const snapshotWithPrompt = `Working...
│ Do you want to create file.txt?                      │
│ ❯ 1. Yes                                             │
│   2. Yes, and don't ask again this session           │
│   3. No, and tell Claude what to do differently      │
╰───────────────────────────────────────────────────────╯`
      const snapshotWithoutActivity = 'Done processing.'

      monitor.checkSnapshot(snapshotWithInterrupt)
      vi.advanceTimersByTime(1100)
      monitor.checkSnapshot(snapshotWithInterrupt)

      monitor.checkSnapshot(snapshotWithPrompt)
      vi.advanceTimersByTime(1000)
      monitor.checkSnapshot(snapshotWithPrompt)

      monitor.checkSnapshot(snapshotWithoutActivity)
      vi.advanceTimersByTime(5000)
      monitor.checkSnapshot(snapshotWithoutActivity)
      expect(mockShowNotification).not.toHaveBeenCalled()
      vi.advanceTimersByTime(7000)
      monitor.checkSnapshot(snapshotWithoutActivity)
      expect(mockShowNotification).toHaveBeenCalledOnce()
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

      const customMonitor = new ActivityMonitor(mockConfig as any)

      // Trigger notification
      customMonitor.checkSnapshot(snapshotWithText)
      vi.advanceTimersByTime(2100)
      customMonitor.checkSnapshot(snapshotWithText)
      customMonitor.checkSnapshot(snapshotWithoutText)
      vi.advanceTimersByTime(2100)
      customMonitor.checkSnapshot(snapshotWithoutText)

      expect(mockShowNotification).toHaveBeenCalledWith(
        { message: expect.stringContaining('Claude Composer is done working') },
        mockConfig,
      )
    })

    it('should not show notification when notify_work_complete is false', () => {
      const snapshotWithText =
        'Press ENTER to continue or Ctrl+C to interrupt) waiting...'
      const snapshotWithoutText = 'Working... processing data...'
      const mockConfig = {
        show_notifications: true,
        notify_work_complete: false,
      }

      const customMonitor = new ActivityMonitor(mockConfig as any)

      // Trigger notification
      customMonitor.checkSnapshot(snapshotWithText)
      vi.advanceTimersByTime(2100)
      customMonitor.checkSnapshot(snapshotWithText)
      customMonitor.checkSnapshot(snapshotWithoutText)
      vi.advanceTimersByTime(2100)
      customMonitor.checkSnapshot(snapshotWithoutText)

      expect(mockShowNotification).not.toHaveBeenCalled()
    })

    it('should include project name in notification message', () => {
      const snapshotWithText =
        'Press ENTER to continue or Ctrl+C to interrupt) waiting...'
      const snapshotWithoutText = 'Working... processing data...'
      const mockConfig = {
        show_notifications: true,
        notify_work_complete: true,
      }

      const customMonitor = new ActivityMonitor(mockConfig as any)

      // Trigger notification
      customMonitor.checkSnapshot(snapshotWithText)
      vi.advanceTimersByTime(2100)
      customMonitor.checkSnapshot(snapshotWithText)
      customMonitor.checkSnapshot(snapshotWithoutText)
      vi.advanceTimersByTime(2100)
      customMonitor.checkSnapshot(snapshotWithoutText)

      expect(mockShowNotification).toHaveBeenCalledWith(
        {
          message: expect.stringMatching(
            /Claude Composer is done working\nProject: .+/,
          ),
        },
        mockConfig,
      )
    })
  })
})
