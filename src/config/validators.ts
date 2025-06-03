import { z } from 'zod'
import { PatternConfig, patternConfigSchema } from './schemas'
import { PatternConfigError, formatZodError } from './errors'

/**
 * Result of pattern validation
 */
export interface PatternValidationResult {
  valid: boolean
  errors?: string[]
  pattern?: PatternConfig
}

/**
 * Validate a single pattern configuration
 */
export function validatePattern(pattern: unknown): PatternValidationResult {
  try {
    const result = patternConfigSchema.safeParse(pattern)

    if (!result.success) {
      return {
        valid: false,
        errors: result.error.errors.map(
          err => `${err.path.join('.')}: ${err.message}`,
        ),
      }
    }

    const validatedPattern = result.data
    const errors: string[] = []
    if (validatedPattern.patterns) {
      for (let i = 0; i < validatedPattern.patterns.length; i++) {
        try {
          new RegExp(validatedPattern.patterns[i])
        } catch (e) {
          errors.push(`patterns[${i}]: Invalid regular expression`)
        }
      }
    }

    if (
      validatedPattern.type === 'confirmation' &&
      !validatedPattern.triggerText
    ) {
      errors.push('triggerText is required for confirmation-type patterns')
    }
    if (
      validatedPattern.type === 'expansion' &&
      !validatedPattern.responseOptions?.length
    ) {
      errors.push(
        'responseOptions must not be empty for expansion-type patterns',
      )
    }

    if (errors.length > 0) {
      return { valid: false, errors }
    }

    return { valid: true, pattern: validatedPattern }
  } catch (error) {
    return {
      valid: false,
      errors: [`Unexpected error during validation: ${error}`],
    }
  }
}

/**
 * Validate multiple patterns and return only valid ones
 */
export function validatePatterns(patterns: unknown[]): {
  valid: PatternConfig[]
  invalid: Array<{ pattern: unknown; errors: string[] }>
} {
  const valid: PatternConfig[] = []
  const invalid: Array<{ pattern: unknown; errors: string[] }> = []

  for (const pattern of patterns) {
    const result = validatePattern(pattern)
    if (result.valid && result.pattern) {
      valid.push(result.pattern)
    } else {
      invalid.push({
        pattern,
        errors: result.errors || ['Unknown validation error'],
      })
    }
  }

  return { valid, invalid }
}

/**
 * Strict validation that throws on any errors
 */
export function validatePatternStrict(
  pattern: unknown,
  patternId?: string,
): PatternConfig {
  const result = validatePattern(pattern)

  if (!result.valid || !result.pattern) {
    const id = patternId || (pattern as any)?.id || 'unknown'
    const errorMessage = result.errors?.join('; ') || 'Unknown validation error'
    throw new PatternConfigError(id, errorMessage)
  }

  return result.pattern
}

/**
 * Validate MCP (Model Context Protocol) configuration
 */
export const mcpConfigSchema = z.object({
  servers: z
    .record(
      z.object({
        command: z.string(),
        args: z.array(z.string()).optional(),
        env: z.record(z.string()).optional(),
        disabled: z.boolean().optional(),
      }),
    )
    .optional(),
})

export type McpConfig = z.infer<typeof mcpConfigSchema>

/**
 * Validate MCP configuration with better error messages
 */
export function validateMcpConfig(config: unknown): McpConfig {
  const result = mcpConfigSchema.safeParse(config)

  if (!result.success) {
    throw new Error(
      `Invalid MCP configuration: ${formatZodError(result.error)}`,
    )
  }

  return result.data
}

/**
 * Configuration precedence levels
 */
export enum ConfigPrecedence {
  DEFAULT = 0,
  CONFIG_FILE = 1,
  ENVIRONMENT = 2,
  CLI_FLAG = 3,
}

/**
 * Merge configurations based on precedence
 */
export function mergeConfigs<T extends Record<string, any>>(
  configs: Array<{ config: Partial<T>; precedence: ConfigPrecedence }>,
): T {
  const sorted = configs.sort((a, b) => a.precedence - b.precedence)
  return sorted.reduce((merged, { config }) => {
    return { ...merged, ...config }
  }, {} as T)
}
