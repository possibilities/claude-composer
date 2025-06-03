import * as fs from 'fs'
import * as yaml from 'yaml'
import { z } from 'zod'
import type {
  AppConfig,
  PatternConfig,
  ToolsetConfig,
  RulesetConfig,
} from './schemas'
import {
  appConfigSchema,
  toolsetConfigSchema,
  rulesetConfigSchema,
} from './schemas'
import { CONFIG_PATHS, CLAUDE_PATHS } from './paths'
import {
  ConfigurationError,
  ConfigFileNotFoundError,
  ConfigValidationError,
  ToolsetConfigError,
} from './errors'
import {
  validatePattern,
  validatePatterns,
  validateMcpConfig,
  mergeConfigs,
  ConfigPrecedence,
  type McpConfig,
} from './validators'
import { parseEnvironment, type EnvironmentConfig } from './environment'

/**
 * Configuration state managed by the ConfigurationManager
 */
interface ConfigurationState {
  appConfig: AppConfig | null
  patterns: Map<string, PatternConfig>
  toolsets: Map<string, ToolsetConfig>
  rulesets: Map<string, RulesetConfig>
  environment: EnvironmentConfig
  tempFiles: Set<string>
}

/**
 * Options for loading configuration
 */
export interface LoadConfigOptions {
  configPath?: string
  ignoreGlobalConfig?: boolean
  toolsetNames?: string[]
  rulesetNames?: string[]
  cliOverrides?: Partial<AppConfig>
}

/**
 * Centralized configuration management
 * Singleton pattern ensures consistent configuration across the application
 */
export class ConfigurationManager {
  private static instance: ConfigurationManager | null = null
  private state: ConfigurationState

  private constructor() {
    this.state = {
      appConfig: null,
      patterns: new Map(),
      toolsets: new Map(),
      rulesets: new Map(),
      environment: parseEnvironment(),
      tempFiles: new Set(),
    }
  }

  /**
   * Get the singleton instance
   */
  static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager()
    }
    return ConfigurationManager.instance
  }

  /**
   * Reset the singleton instance (mainly for testing)
   */
  static resetInstance(): void {
    if (ConfigurationManager.instance) {
      ConfigurationManager.instance.cleanup()
      ConfigurationManager.instance = null
    }
  }

  /**
   * Load application configuration
   */
  async loadConfiguration(options: LoadConfigOptions = {}): Promise<void> {
    const { configPath, ignoreGlobalConfig, toolsetNames, cliOverrides } =
      options

    // Start with defaults
    let config = this.getDefaultAppConfig()

    // Load global config
    if (!ignoreGlobalConfig) {
      const globalConfig = await this.loadConfigFile(
        configPath || CONFIG_PATHS.getConfigFilePath(),
      )
      if (globalConfig) {
        config = mergeConfigs([
          { config, precedence: ConfigPrecedence.DEFAULT },
          { config: globalConfig, precedence: ConfigPrecedence.CONFIG_FILE },
        ])
      }
    }

    // Load project config
    const projectConfigPath = CONFIG_PATHS.getProjectConfigFilePath()
    if (fs.existsSync(projectConfigPath)) {
      const projectConfig = await this.loadConfigFile(projectConfigPath)
      if (projectConfig) {
        const mergedConfig = mergeConfigs([
          { config, precedence: ConfigPrecedence.CONFIG_FILE },
          { config: projectConfig, precedence: ConfigPrecedence.CLI_FLAG }, // Higher precedence
        ])

        if (projectConfig.toolsets !== undefined) {
          mergedConfig.toolsets = projectConfig.toolsets
        }

        config = mergedConfig
      }
    }

    // Apply CLI overrides with highest precedence
    if (cliOverrides) {
      config = mergeConfigs([
        { config, precedence: ConfigPrecedence.CONFIG_FILE },
        { config: cliOverrides, precedence: ConfigPrecedence.CLI_FLAG },
      ])

      if (cliOverrides.toolsets !== undefined) {
        config.toolsets = cliOverrides.toolsets
      }
    }

    this.state.appConfig = config

    // Load toolsets if specified
    const toolsetsToLoad = toolsetNames || config.toolsets
    if (toolsetsToLoad && toolsetsToLoad.length > 0) {
      await this.loadToolsets(toolsetsToLoad)
    }
  }

  /**
   * Migrate legacy configuration to new format
   */
  private migrateConfig(rawConfig: any): any {
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

  /**
   * Load configuration from file
   */
  private async loadConfigFile(filePath: string): Promise<AppConfig | null> {
    if (!fs.existsSync(filePath)) {
      return null
    }

    try {
      const configContent = fs.readFileSync(filePath, 'utf8')
      let rawConfig = yaml.parse(configContent)

      // Apply migrations for backward compatibility
      rawConfig = this.migrateConfig(rawConfig)

      const result = appConfigSchema.safeParse(rawConfig)
      if (!result.success) {
        throw new ConfigValidationError(result.error, filePath)
      }

      return result.data
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error
      }
      throw new ConfigurationError(
        `Failed to load configuration from ${filePath}: ${error}`,
        'CONFIG_LOAD_ERROR',
      )
    }
  }

  /**
   * Load toolset configurations
   */
  async loadToolsets(toolsetNames: string[]): Promise<void> {
    for (const name of toolsetNames) {
      await this.loadToolset(name)
    }
  }

  /**
   * Load a single toolset
   */
  private async loadToolset(name: string): Promise<void> {
    const toolsetPath = `${CONFIG_PATHS.getToolsetsDirectory()}/${name}.yaml`

    if (!fs.existsSync(toolsetPath)) {
      throw new ToolsetConfigError(
        name,
        `Toolset file not found: ${toolsetPath}`,
      )
    }

    try {
      const content = fs.readFileSync(toolsetPath, 'utf8')
      const rawConfig = yaml.parse(content)

      const result = toolsetConfigSchema.safeParse(rawConfig)
      if (!result.success) {
        throw new ConfigValidationError(result.error, toolsetPath)
      }

      if (result.data.mcp) {
        result.data.mcp = validateMcpConfig(result.data.mcp)
      }

      this.state.toolsets.set(name, result.data)
    } catch (error) {
      if (error instanceof ConfigurationError) {
        throw error
      }
      throw new ToolsetConfigError(name, `Failed to load toolset: ${error}`)
    }
  }

  /**
   * Register patterns for use in the application
   */
  registerPatterns(patterns: PatternConfig[]): void {
    const { valid, invalid } = validatePatterns(patterns)

    for (const { pattern, errors } of invalid) {
      const id = (pattern as any)?.id || 'unknown'
      console.warn(`Invalid pattern "${id}":`, errors.join('; '))
    }

    for (const pattern of valid) {
      this.state.patterns.set(pattern.id, pattern)
    }
  }

  /**
   * Get app configuration
   */
  getAppConfig(): AppConfig {
    if (!this.state.appConfig) {
      return this.getDefaultAppConfig()
    }
    return { ...this.state.appConfig }
  }

  /**
   * Get a specific pattern by ID
   */
  getPattern(id: string): PatternConfig | undefined {
    return this.state.patterns.get(id)
  }

  /**
   * Get all registered patterns
   */
  getAllPatterns(): PatternConfig[] {
    return Array.from(this.state.patterns.values())
  }

  /**
   * Get filtered patterns based on app config
   */
  getActivePatterns(): PatternConfig[] {
    const config = this.getAppConfig()
    return this.getAllPatterns().filter(pattern => {
      if (
        pattern.id === 'edit-file-prompt' &&
        !config.dangerously_accept_edit_file_prompts
      ) {
        return false
      }
      if (
        pattern.id === 'create-file-prompt' &&
        !config.dangerously_accept_create_file_prompts
      ) {
        return false
      }
      if (
        pattern.id === 'bash-command-prompt' &&
        !config.dangerously_accept_bash_command_prompts
      ) {
        return false
      }
      if (
        pattern.id === 'add-tree-trigger' &&
        !config.allow_adding_project_tree
      ) {
        return false
      }
      if (
        pattern.id === 'add-changes-trigger' &&
        !config.allow_adding_project_changes
      ) {
        return false
      }
      return true
    })
  }

  /**
   * Get merged toolset configuration
   */
  getMergedToolsets(): {
    allowedTools: Set<string>
    disallowedTools: Set<string>
    mcp: McpConfig
  } {
    const allowedTools = new Set<string>()
    const disallowedTools = new Set<string>()
    let mcp: McpConfig = { servers: {} }

    for (const toolset of this.state.toolsets.values()) {
      if (toolset.allowed_tools) {
        toolset.allowed_tools.forEach(tool => allowedTools.add(tool))
      }

      if (toolset.disallowed_tools) {
        toolset.disallowed_tools.forEach(tool => disallowedTools.add(tool))
      }

      if (toolset.mcp?.servers) {
        mcp.servers = { ...mcp.servers, ...toolset.mcp.servers }
      }
    }

    return { allowedTools, disallowedTools, mcp }
  }

  /**
   * Get environment configuration
   */
  getEnvironment(): EnvironmentConfig {
    return { ...this.state.environment }
  }

  /**
   * Get configuration directory
   */
  getConfigDirectory(): string {
    return CONFIG_PATHS.getConfigDirectory()
  }

  /**
   * Register a temporary file for cleanup
   */
  registerTempFile(path: string): void {
    this.state.tempFiles.add(path)
  }

  /**
   * Clean up temporary files
   */
  cleanup(): void {
    for (const tempFile of this.state.tempFiles) {
      try {
        if (fs.existsSync(tempFile)) {
          fs.unlinkSync(tempFile)
        }
      } catch (error) {
        console.warn(`Failed to clean up temp file ${tempFile}:`, error)
      }
    }
    this.state.tempFiles.clear()
  }

  /**
   * Get default app configuration
   */
  private getDefaultAppConfig(): AppConfig {
    return {
      // Master notification controls
      show_notifications: true,

      // Confirmation notification settings
      show_confirm_notify: true,
      show_accepted_confirm_notify: false,
      show_prompted_confirm_notify: true,
      confirm_notify: {
        edit_file: true,
        create_file: true,
        bash_command: true,
        read_file: true,
        fetch_content: true,
      },

      // Work notification settings
      show_work_started_notifications: false,
      show_work_complete_notifications: true,
      show_work_complete_record_notifications: true,

      // Stickiness settings with smart defaults
      sticky_notifications: {
        global: false,
        work_started: false,
        work_complete: true,
        work_complete_record: true,
        prompted_confirmations: true,
        accepted_confirmations: false,
        terminal_snapshot: false,
      },

      // Legacy notification settings (for backward compatibility)
      notify_work_started: false,
      notify_work_complete: true,

      // Other defaults
      log_all_pattern_matches: false,
      dangerously_accept_edit_file_prompts: false,
      dangerously_accept_create_file_prompts: false,
      dangerously_accept_bash_command_prompts: false,
      dangerously_allow_in_dirty_directory: false,
      dangerously_allow_without_version_control: false,
      allow_adding_project_tree: false,
      allow_adding_project_changes: false,
      allow_buffer_snapshots: false,
    }
  }
}
