import { describe, it, expect } from 'vitest'
import { createPipedInputPattern } from '../../src/patterns/registry'

describe('Pipe on App Ready Pattern', () => {
  const mockGetPipedInputPath = () => undefined
  const pipeOnAppReadyPattern = createPipedInputPattern(mockGetPipedInputPath)

  it('should have correct pattern configuration', () => {
    expect(pipeOnAppReadyPattern.id).toBe('pipe-on-app-ready')
    expect(pipeOnAppReadyPattern.title).toBe('Pipe on app ready')
    expect(pipeOnAppReadyPattern.pattern).toEqual(['? for shortcuts'])
    expect(pipeOnAppReadyPattern.triggerText).toBe('? for shortcuts')
  })

  it('should have a response function', () => {
    expect(pipeOnAppReadyPattern.response).toBeDefined()
    expect(typeof pipeOnAppReadyPattern.response).toBe('function')
  })

  it('should return an array with two elements from response function', () => {
    const response = pipeOnAppReadyPattern.response as () => string[]
    const result = response()
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(2)
    expect(result[1]).toBe('\r')
  })

  it('should return a message starting with # as first element', () => {
    const response = pipeOnAppReadyPattern.response as () => string[]
    const result = response()
    expect(result[0]).toMatch(/^#/)
  })
})
