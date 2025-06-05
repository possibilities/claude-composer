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

  it('should return an empty array when no piped input path', () => {
    const response = pipeOnAppReadyPattern.response as () => string[]
    const result = response()
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(0)
  })

  it('should return empty array when piped input path is undefined', () => {
    const response = pipeOnAppReadyPattern.response as () => string[]
    const result = response()
    expect(result).toEqual([])
  })
})
