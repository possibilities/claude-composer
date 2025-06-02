import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { TerminalManager } from '../../src/terminal/manager'

describe('Terminal polling', () => {
  let terminalManager: TerminalManager
  let mockCallback: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    mockCallback = vi.fn()
    terminalManager = new TerminalManager()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
    terminalManager.cleanup()
  })

  describe('startTerminalPolling', () => {
    it('should call callback at specified interval', async () => {
      // Mock captureSnapshot to return test data
      vi.spyOn(terminalManager, 'captureSnapshot').mockResolvedValue(
        'test snapshot',
      )

      terminalManager.startTerminalPolling(1000, mockCallback)

      // Should not call immediately
      expect(mockCallback).not.toHaveBeenCalled()

      // After 1 second
      await vi.advanceTimersByTimeAsync(1000)
      expect(mockCallback).toHaveBeenCalledOnce()
      expect(mockCallback).toHaveBeenCalledWith('test snapshot')

      // After 2 seconds
      await vi.advanceTimersByTimeAsync(1000)
      expect(mockCallback).toHaveBeenCalledTimes(2)

      // After 3 seconds
      await vi.advanceTimersByTimeAsync(1000)
      expect(mockCallback).toHaveBeenCalledTimes(3)
    })

    it('should not call callback when captureSnapshot returns null', async () => {
      vi.spyOn(terminalManager, 'captureSnapshot').mockResolvedValue(null)

      terminalManager.startTerminalPolling(500, mockCallback)

      await vi.advanceTimersByTimeAsync(2000)
      expect(mockCallback).not.toHaveBeenCalled()
    })

    it('should clear existing interval when called multiple times', async () => {
      const callback1 = vi.fn()
      const callback2 = vi.fn()
      vi.spyOn(terminalManager, 'captureSnapshot').mockResolvedValue('snapshot')

      // Start first polling
      terminalManager.startTerminalPolling(1000, callback1)
      await vi.advanceTimersByTimeAsync(1000)
      expect(callback1).toHaveBeenCalledOnce()
      expect(callback2).not.toHaveBeenCalled()

      // Start second polling (should stop first)
      terminalManager.startTerminalPolling(500, callback2)
      await vi.advanceTimersByTimeAsync(500)
      expect(callback1).toHaveBeenCalledOnce() // Still only once
      expect(callback2).toHaveBeenCalledOnce()

      // Verify first callback is no longer called
      await vi.advanceTimersByTimeAsync(1000)
      expect(callback1).toHaveBeenCalledOnce() // Still only once
      expect(callback2).toHaveBeenCalledTimes(3) // Called at 500ms intervals
    })

    it('should handle different polling intervals', async () => {
      vi.spyOn(terminalManager, 'captureSnapshot').mockResolvedValue('snapshot')

      // 250ms interval
      terminalManager.startTerminalPolling(250, mockCallback)
      await vi.advanceTimersByTimeAsync(1000)
      expect(mockCallback).toHaveBeenCalledTimes(4)

      mockCallback.mockClear()

      // Change to 2000ms interval
      terminalManager.startTerminalPolling(2000, mockCallback)
      await vi.advanceTimersByTimeAsync(4000)
      expect(mockCallback).toHaveBeenCalledTimes(2)
    })
  })

  describe('stopTerminalPolling', () => {
    it('should stop polling when called', async () => {
      vi.spyOn(terminalManager, 'captureSnapshot').mockResolvedValue('snapshot')

      terminalManager.startTerminalPolling(500, mockCallback)
      await vi.advanceTimersByTimeAsync(1000)
      expect(mockCallback).toHaveBeenCalledTimes(2)

      // Stop polling
      terminalManager.stopTerminalPolling()

      // Advance time - callback should not be called anymore
      await vi.advanceTimersByTimeAsync(2000)
      expect(mockCallback).toHaveBeenCalledTimes(2) // Still only 2
    })

    it('should clear callback reference when stopped', async () => {
      vi.spyOn(terminalManager, 'captureSnapshot').mockResolvedValue('snapshot')

      terminalManager.startTerminalPolling(500, mockCallback)
      await vi.advanceTimersByTimeAsync(500)
      expect(mockCallback).toHaveBeenCalledOnce()

      terminalManager.stopTerminalPolling()

      // Even if we somehow trigger the interval, callback should not be called
      // This tests that the callback reference is cleared
      const state = terminalManager.getTerminalState()
      expect(state.screenReadInterval).toBeUndefined()
    })

    it('should handle stopTerminalPolling when not polling', () => {
      // Should not throw when stopping non-existent polling
      expect(() => terminalManager.stopTerminalPolling()).not.toThrow()
    })
  })

  describe('cleanup integration', () => {
    it('should stop polling when cleanup is called', async () => {
      vi.spyOn(terminalManager, 'captureSnapshot').mockResolvedValue('snapshot')

      terminalManager.startTerminalPolling(500, mockCallback)
      await vi.advanceTimersByTimeAsync(1000)
      expect(mockCallback).toHaveBeenCalledTimes(2)

      // Cleanup should stop polling
      terminalManager.cleanup()

      // Advance time - callback should not be called anymore
      await vi.advanceTimersByTimeAsync(2000)
      expect(mockCallback).toHaveBeenCalledTimes(2)
    })
  })
})
