import type {
  AppConfig,
  ToolsetConfig,
  RulesetConfig,
} from '../config/schemas.js'

export interface PreflightOptions {
  configPath?: string
  ignoreGlobalConfig?: boolean
  stdin?: NodeJS.ReadableStream
  stdout?: NodeJS.WritableStream
}

export interface PreflightResult {
  appConfig: AppConfig
  toolsetArgs: string[]
  rulesetArgs: string[]
  mergedRuleset?: RulesetConfig
  childArgs: string[]
  tempMcpConfigPath?: string
  shouldExit: boolean
  exitCode?: number
  knownOptions: Set<string>
  hasPrintOption?: boolean
}

export interface ParsedOptions {
  // Master notification controls
  showNotifications?: boolean
  stickyNotifications?: boolean

  // New confirmation notification settings
  showConfirmNotify?: boolean
  showAcceptedConfirmNotify?: boolean
  showPromptedConfirmNotify?: boolean

  // Per-confirmation type settings
  showEditFileConfirmNotify?: boolean
  showCreateFileConfirmNotify?: boolean
  showBashCommandConfirmNotify?: boolean
  showReadFileConfirmNotify?: boolean
  showFetchContentConfirmNotify?: boolean

  // Per-type stickiness settings
  stickyPromptedConfirmNotify?: boolean
  stickyAcceptedConfirmNotify?: boolean
  stickyTerminalSnapshotNotifications?: boolean

  // Safety settings
  dangerouslyAllowInDirtyDirectory?: boolean
  dangerouslyAllowWithoutVersionControl?: boolean
  dangerouslySuppressAutomaticAcceptanceConfirmation?: boolean

  // Other settings
  toolset?: string[]
  ruleset?: string[]
  ignoreGlobalConfig?: boolean
  logAllPatternMatches?: boolean
  allowBufferSnapshots?: boolean
  quiet?: boolean
  mode?: string
}

// Re-export for convenience
export type { AppConfig, ToolsetConfig, RulesetConfig }
