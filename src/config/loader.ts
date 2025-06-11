import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as yaml from 'js-yaml'
import { z } from 'zod'
import { fileURLToPath } from 'node:url'
import {
  validateAppConfig,
  validateToolsetConfig,
  type AppConfig,
  type ToolsetConfig,
} from './schemas.js'
import { CONFIG_PATHS } from './paths'
import { expandPath } from '../utils/file-utils.js'

/**
 * Helper function to resolve file path with yaml/yml extension handling
 */
function resolveYamlPath(filePath: string): string {
  // If the path already ends with .yaml or .yml, use it as-is
  if (filePath.endsWith('.yaml') || filePath.endsWith('.yml')) {
    return filePath
  }

  // Otherwise, try .yaml first, then .yml
  const yamlPath = `${filePath}.yaml`
  if (fs.existsSync(yamlPath)) {
    return yamlPath
  }

  const ymlPath = `${filePath}.yml`
  if (fs.existsSync(ymlPath)) {
    return ymlPath
  }

  // Return the .yaml version for error messages
  return yamlPath
}

/**
 * Helper function to handle validation errors consistently
 */
function handleValidationError<Input, Output>(
  result: z.SafeParseReturnType<Input, Output>,
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
    const parsed = yaml.load(configData)

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

export async function loadToolsetFile(
  toolsetName: string,
): Promise<ToolsetConfig> {
  let toolsetPath: string

  // Check if this is an absolute or relative path
  // Also check for environment variables
  if (
    toolsetName.startsWith('~') ||
    toolsetName.startsWith('/') ||
    toolsetName.startsWith('.') ||
    toolsetName.includes('$')
  ) {
    // Treat as a path - expand and resolve it
    const expandedPath = expandPath(toolsetName)
    toolsetPath = resolveYamlPath(expandedPath)
  } else if (toolsetName.startsWith('internal:')) {
    // Check if this is an internal toolset
    const internalName = toolsetName.substring('internal:'.length)
    // Look for internal toolsets in the dist/internal-toolsets directory
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = path.dirname(__filename)
    toolsetPath = path.join(
      __dirname,
      'internal-toolsets',
      `${internalName}.yaml`,
    )

    // In development/test, check src directory if dist doesn't exist
    if (!fs.existsSync(toolsetPath)) {
      // Try replacing dist with src in the path
      const srcPath = toolsetPath.replace('/dist/', '/src/')
      if (fs.existsSync(srcPath)) {
        toolsetPath = srcPath
      }
    }
  } else if (toolsetName.startsWith('project:')) {
    // Project-level toolset
    const projectName = toolsetName.substring('project:'.length)
    const basePath = path.join(
      process.cwd(),
      '.claude-composer',
      'toolsets',
      projectName,
    )
    toolsetPath = resolveYamlPath(basePath)
  } else {
    // Regular user toolset
    const basePath = path.join(CONFIG_PATHS.getToolsetsDirectory(), toolsetName)
    toolsetPath = resolveYamlPath(basePath)
  }

  if (!fs.existsSync(toolsetPath)) {
    throw new Error(`Toolset file not found: ${toolsetPath}`)
  }

  try {
    const toolsetData = fs.readFileSync(toolsetPath, 'utf8')
    const parsed = yaml.load(toolsetData)
    // Handle empty YAML files which parse to undefined or null
    const data = parsed === null || parsed === undefined ? {} : parsed
    const result = validateToolsetConfig(data)
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

export function createTempMcpConfig(mcp: Record<string, unknown>): string {
  const tempFileName = `claude-composer-mcp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.json`
  const tempFilePath = path.join(os.tmpdir(), tempFileName)

  const mcpConfig = {
    mcpServers: mcp,
  }

  fs.writeFileSync(tempFilePath, JSON.stringify(mcpConfig, null, 2))

  return tempFilePath
}
