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
}

export interface ParsedOptions {
  // Master notification controls
  showNotifications?: boolean
  stickyNotifications?: boolean

  // Legacy notification settings
  notifyWorkStarted?: boolean
  notifyWorkComplete?: boolean

  // New confirmation notification settings
  showConfirmNotify?: boolean
  showDismissedConfirmNotify?: boolean
  showPromptedConfirmNotify?: boolean

  // New work notification settings
  showWorkStartedNotifications?: boolean
  showWorkCompleteNotifications?: boolean
  showWorkCompleteRecordNotifications?: boolean

  // Per-confirmation type settings
  showEditFileConfirmNotify?: boolean
  showCreateFileConfirmNotify?: boolean
  showBashCommandConfirmNotify?: boolean
  showReadFileConfirmNotify?: boolean
  showFetchContentConfirmNotify?: boolean

  // Per-type stickiness settings
  stickyWorkStartedNotifications?: boolean
  stickyWorkCompleteNotifications?: boolean
  stickyWorkCompleteRecordNotifications?: boolean
  stickyPromptedConfirmNotify?: boolean
  stickyDismissedConfirmNotify?: boolean
  stickyTerminalSnapshotNotifications?: boolean

  // Dangerous dismissal settings
  dangerouslyDismissEditFilePrompts?: boolean
  dangerouslyDismissCreateFilePrompts?: boolean
  dangerouslyDismissBashCommandPrompts?: boolean
  dangerouslyDismissReadFilesPrompts?: boolean
  dangerouslyDismissFetchContentPrompts?: boolean
  dangerouslyAllowInDirtyDirectory?: boolean
  dangerouslyAllowWithoutVersionControl?: boolean

  // Other settings
  toolset?: string[]
  ruleset?: string[]
  ignoreGlobalConfig?: boolean
  defaultToolsets?: boolean
  defaultRulesets?: boolean
  logAllPatternMatches?: boolean
  allowBufferSnapshots?: boolean
  allowAddingProjectTree?: boolean
  allowAddingProjectChanges?: boolean
  quiet?: boolean
  safe?: boolean
}

// Re-export for convenience
export type { AppConfig, ToolsetConfig, RulesetConfig }
