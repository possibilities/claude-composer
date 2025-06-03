import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { ActivityMonitor } from '../../src/core/activity-monitor'
import * as notifications from '../../src/utils/notifications'
import { setupTestConfig } from '../utils/test-setup'
import * as fs from 'fs'
import * as path from 'node:path'

vi.mock('../../src/utils/notifications')

describe('ActivityMonitor', () => {
  let monitor: ActivityMonitor
  let mockShowNotification: ReturnType<typeof vi.fn>
  let testSetup: { configDir: string; cleanup: () => void }

  beforeEach(() => {
    vi.useFakeTimers()
    mockShowNotification = vi.fn()
    vi.mocked(notifications.showNotification).mockImplementation(
      mockShowNotification,
    )

    testSetup = setupTestConfig()
    process.env.CLAUDE_COMPOSER_CONFIG_DIR = testSetup.configDir

    const mockConfig = {
      show_notifications: true,
    }
    monitor = new ActivityMonitor(mockConfig as any)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    testSetup.cleanup()
    delete process.env.CLAUDE_COMPOSER_CONFIG_DIR
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
      // Check that notification was shown (could be either regular or record-breaking)
      expect(mockShowNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringMatching(
            /Claude Composer is done working|record|best|achievement|smashed/i,
          ),
        }),
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
        {
          message: expect.stringMatching(
            /Claude Composer is done working[\s\S]*Duration:/i,
          ),
        },
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
            /Claude Composer is done working\nProject: .+\nDuration: .+/,
          ),
        },
        mockConfig,
      )
    })
  })

  describe('Activity duration tracking', () => {
    it('should track activity duration and save to file', () => {
      const snapshotWithText =
        'Press ENTER to continue or Ctrl+C to interrupt) waiting...'
      const snapshotWithoutText = 'Working... processing data...'

      // Start activity
      monitor.checkSnapshot(snapshotWithText)
      vi.advanceTimersByTime(1100)
      monitor.checkSnapshot(snapshotWithText)

      // Activity continues for 5 seconds total
      vi.advanceTimersByTime(3900)
      monitor.checkSnapshot(snapshotWithText)

      // Activity ends
      monitor.checkSnapshot(snapshotWithoutText)
      vi.advanceTimersByTime(2100)
      monitor.checkSnapshot(snapshotWithoutText)

      // Check that the record was saved
      const recordPath = path.join(testSetup.configDir, 'activity-records.json')
      expect(fs.existsSync(recordPath)).toBe(true)

      const record = JSON.parse(fs.readFileSync(recordPath, 'utf-8'))
      // Total duration is 1100 + 3900 + 2100 = 7100ms
      expect(record.longestDurationMs).toBeGreaterThanOrEqual(7000)
      expect(record.longestDurationMs).toBeLessThan(7200)
    })

    it('should show special notification when breaking duration record', () => {
      const snapshotWithText =
        'Press ENTER to continue or Ctrl+C to interrupt) waiting...'
      const snapshotWithoutText = 'Working... processing data...'

      // First activity - 3 seconds
      monitor.checkSnapshot(snapshotWithText)
      vi.advanceTimersByTime(1100)
      monitor.checkSnapshot(snapshotWithText)
      vi.advanceTimersByTime(1900)
      monitor.checkSnapshot(snapshotWithText)
      monitor.checkSnapshot(snapshotWithoutText)
      vi.advanceTimersByTime(2100)
      monitor.checkSnapshot(snapshotWithoutText)

      expect(mockShowNotification).toHaveBeenCalledOnce()
      mockShowNotification.mockClear()

      // Reset for second activity
      monitor.reset()

      // Second activity - 15 seconds (new record, > 10s threshold)
      monitor.checkSnapshot(snapshotWithText)
      vi.advanceTimersByTime(1100)
      monitor.checkSnapshot(snapshotWithText)
      vi.advanceTimersByTime(13900)
      monitor.checkSnapshot(snapshotWithText)
      monitor.checkSnapshot(snapshotWithoutText)
      vi.advanceTimersByTime(2100)
      monitor.checkSnapshot(snapshotWithoutText)

      // Should show record-breaking notification with emoji and duration
      expect(mockShowNotification).toHaveBeenCalledOnce()
      const call = mockShowNotification.mock.calls[0]
      expect(call[0].message).toMatch(/[🎉🚀⚡🌟🏆🎊💫✨]/)
      expect(call[0].message).toMatch(/record|best|achievement|smashed/i)
      // The total duration includes persistence check time
      expect(call[0].message).toMatch(/1[5-7]s/)
      expect(call[0].sound).toBe(true)
    })

    it('should not show record notification when notify_work_complete is false', () => {
      const snapshotWithText =
        'Press ENTER to continue or Ctrl+C to interrupt) waiting...'
      const snapshotWithoutText = 'Working... processing data...'
      const mockConfig = {
        show_notifications: true,
        notify_work_complete: false,
      }

      const customMonitor = new ActivityMonitor(mockConfig as any)

      // Activity that would break record
      customMonitor.checkSnapshot(snapshotWithText)
      vi.advanceTimersByTime(1100)
      customMonitor.checkSnapshot(snapshotWithText)
      vi.advanceTimersByTime(8900)
      customMonitor.checkSnapshot(snapshotWithText)
      customMonitor.checkSnapshot(snapshotWithoutText)
      vi.advanceTimersByTime(2100)
      customMonitor.checkSnapshot(snapshotWithoutText)

      // Should not show any notification
      expect(mockShowNotification).not.toHaveBeenCalled()
    })

    it('should handle missing activity start time gracefully', () => {
      const snapshotWithText =
        'Press ENTER to continue or Ctrl+C to interrupt) waiting...'
      const snapshotWithoutText = 'Working... processing data...'

      // Manually create persistent state without proper start time
      monitor.checkSnapshot(snapshotWithText)
      vi.advanceTimersByTime(1100)
      monitor.checkSnapshot(snapshotWithText)

      // Reset activity start time to simulate edge case
      ;(monitor as any).activityStartTime = null

      // End activity
      monitor.checkSnapshot(snapshotWithoutText)
      vi.advanceTimersByTime(2100)
      monitor.checkSnapshot(snapshotWithoutText)

      // Should still show regular notification (without duration since start time is missing)
      expect(mockShowNotification).toHaveBeenCalledOnce()
      expect(mockShowNotification).toHaveBeenCalledWith(
        { message: expect.stringContaining('Claude Composer is done working') },
        expect.any(Object),
      )
    })

    it('should format duration correctly for different time spans', () => {
      const snapshotWithText =
        'Press ENTER to continue or Ctrl+C to interrupt) waiting...'
      const snapshotWithoutText = 'Working... processing data...'

      // First set a small record
      monitor.checkSnapshot(snapshotWithText)
      vi.advanceTimersByTime(1100)
      monitor.checkSnapshot(snapshotWithText)
      vi.advanceTimersByTime(14000) // 15 seconds total
      monitor.checkSnapshot(snapshotWithText)
      monitor.checkSnapshot(snapshotWithoutText)
      vi.advanceTimersByTime(2100)
      monitor.checkSnapshot(snapshotWithoutText)

      mockShowNotification.mockClear()
      monitor.reset()

      // Test 1h 30m duration (new record)
      monitor.checkSnapshot(snapshotWithText)
      vi.advanceTimersByTime(1100)
      monitor.checkSnapshot(snapshotWithText)
      vi.advanceTimersByTime(5400000 - 1100) // 90 minutes total
      monitor.checkSnapshot(snapshotWithText)
      monitor.checkSnapshot(snapshotWithoutText)
      vi.advanceTimersByTime(2100)
      monitor.checkSnapshot(snapshotWithoutText)

      expect(mockShowNotification).toHaveBeenCalledOnce()
      const call = mockShowNotification.mock.calls[0]
      expect(call[0].message).toMatch(/1h 30m/)
    })
  })
})
