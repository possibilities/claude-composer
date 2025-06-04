import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as yaml from 'js-yaml'
import { z } from 'zod'
import {
  validateAppConfig,
  validateToolsetConfig,
  validateRulesetConfig,
  type AppConfig,
  type ToolsetConfig,
  type RulesetConfig,
} from './schemas.js'
import { CONFIG_PATHS } from './paths'

/**
 * Helper function to handle validation errors consistently
 */
function handleValidationError(
  result: z.SafeParseReturnType<any, any>,
  filePath: string,
  errorType: string,
): void {
  if (!result.success) {
    console.error(`\nError: Invalid ${errorType} in ${filePath}`)
    console.error('\nValidation errors:')
    result.error.issues.forEach(issue => {
      const fieldPath = issue.path.length > 0 ? issue.path.join('.') : 'root'
      console.error(`  • ${fieldPath}: ${issue.message}`)
    })
    console.error('')
    throw new Error(`${errorType} validation failed`)
  }
}

export function getConfigDirectory(): string {
  return CONFIG_PATHS.getConfigDirectory()
}

export function ensureConfigDirectory(): void {
  const configDirectory = getConfigDirectory()
  if (!fs.existsSync(configDirectory)) {
    fs.mkdirSync(configDirectory, { recursive: true })
  }
}

export async function loadConfigFile(
  configPath?: string,
): Promise<Partial<AppConfig>> {
  const finalConfigPath = configPath || CONFIG_PATHS.getConfigFilePath()

  if (!fs.existsSync(finalConfigPath)) {
    return {}
  }

  try {
    const configData = fs.readFileSync(finalConfigPath, 'utf8')
    let parsed = yaml.load(configData)

    // Apply migrations for backward compatibility
    parsed = migrateConfig(parsed)

    const result = validateAppConfig(parsed)
    handleValidationError(result, finalConfigPath, 'configuration')

    return result.data
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'configuration validation failed'
    ) {
      throw error
    }
    throw new Error(`Error loading configuration file: ${error}`)
  }
}

/**
 * Migrate legacy configuration to new format
 */
function migrateConfig(rawConfig: any): any {
  const config = { ...rawConfig }

  // Migrate legacy notify_work_* to show_work_*_notifications
  if (
    'notify_work_started' in config &&
    !('show_work_started_notifications' in config)
  ) {
    config.show_work_started_notifications = config.notify_work_started
  }
  if (
    'notify_work_complete' in config &&
    !('show_work_complete_notifications' in config)
  ) {
    config.show_work_complete_notifications = config.notify_work_complete
  }

  // Migrate boolean sticky_notifications to object format
  if (typeof config.sticky_notifications === 'boolean') {
    config.sticky_notifications = {
      global: config.sticky_notifications,
    }
  }

  return config
}

export async function loadToolsetFile(
  toolsetName: string,
): Promise<ToolsetConfig> {
  const toolsetPath = path.join(
    CONFIG_PATHS.getToolsetsDirectory(),
    `${toolsetName}.yaml`,
  )

  if (!fs.existsSync(toolsetPath)) {
    throw new Error(`Toolset file not found: ${toolsetPath}`)
  }

  try {
    const toolsetData = fs.readFileSync(toolsetPath, 'utf8')
    const parsed = yaml.load(toolsetData)
    const result = validateToolsetConfig(parsed)
    handleValidationError(result, toolsetPath, 'toolset configuration')

    return result.data
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'toolset configuration validation failed'
    ) {
      throw error
    }
    throw new Error(`Error loading toolset file: ${error}`)
  }
}

export async function loadRulesetFile(
  rulesetName: string,
): Promise<RulesetConfig> {
  const rulesetPath = path.join(
    CONFIG_PATHS.getRulesetsDirectory(),
    `${rulesetName}.yaml`,
  )

  if (!fs.existsSync(rulesetPath)) {
    throw new Error(`Ruleset file not found: ${rulesetPath}`)
  }

  try {
    const rulesetData = fs.readFileSync(rulesetPath, 'utf8')
    const parsed = yaml.load(rulesetData)
    const result = validateRulesetConfig(parsed)
    handleValidationError(result, rulesetPath, 'ruleset configuration')

    return result.data
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'ruleset configuration validation failed'
    ) {
      throw error
    }
    throw new Error(`Error loading ruleset file: ${error}`)
  }
}

export function createTempMcpConfig(mcp: Record<string, unknown>): string {
  const tempFileName = `claude-composer-mcp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.json`
  const tempFilePath = path.join(os.tmpdir(), tempFileName)

  const mcpConfig = {
    mcpServers: mcp,
  }

  fs.writeFileSync(tempFilePath, JSON.stringify(mcpConfig, null, 2))

  return tempFilePath
}
