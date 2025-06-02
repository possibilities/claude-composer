import * as os from 'node:os'
import * as path from 'path'

/**
 * Centralized configuration paths management
 * Single source of truth for all configuration-related directories
 */
export const CONFIG_PATHS = {
  /**
   * Get the main configuration directory
   * Can be overridden by CLAUDE_COMPOSER_CONFIG_DIR environment variable
   */
  getConfigDirectory: (): string => {
    return (
      process.env.CLAUDE_COMPOSER_CONFIG_DIR ||
      path.join(os.homedir(), '.claude-composer')
    )
  },

  /**
   * Get the logs directory path
   */
  getLogsDirectory: (): string => {
    return path.join(CONFIG_PATHS.getConfigDirectory(), 'logs')
  },

  /**
   * Get the backups directory path
   */
  getBackupsDirectory: (): string => {
    return path.join(CONFIG_PATHS.getConfigDirectory(), 'backups')
  },

  /**
   * Get the toolsets directory path
   */
  getToolsetsDirectory: (): string => {
    return path.join(CONFIG_PATHS.getConfigDirectory(), 'toolsets')
  },

  /**
   * Get the patterns directory path
   */
  getPatternsDirectory: (): string => {
    return path.join(CONFIG_PATHS.getConfigDirectory(), 'patterns')
  },

  /**
   * Get the config file path
   */
  getConfigFilePath: (): string => {
    return path.join(CONFIG_PATHS.getConfigDirectory(), 'config.yaml')
  },

  /**
   * Get the project config file path
   * Located at .claude-composer/config.yaml in the current working directory
   */
  getProjectConfigFilePath: (): string => {
    return path.join(process.cwd(), '.claude-composer', 'config.yaml')
  },
} as const

/**
 * Environment variable names used in the application
 */
export const ENV_VARS = {
  CONFIG_DIR: 'CLAUDE_COMPOSER_CONFIG_DIR',
  APP_PATH: 'CLAUDE_APP_PATH',
  PATTERNS_PATH: 'CLAUDE_PATTERNS_PATH',
  NODE_ENV: 'NODE_ENV',
  HOME: 'HOME',
  PWD: 'PWD',
  FORCE_COLOR: 'FORCE_COLOR',
  TERM: 'TERM',
  MOCK_ENV: 'MOCK_ENV', // Used in tests
} as const

/**
 * Default paths for Claude application
 */
export const CLAUDE_PATHS = {
  getDefaultAppPath: (): string => {
    return path.join(os.homedir(), '.claude', 'local', 'claude')
  },

  getDefaultCliPath: (): string => {
    return path.join(
      os.homedir(),
      '.claude',
      'local',
      'node_modules',
      '@anthropic-ai',
      'claude-code',
      'cli.js',
    )
  },

  getLocalDirectory: (): string => {
    return path.join(os.homedir(), '.claude', 'local')
  },
} as const
