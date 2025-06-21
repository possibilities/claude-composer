import * as os from 'node:os'
import * as path from 'path'
import { execSync } from 'node:child_process'
import * as fs from 'node:fs'

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
   * Get the rulesets directory path
   */
  getRulesetsDirectory: (): string => {
    return path.join(CONFIG_PATHS.getConfigDirectory(), 'rulesets')
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

  findClaudeCommand: (): string => {
    // First check environment variable
    if (process.env.CLAUDE_APP_PATH) {
      const envPath = process.env.CLAUDE_APP_PATH
      if (fs.existsSync(envPath)) {
        return envPath
      }
    }

    const defaultPath = CLAUDE_PATHS.getDefaultAppPath()
    if (fs.existsSync(defaultPath)) {
      return defaultPath
    }

    try {
      const whichResult = execSync('which claude', {
        encoding: 'utf8',
        stdio: ['ignore', 'pipe', 'ignore'],
      }).trim()

      if (whichResult && fs.existsSync(whichResult)) {
        return whichResult
      }
    } catch {}

    throw new Error(
      `Claude CLI not found. Please install Claude CLI or set CLAUDE_APP_PATH environment variable.\n` +
        `Checked locations:\n` +
        `- Environment variable: ${process.env.CLAUDE_APP_PATH || '(not set)'}\n` +
        `- Default location: ${defaultPath}\n` +
        `- System PATH: (not found)`,
    )
  },
} as const
