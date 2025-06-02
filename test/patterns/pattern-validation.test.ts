import { describe, it, expect } from 'vitest'
import {
  validatePatternConfig,
  validatePatternConfigs,
  parsePatternConfig,
  parsePatternConfigs,
  type PatternConfig,
} from '../../src/config/schemas'

describe('PatternConfig validation', () => {
  describe('validatePatternConfig', () => {
    it('should validate a valid completion pattern', () => {
      const pattern: PatternConfig = {
        id: 'test-completion',
        title: 'Test Completion',
        pattern: ['test pattern'],
        response: 'test response',
        type: 'completion',
      }

      const result = validatePatternConfig(pattern)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(pattern)
      }
    })

    it('should validate a valid prompt pattern', () => {
      const pattern: PatternConfig = {
        id: 'test-prompt',
        title: 'Test Prompt',
        pattern: ['prompt pattern', 'line 2'],
        response: '1',
        type: 'prompt',
        notification: 'Test notification',
        triggerText: 'Test Trigger',
      }

      const result = validatePatternConfig(pattern)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toEqual(pattern)
      }
    })

    it('should validate a pattern with function response', () => {
      const responseFunc = () => ['response1', 'response2']
      const pattern = {
        id: 'test-function',
        title: 'Test Function',
        pattern: ['test'],
        response: responseFunc,
      }

      const result = validatePatternConfig(pattern)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(typeof result.data.response).toBe('function')
        // Test that the function works correctly
        const response = result.data.response as () => string[]
        expect(response()).toEqual(['response1', 'response2'])
      }
    })

    it('should validate a pattern with array response', () => {
      const pattern: PatternConfig = {
        id: 'test-array',
        title: 'Test Array',
        pattern: ['test'],
        response: ['line1', 'line2', 'line3'],
      }

      const result = validatePatternConfig(pattern)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.response).toEqual(['line1', 'line2', 'line3'])
      }
    })

    it('should reject pattern with empty id', () => {
      const pattern = {
        id: '',
        title: 'Test',
        pattern: ['test'],
        response: 'test',
      }

      const result = validatePatternConfig(pattern)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain(
          'Pattern ID cannot be empty',
        )
      }
    })

    it('should reject pattern with empty title', () => {
      const pattern = {
        id: 'test',
        title: '',
        pattern: ['test'],
        response: 'test',
      }

      const result = validatePatternConfig(pattern)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain(
          'Pattern title cannot be empty',
        )
      }
    })

    it('should reject pattern with empty pattern array', () => {
      const pattern = {
        id: 'test',
        title: 'Test',
        pattern: [],
        response: 'test',
      }

      const result = validatePatternConfig(pattern)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain(
          'Pattern must have at least one string',
        )
      }
    })

    it('should reject pattern with invalid type', () => {
      const pattern = {
        id: 'test',
        title: 'Test',
        pattern: ['test'],
        response: 'test',
        type: 'invalid' as any,
      }

      const result = validatePatternConfig(pattern)
      expect(result.success).toBe(false)
    })

    it('should accept pattern without type (optional)', () => {
      const pattern = {
        id: 'test',
        title: 'Test',
        pattern: ['test'],
        response: 'test',
      }

      const result = validatePatternConfig(pattern)
      expect(result.success).toBe(true)
    })

    it('should accept triggerText on prompt type patterns', () => {
      const pattern = {
        id: 'test',
        title: 'Test',
        pattern: ['test'],
        response: 'test',
        type: 'prompt' as const,
        triggerText: 'Trigger text',
      }

      const result = validatePatternConfig(pattern)
      expect(result.success).toBe(true)
    })

    it('should reject triggerText on completion type patterns', () => {
      const pattern = {
        id: 'test',
        title: 'Test',
        pattern: ['test'],
        response: 'test',
        type: 'completion' as const,
        triggerText: 'Should not be allowed',
      }

      const result = validatePatternConfig(pattern)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain(
          'triggerText is only allowed on patterns with type "prompt"',
        )
      }
    })

    it('should reject triggerText on patterns without type', () => {
      const pattern = {
        id: 'test',
        title: 'Test',
        pattern: ['test'],
        response: 'test',
        triggerText: 'Should not be allowed without type',
      }

      const result = validatePatternConfig(pattern)
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.error.errors[0].message).toContain(
          'triggerText is only allowed on patterns with type "prompt"',
        )
      }
    })

    it('should accept patterns without triggerText regardless of type', () => {
      const completionPattern = {
        id: 'test1',
        title: 'Test Completion',
        pattern: ['test'],
        response: 'test',
        type: 'completion' as const,
      }

      const promptPattern = {
        id: 'test2',
        title: 'Test Prompt',
        pattern: ['test'],
        response: 'test',
        type: 'prompt' as const,
      }

      const noTypePattern = {
        id: 'test3',
        title: 'Test No Type',
        pattern: ['test'],
        response: 'test',
      }

      expect(validatePatternConfig(completionPattern).success).toBe(true)
      expect(validatePatternConfig(promptPattern).success).toBe(true)
      expect(validatePatternConfig(noTypePattern).success).toBe(true)
    })
  })

  describe('validatePatternConfigs', () => {
    it('should validate an array of valid patterns', () => {
      const patterns: PatternConfig[] = [
        {
          id: 'pattern1',
          title: 'Pattern 1',
          pattern: ['test1'],
          response: 'response1',
        },
        {
          id: 'pattern2',
          title: 'Pattern 2',
          pattern: ['test2', 'line2'],
          response: ['resp1', 'resp2'],
          type: 'prompt',
        },
      ]

      const result = validatePatternConfigs(patterns)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data).toHaveLength(2)
      }
    })

    it('should reject array with invalid pattern', () => {
      const patterns = [
        {
          id: 'valid',
          title: 'Valid',
          pattern: ['test'],
          response: 'response',
        },
        {
          id: 'invalid',
          title: '', // Invalid empty title
          pattern: ['test'],
          response: 'response',
        },
      ]

      const result = validatePatternConfigs(patterns)
      expect(result.success).toBe(false)
    })
  })

  describe('parsePatternConfig', () => {
    it('should parse valid pattern and throw on invalid', () => {
      const validPattern = {
        id: 'test',
        title: 'Test',
        pattern: ['test'],
        response: 'test',
      }

      expect(() => parsePatternConfig(validPattern)).not.toThrow()

      const invalidPattern = {
        id: 'test',
        title: 'Test',
        pattern: [], // Invalid empty array
        response: 'test',
      }

      expect(() => parsePatternConfig(invalidPattern)).toThrow()
    })
  })
})
