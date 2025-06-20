import type { AppConfig, ToolsetConfig } from '../config/schemas.js'

export interface PreflightOptions {
  configPath?: string
  ignoreGlobalConfig?: boolean
  stdin?: NodeJS.ReadableStream
  stdout?: NodeJS.WritableStream
}

export interface PreflightResult {
  appConfig: AppConfig
  toolsetArgs: string[]
  childArgs: string[]
  tempMcpConfigPath?: string
  shouldExit: boolean
  exitCode?: number
  knownOptions: Set<string>
  hasPrintOption?: boolean
  yolo?: boolean
}

export interface ParsedOptions {
  // Master notification controls
  showNotifications?: boolean
  stickyNotifications?: boolean

  // Safety settings
  dangerouslyAllowInDirtyDirectory?: boolean
  dangerouslyAllowWithoutVersionControl?: boolean
  dangerouslySuppressYoloConfirmation?: boolean

  // Other settings
  toolset?: string[]
  yolo?: boolean
  ignoreGlobalConfig?: boolean
  logAllPatternMatches?: boolean
  allowBufferSnapshots?: boolean
  quiet?: boolean
  mode?: string
  outputFormatter?: string | boolean
}

// Re-export for convenience
export type { AppConfig, ToolsetConfig }
