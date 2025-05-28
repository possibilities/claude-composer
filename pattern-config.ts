import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { PatternConfig } from './pattern-matcher'

export interface PatternConfigFile {
  patterns: PatternConfig[]
  settings: {
    bufferSize?: number
    defaultCooldown?: number
    logMatches?: boolean
  }
}

export class PatternConfigManager {
  private configPath: string
  private config: PatternConfigFile

  constructor(configPath?: string) {
    this.configPath = configPath || this.getDefaultConfigPath()
    this.config = this.loadConfig()
  }

  private getDefaultConfigPath(): string {
    const configDir = path.join(os.homedir(), '.claude')
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
    }
    return path.join(configDir, 'pattern-config.json')
  }

  private loadConfig(): PatternConfigFile {
    if (!fs.existsSync(this.configPath)) {
      const defaultConfig = this.getDefaultConfig()
      this.saveConfig(defaultConfig)
      return defaultConfig
    }

    try {
      const content = fs.readFileSync(this.configPath, 'utf-8')
      return JSON.parse(content)
    } catch (error) {
      console.warn(
        `Failed to load config from ${this.configPath}, using defaults:`,
        error,
      )
      return this.getDefaultConfig()
    }
  }

  private getDefaultConfig(): PatternConfigFile {
    return {
      patterns: [
        {
          id: 'example-confirm',
          pattern: 'Do you want to continue? (y/n)',
          response: 'y\r',
          delay: 500,
          cooldown: 2000,
          caseSensitive: false,
        },
        {
          id: 'example-enter-to-continue',
          pattern: 'Press Enter to continue',
          response: '\r',
          delay: 1000,
          cooldown: 3000,
          caseSensitive: false,
        },
      ],
      settings: {
        bufferSize: 2048,
        defaultCooldown: 1000,
        logMatches: false,
      },
    }
  }

  getPatterns(): PatternConfig[] {
    return this.config.patterns
  }

  getSettings(): PatternConfigFile['settings'] {
    return this.config.settings
  }

  addPattern(pattern: PatternConfig): void {
    this.config.patterns.push(pattern)
    this.saveConfig(this.config)
  }

  removePattern(id: string): void {
    this.config.patterns = this.config.patterns.filter(p => p.id !== id)
    this.saveConfig(this.config)
  }

  updatePattern(id: string, updates: Partial<PatternConfig>): void {
    const index = this.config.patterns.findIndex(p => p.id === id)
    if (index !== -1) {
      this.config.patterns[index] = {
        ...this.config.patterns[index],
        ...updates,
      }
      this.saveConfig(this.config)
    }
  }

  updateSettings(settings: Partial<PatternConfigFile['settings']>): void {
    this.config.settings = { ...this.config.settings, ...settings }
    this.saveConfig(this.config)
  }

  private saveConfig(config: PatternConfigFile): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(config, null, 2))
    } catch (error) {
      console.error(`Failed to save config to ${this.configPath}:`, error)
    }
  }

  reloadConfig(): void {
    this.config = this.loadConfig()
  }

  getConfigPath(): string {
    return this.configPath
  }
}
