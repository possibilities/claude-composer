import { describe, it, expect } from 'vitest'
import { createAppReadyPattern } from '../../src/patterns/registry'

describe('App Ready Pattern', () => {
  const mockGetAppConfig = () => ({
    pipedInputPath: undefined,
    mode: undefined,
  })
  const appReadyPattern = createAppReadyPattern(mockGetAppConfig)

  it('should have correct pattern configuration', () => {
    expect(appReadyPattern.id).toBe('app-ready-handler')
    expect(appReadyPattern.title).toBe('App ready handler')
    expect(appReadyPattern.pattern).toEqual(['? for shortcuts'])
    expect(appReadyPattern.triggerText).toBe('? for shortcuts')
  })

  it('should have a response function', () => {
    expect(appReadyPattern.response).toBeDefined()
    expect(typeof appReadyPattern.response).toBe('function')
  })

  it('should return undefined when no piped input path', () => {
    const response = appReadyPattern.response as () => string[] | undefined
    const result = response()
    expect(result).toBeUndefined()
  })

  it('should return shift-tab commands when in plan mode', () => {
    const mockConfigWithPlanMode = () => ({
      pipedInputPath: undefined,
      mode: 'plan',
    })
    const planModePattern = createAppReadyPattern(mockConfigWithPlanMode)
    const response = planModePattern.response as () =>
      | (string | number)[]
      | undefined
    const result = response()
    expect(result).toEqual(['\x1b[Z', 100, '\x1b[Z'])
  })
})
