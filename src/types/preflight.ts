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
  showNotifications?: boolean
  stickyNotifications?: boolean
  notifyWorkStarted?: boolean
  notifyWorkComplete?: boolean
  dangerouslyDismissEditFilePrompts?: boolean
  dangerouslyDismissCreateFilePrompts?: boolean
  dangerouslyDismissBashCommandPrompts?: boolean
  dangerouslyDismissReadFilesPrompts?: boolean
  dangerouslyDismissFetchContentPrompts?: boolean
  dangerouslyAllowInDirtyDirectory?: boolean
  dangerouslyAllowWithoutVersionControl?: boolean
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
