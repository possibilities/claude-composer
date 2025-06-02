import { z } from 'zod'
import { ENV_VARS } from './paths'

/**
 * Environment configuration schema
 */
const envSchema = z.object({
  configDir: z.string().optional(),
  appPath: z.string().optional(),
  patternsPath: z.string().optional(),
  nodeEnv: z.string().optional(),
  home: z.string(),
  pwd: z.string().optional(),
  forceColor: z.string().optional(),
  term: z.string().optional(),
  mockEnv: z.string().optional(),
})

export type EnvironmentConfig = z.infer<typeof envSchema>

/**
 * Error thrown when environment validation fails
 */
export class EnvironmentValidationError extends Error {
  constructor(public errors: z.ZodError) {
    super('Invalid environment configuration')
    this.name = 'EnvironmentValidationError'
  }
}

/**
 * Parse and validate environment variables
 */
export function parseEnvironment(): EnvironmentConfig {
  const rawEnv = {
    configDir: process.env[ENV_VARS.CONFIG_DIR],
    appPath: process.env[ENV_VARS.APP_PATH],
    patternsPath: process.env[ENV_VARS.PATTERNS_PATH],
    nodeEnv: process.env[ENV_VARS.NODE_ENV],
    home: process.env[ENV_VARS.HOME] || process.env.HOME || os.homedir(),
    pwd: process.env[ENV_VARS.PWD],
    forceColor: process.env[ENV_VARS.FORCE_COLOR],
    term: process.env[ENV_VARS.TERM],
    mockEnv: process.env[ENV_VARS.MOCK_ENV],
  }

  const result = envSchema.safeParse(rawEnv)
  if (!result.success) {
    throw new EnvironmentValidationError(result.error)
  }

  return result.data
}

/**
 * Check if running in test environment
 */
export function isTestEnvironment(): boolean {
  return process.env[ENV_VARS.NODE_ENV] === 'test'
}

/**
 * Check if running in development environment
 */
export function isDevelopmentEnvironment(): boolean {
  return process.env[ENV_VARS.NODE_ENV] === 'development'
}

/**
 * Get the Claude app path with fallback to default
 */
export function getClaudeAppPath(env?: EnvironmentConfig): string {
  const config = env || parseEnvironment()
  if (config.appPath) {
    return config.appPath
  }

  const { CLAUDE_PATHS } = require('./paths')
  return CLAUDE_PATHS.getDefaultAppPath()
}

import * as os from 'node:os'
