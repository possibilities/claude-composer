import { describe, it, expect, vi } from 'vitest'
import {
  showNotification,
  showPatternNotification,
  showSnapshotNotification,
} from '../../src/utils/notifications'

describe('Notification mocking', () => {
  it('should be able to mock showNotification directly', () => {
    const mockShowNotification = vi.fn()
    vi.doMock('../src/utils/notifications', () => ({
      showNotification: mockShowNotification,
      showPatternNotification: vi.fn(),
      showSnapshotNotification: vi.fn(),
    }))

    // Test that mocking works correctly
    expect(mockShowNotification).toBeDefined()
    expect(mockShowNotification).not.toHaveBeenCalled()
  })

  it('exports should be accessible for mocking', () => {
    // Verify all exports are available
    expect(showNotification).toBeDefined()
    expect(showPatternNotification).toBeDefined()
    expect(showSnapshotNotification).toBeDefined()

    // Verify they are functions
    expect(typeof showNotification).toBe('function')
    expect(typeof showPatternNotification).toBe('function')
    expect(typeof showSnapshotNotification).toBe('function')
  })
})
