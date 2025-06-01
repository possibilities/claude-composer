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
}

export interface ParsedOptions {
  showNotifications?: boolean
  dangerouslyDismissEditFilePrompts?: boolean
  dangerouslyDismissCreateFilePrompts?: boolean
  dangerouslyDismissBashCommandPrompts?: boolean
  dangerouslyAllowInDirtyDirectory?: boolean
  dangerouslyAllowWithoutVersionControl?: boolean
  toolset?: string[]
  ignoreGlobalConfig?: boolean
  defaultToolsets?: boolean
  goOff?: boolean
  logAllPatternMatches?: boolean
  allowBufferSnapshots?: boolean
  allowAddingProjectTree?: boolean
  allowAddingProjectChanges?: boolean
  quiet?: boolean
  safe?: boolean
}

// Re-export for convenience
export type { AppConfig, ToolsetConfig }
