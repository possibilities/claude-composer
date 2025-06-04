import { describe, it, expect } from 'vitest'
import { appStartedPattern } from '../../src/patterns/registry'

describe('App Started Pattern', () => {
  it('should have correct pattern configuration', () => {
    expect(appStartedPattern.id).toBe('app-started')
    expect(appStartedPattern.title).toBe('App started')
    expect(appStartedPattern.type).toBe('confirmation')
    expect(appStartedPattern.pattern).toEqual(['? for shortcuts'])
    expect(appStartedPattern.triggerText).toBe('? for shortcuts')
  })

  it('should have a response function', () => {
    expect(appStartedPattern.response).toBeDefined()
    expect(typeof appStartedPattern.response).toBe('function')
  })

  it('should return an array with two elements from response function', () => {
    const response = appStartedPattern.response as () => string[]
    const result = response()
    expect(Array.isArray(result)).toBe(true)
    expect(result).toHaveLength(2)
    expect(result[1]).toBe('\r')
  })

  it('should return a message starting with # as first element', () => {
    const response = appStartedPattern.response as () => string[]
    const result = response()
    expect(result[0]).toMatch(/^#/)
  })
})
