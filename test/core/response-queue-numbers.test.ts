import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ResponseQueue } from '../../src/core/response-queue'

describe('ResponseQueue with number pauses', () => {
  let responseQueue: ResponseQueue
  let mockPtyProcess: any

  beforeEach(() => {
    mockPtyProcess = {
      write: vi.fn(),
    }
    responseQueue = new ResponseQueue(mockPtyProcess)
  })

  it('should handle numbers as pause durations', async () => {
    const startTime = Date.now()

    // Enqueue a response with a 100ms pause
    responseQueue.enqueue(['hello', 100, 'world'])

    // Wait for processing to complete
    await new Promise(resolve => setTimeout(resolve, 150))

    const endTime = Date.now()
    const duration = endTime - startTime

    // Check that both strings were written
    expect(mockPtyProcess.write).toHaveBeenCalledTimes(2)
    expect(mockPtyProcess.write).toHaveBeenNthCalledWith(1, 'hello')
    expect(mockPtyProcess.write).toHaveBeenNthCalledWith(2, 'world')

    // Check that the pause was approximately 100ms (allow some margin)
    expect(duration).toBeGreaterThanOrEqual(95)
    expect(duration).toBeLessThan(200)
  })

  it('should handle mixed strings and numbers', async () => {
    responseQueue.enqueue(['a', 50, 'b', 75, 'c'])

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 150))

    expect(mockPtyProcess.write).toHaveBeenCalledTimes(3)
    expect(mockPtyProcess.write).toHaveBeenNthCalledWith(1, 'a')
    expect(mockPtyProcess.write).toHaveBeenNthCalledWith(2, 'b')
    expect(mockPtyProcess.write).toHaveBeenNthCalledWith(3, 'c')
  })

  it('should handle single string response', async () => {
    responseQueue.enqueue('single')

    await new Promise(resolve => setTimeout(resolve, 50))

    expect(mockPtyProcess.write).toHaveBeenCalledTimes(1)
    expect(mockPtyProcess.write).toHaveBeenCalledWith('single')
  })
})
