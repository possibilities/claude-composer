import { describe, it, expect } from 'vitest'
import { validateAppConfig, validateToolsetConfig } from '../src/config/schemas'

describe('Config Validation', () => {
  describe('AppConfig validation', () => {
    it('should accept valid config', () => {
      const result = validateAppConfig({
        show_notifications: true,
        dangerously_dismiss_edit_file_prompts: false,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({
          show_notifications: true,
          dangerously_dismiss_edit_file_prompts: false,
        })
      }
    })

    it('should reject config with invalid field types', () => {
      const result = validateAppConfig({
        show_notifications: 'yes',
        dangerously_dismiss_edit_file_prompts: 123,
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues).toHaveLength(2)
        expect(result.error.issues[0].path).toEqual(['show_notifications'])
        expect(result.error.issues[1].path).toEqual([
          'dangerously_dismiss_edit_file_prompts',
        ])
      }
    })

    it('should reject config with unknown fields', () => {
      const result = validateAppConfig({
        show_notifications: true,
        foo: true,
        bar: 'baz',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(
          result.error.issues.some(issue => issue.code === 'unrecognized_keys'),
        ).toBe(true)
      }
    })

    it('should accept empty config', () => {
      const result = validateAppConfig({})

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({})
      }
    })

    it('should accept config with toolsets array', () => {
      const result = validateAppConfig({
        toolsets: ['core', 'extra'],
        show_notifications: true,
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({
          toolsets: ['core', 'extra'],
          show_notifications: true,
        })
      }
    })

    it('should reject config with invalid toolsets type', () => {
      const result = validateAppConfig({
        toolsets: 'core',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues[0].path).toEqual(['toolsets'])
        expect(result.error.issues[0].message).toContain('array')
      }
    })

    it('should reject config with non-string toolset names', () => {
      const result = validateAppConfig({
        toolsets: ['core', 123, true],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(
          result.error.issues.some(issue => issue.path[0] === 'toolsets'),
        ).toBe(true)
      }
    })
  })

  describe('ToolsetConfig validation', () => {
    it('should accept valid toolset config', () => {
      const result = validateToolsetConfig({
        allowed: ['tool1', 'tool2'],
        disallowed: ['badtool'],
        mcp: {
          server1: { type: 'stdio', command: 'cmd' },
        },
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({
          allowed: ['tool1', 'tool2'],
          disallowed: ['badtool'],
          mcp: {
            server1: { type: 'stdio', command: 'cmd' },
          },
        })
      }
    })

    it('should reject toolset with invalid field types', () => {
      const result = validateToolsetConfig({
        allowed: 'tool1',
        disallowed: [123, 456],
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.issues).toHaveLength(3)
      }
    })

    it('should reject toolset with unknown fields', () => {
      const result = validateToolsetConfig({
        allowed: ['tool1'],
        unknownField: 'value',
      })

      expect(result.success).toBe(false)
      if (!result.success) {
        expect(
          result.error.issues.some(issue => issue.code === 'unrecognized_keys'),
        ).toBe(true)
      }
    })

    it('should accept empty toolset config', () => {
      const result = validateToolsetConfig({})

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual({})
      }
    })

    it('should accept toolset with only mcp config', () => {
      const result = validateToolsetConfig({
        mcp: {
          'commit-composer': {
            type: 'stdio',
            command: 'commit-composer-mcp',
          },
        },
      })

      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.mcp).toBeDefined()
      }
    })
  })
})
