import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as yaml from 'js-yaml'
import {
  validateAppConfig,
  validateToolsetConfig,
  type AppConfig,
  type ToolsetConfig,
} from './schemas.js'
import { CONFIG_PATHS } from './paths'

export function getConfigDirectory(): string {
  return CONFIG_PATHS.getConfigDirectory()
}

export function ensureConfigDirectory(): void {
  const configDir = getConfigDirectory()
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true })
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
    const parsed = yaml.load(configData)
    const result = validateAppConfig(parsed)

    if (!result.success) {
      console.error(`\nError: Invalid configuration in ${finalConfigPath}`)
      console.error('\nValidation errors:')
      result.error.issues.forEach(issue => {
        const fieldPath = issue.path.length > 0 ? issue.path.join('.') : 'root'
        console.error(`  • ${fieldPath}: ${issue.message}`)
      })
      console.error('')
      throw new Error('Configuration validation failed')
    }

    return result.data
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Configuration validation failed'
    ) {
      throw error
    }
    throw new Error(`Error loading configuration file: ${error}`)
  }
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

    if (!result.success) {
      console.error(`\nError: Invalid toolset configuration in ${toolsetPath}`)
      console.error('\nValidation errors:')
      result.error.issues.forEach(issue => {
        const fieldPath = issue.path.length > 0 ? issue.path.join('.') : 'root'
        console.error(`  • ${fieldPath}: ${issue.message}`)
      })
      console.error('')
      throw new Error('Toolset validation failed')
    }

    return result.data
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Toolset validation failed'
    ) {
      throw error
    }
    throw new Error(`Error loading toolset file: ${error}`)
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
