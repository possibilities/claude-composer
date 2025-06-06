import { describe, it, expect, beforeEach, vi, MockedFunction } from 'vitest'
import { ResponseQueue } from '../../src/core/response-queue'
import * as pty from '@homebridge/node-pty-prebuilt-multiarch'
import { ChildProcess } from 'child_process'
import { Writable } from 'stream'

vi.mock('@homebridge/node-pty-prebuilt-multiarch')

describe('ResponseQueue', () => {
  let queue: ResponseQueue
  let mockPty: pty.IPty
  let mockChildProcess: ChildProcess
  let mockStdin: Writable

  beforeEach(() => {
    vi.clearAllMocks()
    vi.useFakeTimers()

    mockPty = {
      write: vi.fn(),
      kill: vi.fn(),
      resize: vi.fn(),
      onData: vi.fn(),
      onExit: vi.fn(),
      process: '',
      pid: 1234,
    } as unknown as pty.IPty

    mockStdin = {
      write: vi.fn((data, callback) => {
        if (callback) callback()
        return true
      }),
    } as unknown as Writable

    mockChildProcess = {
      stdin: mockStdin,
      kill: vi.fn(),
      pid: 5678,
    } as unknown as ChildProcess

    queue = new ResponseQueue()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  describe('Target Management', () => {
    it('should initialize without targets', () => {
      expect(queue.getQueueLength()).toBe(0)
      expect(queue.isProcessing()).toBe(false)
    })

    it('should set pty target', async () => {
      queue.setTargets(mockPty, undefined)
      queue.enqueue('test')
      await vi.runAllTimersAsync()
      expect(mockPty.write).toHaveBeenCalledWith('test')
    })

    it('should set child process target', async () => {
      queue.setTargets(undefined, mockChildProcess)
      queue.enqueue('test')
      await vi.runAllTimersAsync()
      expect(mockStdin.write).toHaveBeenCalledWith('test')
    })

    it('should update targets', async () => {
      queue.setTargets(mockPty, undefined)
      queue.setTargets(undefined, mockChildProcess)
      queue.enqueue('test')
      await vi.runAllTimersAsync()
      expect(mockPty.write).not.toHaveBeenCalled()
      expect(mockStdin.write).toHaveBeenCalledWith('test')
    })

    it('should handle initialization with targets', async () => {
      const queueWithTargets = new ResponseQueue(mockPty, mockChildProcess)
      queueWithTargets.enqueue('test')
      await vi.runAllTimersAsync()
      expect(mockPty.write).toHaveBeenCalledWith('test')
    })
  })

  describe('Basic Queue Operations', () => {
    beforeEach(() => {
      queue.setTargets(mockPty, undefined)
    })

    it('should enqueue and process single response', async () => {
      queue.enqueue('hello')

      await vi.runAllTimersAsync()

      expect(mockPty.write).toHaveBeenCalledWith('hello')
      expect(queue.getQueueLength()).toBe(0)
    })

    it('should process multiple responses in order', async () => {
      queue.enqueue('first')
      queue.enqueue('second')
      queue.enqueue('third')

      await vi.runAllTimersAsync()

      expect(mockPty.write).toHaveBeenCalledTimes(3)
      expect(mockPty.write).toHaveBeenNthCalledWith(1, 'first')
      expect(mockPty.write).toHaveBeenNthCalledWith(2, 'second')
      expect(mockPty.write).toHaveBeenNthCalledWith(3, 'third')
    })

    it('should handle array responses', async () => {
      queue.enqueue(['line1', 'line2', 'line3'])

      await vi.runAllTimersAsync()

      expect(mockPty.write).toHaveBeenCalledTimes(3)
      expect(mockPty.write).toHaveBeenNthCalledWith(1, 'line1')
      expect(mockPty.write).toHaveBeenNthCalledWith(2, 'line2')
      expect(mockPty.write).toHaveBeenNthCalledWith(3, 'line3')
    })

    it('should clear queue', () => {
      queue.enqueue('first')
      queue.enqueue('second')

      queue.clear()
      expect(queue.getQueueLength()).toBe(0)
    })
  })

  describe('Delay Handling', () => {
    beforeEach(() => {
      queue.setTargets(mockPty, undefined)
    })

    it('should respect delay before sending response', async () => {
      queue.enqueue('delayed', 1000)

      vi.advanceTimersByTime(999)
      expect(mockPty.write).not.toHaveBeenCalled()

      vi.advanceTimersByTime(1)
      await vi.runAllTimersAsync()
      expect(mockPty.write).toHaveBeenCalledWith('delayed')
    })

    it('should handle zero delay', async () => {
      queue.enqueue('immediate', 0)

      await vi.runAllTimersAsync()
      expect(mockPty.write).toHaveBeenCalledWith('immediate')
    })

    it('should process items with different delays in order', async () => {
      queue.enqueue('first', 100)
      queue.enqueue('second', 200)
      queue.enqueue('third', 50)

      await vi.runAllTimersAsync()

      expect(mockPty.write).toHaveBeenNthCalledWith(1, 'first')
      expect(mockPty.write).toHaveBeenNthCalledWith(2, 'second')
      expect(mockPty.write).toHaveBeenNthCalledWith(3, 'third')
    })
  })

  describe('Processing State', () => {
    beforeEach(() => {
      queue.setTargets(mockPty, undefined)
    })

    it('should track processing state', async () => {
      expect(queue.isProcessing()).toBe(false)

      queue.enqueue('test', 100)
      expect(queue.isProcessing()).toBe(true)

      await vi.runAllTimersAsync()
      expect(queue.isProcessing()).toBe(false)
    })

    it('should not start multiple processing loops', async () => {
      queue.enqueue('first', 100)
      const processingAfterFirst = queue.isProcessing()

      queue.enqueue('second', 100)
      const processingAfterSecond = queue.isProcessing()

      expect(processingAfterFirst).toBe(true)
      expect(processingAfterSecond).toBe(true)
    })
  })

  describe('Edge Cases', () => {
    it('should handle no targets gracefully', async () => {
      queue.enqueue('test')
      await vi.runAllTimersAsync()
      expect(mockPty.write).not.toHaveBeenCalled()
      expect(mockStdin.write).not.toHaveBeenCalled()
    })

    it('should handle child process without stdin', async () => {
      const processWithoutStdin = {
        stdin: null,
        kill: vi.fn(),
        pid: 9999,
      } as unknown as ChildProcess

      queue.setTargets(undefined, processWithoutStdin)
      queue.enqueue('test')

      await vi.runAllTimersAsync()
    })

    it('should handle empty string responses', async () => {
      queue.setTargets(mockPty, undefined)
      queue.enqueue('')

      await vi.runAllTimersAsync()
      expect(mockPty.write).toHaveBeenCalledWith('')
    })

    it('should handle empty array responses', async () => {
      queue.setTargets(mockPty, undefined)
      queue.enqueue([])

      await vi.runAllTimersAsync()
      expect(mockPty.write).not.toHaveBeenCalled()
    })

    it('should generate unique IDs for queued responses', () => {
      const queue1 = new ResponseQueue()
      const queue2 = new ResponseQueue()

      const originalNow = Date.now
      const originalRandom = Math.random

      Date.now = vi.fn(() => 1000)
      Math.random = vi.fn(() => 0.5)

      queue1.enqueue('test1')

      Date.now = vi.fn(() => 2000)
      Math.random = vi.fn(() => 0.7)

      queue2.enqueue('test2')

      Date.now = originalNow
      Math.random = originalRandom
    })
  })
})
