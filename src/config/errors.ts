import { z } from 'zod'

/**
 * Base error for all configuration-related errors
 */
export class ConfigurationError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message)
    this.name = 'ConfigurationError'
  }
}

/**
 * Error thrown when configuration file is not found
 */
export class ConfigFileNotFoundError extends ConfigurationError {
  constructor(public readonly filePath: string) {
    super(`Configuration file not found: ${filePath}`, 'CONFIG_FILE_NOT_FOUND')
  }
}

/**
 * Error thrown when configuration validation fails
 */
export class ConfigValidationError extends ConfigurationError {
  constructor(
    public readonly errors: z.ZodError,
    public readonly configPath?: string,
  ) {
    const errorMessages = errors.errors
      .map(err => `  • ${err.path.join('.')}: ${err.message}`)
      .join('\n')

    const message = configPath
      ? `Invalid configuration in ${configPath}\n\nValidation errors:\n${errorMessages}`
      : `Invalid configuration\n\nValidation errors:\n${errorMessages}`

    super(message, 'CONFIG_VALIDATION_FAILED')
  }
}

/**
 * Error thrown when pattern configuration is invalid
 */
export class PatternConfigError extends ConfigurationError {
  constructor(
    public readonly patternId: string,
    public readonly error: string,
  ) {
    super(
      `Invalid pattern configuration for "${patternId}": ${error}`,
      'PATTERN_CONFIG_ERROR',
    )
  }
}

/**
 * Error thrown when toolset configuration is invalid
 */
export class ToolsetConfigError extends ConfigurationError {
  constructor(
    public readonly toolsetName: string,
    public readonly error: string,
  ) {
    super(
      `Invalid toolset configuration for "${toolsetName}": ${error}`,
      'TOOLSET_CONFIG_ERROR',
    )
  }
}

/**
 * Format Zod errors for display
 */
export function formatZodError(error: z.ZodError): string {
  return error.errors
    .map(err => `${err.path.join('.')}: ${err.message}`)
    .join(', ')
}
