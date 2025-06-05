import * as os from 'os'
import * as path from 'path'
import type {
  PreflightOptions,
  PreflightResult,
  AppConfig,
  RulesetConfig,
} from '../types/preflight.js'
import {
  ensureConfigDirectory,
  loadConfigFile,
  createTempMcpConfig,
  loadRulesetFile,
} from '../config/loader.js'
import { buildToolsetArgs, mergeToolsets } from '../config/toolsets.js'
import { buildRulesetArgs, mergeRulesets } from '../config/rulesets.js'
import {
  checkGitInstalled,
  checkChildAppPath,
  checkVersionControl,
  checkDirtyDirectory,
  handleAutomaticAcceptanceWarning,
} from '../safety/checker.js'
import { parseCommandLineArgs, buildKnownOptionsSet } from '../cli/parser.js'
import { detectSubcommand } from '../cli/subcommand.js'
import { log, warn, setQuietMode, clearScreen } from '../utils/logging.js'

export async function runPreflight(
  argv: string[],
  options?: PreflightOptions,
): Promise<PreflightResult> {
  let appConfig: AppConfig = {
    show_notifications: true,
    show_work_started_notifications: false,
    show_work_complete_notifications: true,
    dangerously_allow_in_dirty_directory: false,
    dangerously_allow_without_version_control: false,
  }

  ensureConfigDirectory()

  const {
    program,
    options: parsedOptions,
    args,
    helpRequested,
    versionRequested,
    hasPrintOption,
  } = parseCommandLineArgs(argv)

  const knownOptions = buildKnownOptionsSet(program)

  if (parsedOptions.quiet) {
    setQuietMode(true)
  }

  const isHelp = helpRequested
  const isVersion = versionRequested
  const isPrint = hasPrintOption
  const subcommandResult = detectSubcommand(args)
  const isSubcommand = subcommandResult.isSubcommand

  if (isHelp || isVersion) {
    return {
      appConfig,
      toolsetArgs: [],
      rulesetArgs: [],
      childArgs: [],
      shouldExit: true,
      exitCode: 0,
      knownOptions,
      hasPrintOption,
    }
  }

  const ignoreGlobalConfig =
    parsedOptions.ignoreGlobalConfig ||
    options?.ignoreGlobalConfig ||
    argv.includes('--ignore-global-config')

  if (!ignoreGlobalConfig) {
    try {
      const loadedConfig = await loadConfigFile(options?.configPath)
      appConfig = { ...appConfig, ...loadedConfig }
    } catch (error) {
      console.error('Error loading configuration:', error)
      return {
        appConfig,
        toolsetArgs: [],
        rulesetArgs: [],
        childArgs: [],
        shouldExit: true,
        exitCode: 1,
        knownOptions,
        hasPrintOption,
      }
    }
  } else {
    log('※ Ignoring global configuration file')
  }

  if (parsedOptions.stickyNotifications !== undefined) {
    // Handle --sticky-notifications flag (global override)
    if (parsedOptions.stickyNotifications === true) {
      appConfig.sticky_notifications = { global: true }
      appConfig.show_notifications = true
    } else if (parsedOptions.stickyNotifications === false) {
      // --no-sticky-notifications means use per-type settings
      if (typeof appConfig.sticky_notifications === 'boolean') {
        appConfig.sticky_notifications = { global: false }
      }
    }
  }

  if (parsedOptions.showNotifications !== undefined) {
    appConfig.show_notifications = parsedOptions.showNotifications
  }
  if (parsedOptions.dangerouslyAllowInDirtyDirectory !== undefined) {
    appConfig.dangerously_allow_in_dirty_directory =
      parsedOptions.dangerouslyAllowInDirtyDirectory
  }
  if (parsedOptions.dangerouslyAllowWithoutVersionControl !== undefined) {
    appConfig.dangerously_allow_without_version_control =
      parsedOptions.dangerouslyAllowWithoutVersionControl
  }
  if (
    parsedOptions.dangerouslySuppressAutomaticAcceptanceConfirmation !==
    undefined
  ) {
    appConfig.dangerously_suppress_automatic_acceptance_confirmation =
      parsedOptions.dangerouslySuppressAutomaticAcceptanceConfirmation
  }
  if (parsedOptions.logAllPatternMatches !== undefined) {
    appConfig.log_all_pattern_matches = parsedOptions.logAllPatternMatches
  }
  if (parsedOptions.allowBufferSnapshots !== undefined) {
    appConfig.allow_buffer_snapshots = parsedOptions.allowBufferSnapshots
  }
  // Confirmation notification settings
  if (parsedOptions.showConfirmNotify !== undefined) {
    appConfig.show_confirm_notify = parsedOptions.showConfirmNotify
  }
  if (parsedOptions.showAcceptedConfirmNotify !== undefined) {
    appConfig.show_accepted_confirm_notify =
      parsedOptions.showAcceptedConfirmNotify
  }
  if (parsedOptions.showPromptedConfirmNotify !== undefined) {
    appConfig.show_prompted_confirm_notify =
      parsedOptions.showPromptedConfirmNotify
  }

  // New work notification settings
  if (parsedOptions.showWorkStartedNotifications !== undefined) {
    appConfig.show_work_started_notifications =
      parsedOptions.showWorkStartedNotifications
  }
  if (parsedOptions.showWorkCompleteNotifications !== undefined) {
    appConfig.show_work_complete_notifications =
      parsedOptions.showWorkCompleteNotifications
  }
  if (parsedOptions.showWorkCompleteRecordNotifications !== undefined) {
    appConfig.show_work_complete_record_notifications =
      parsedOptions.showWorkCompleteRecordNotifications
  }

  // Per-confirmation type settings
  if (
    parsedOptions.showEditFileConfirmNotify !== undefined ||
    parsedOptions.showCreateFileConfirmNotify !== undefined ||
    parsedOptions.showBashCommandConfirmNotify !== undefined ||
    parsedOptions.showReadFileConfirmNotify !== undefined ||
    parsedOptions.showFetchContentConfirmNotify !== undefined
  ) {
    if (!appConfig.confirm_notify) {
      appConfig.confirm_notify = {}
    }
    if (parsedOptions.showEditFileConfirmNotify !== undefined) {
      appConfig.confirm_notify.edit_file =
        parsedOptions.showEditFileConfirmNotify
    }
    if (parsedOptions.showCreateFileConfirmNotify !== undefined) {
      appConfig.confirm_notify.create_file =
        parsedOptions.showCreateFileConfirmNotify
    }
    if (parsedOptions.showBashCommandConfirmNotify !== undefined) {
      appConfig.confirm_notify.bash_command =
        parsedOptions.showBashCommandConfirmNotify
    }
    if (parsedOptions.showReadFileConfirmNotify !== undefined) {
      appConfig.confirm_notify.read_file =
        parsedOptions.showReadFileConfirmNotify
    }
    if (parsedOptions.showFetchContentConfirmNotify !== undefined) {
      appConfig.confirm_notify.fetch_content =
        parsedOptions.showFetchContentConfirmNotify
    }
  }

  // Per-type stickiness settings
  if (parsedOptions.stickyWorkStartedNotifications !== undefined) {
    appConfig.sticky_work_started_notifications =
      parsedOptions.stickyWorkStartedNotifications
  }
  if (parsedOptions.stickyWorkCompleteNotifications !== undefined) {
    appConfig.sticky_work_complete_notifications =
      parsedOptions.stickyWorkCompleteNotifications
  }
  if (parsedOptions.stickyWorkCompleteRecordNotifications !== undefined) {
    appConfig.sticky_work_complete_record_notifications =
      parsedOptions.stickyWorkCompleteRecordNotifications
  }
  if (parsedOptions.stickyPromptedConfirmNotify !== undefined) {
    appConfig.sticky_prompted_confirm_notify =
      parsedOptions.stickyPromptedConfirmNotify
  }
  if (parsedOptions.stickyAcceptedConfirmNotify !== undefined) {
    appConfig.sticky_accepted_confirm_notify =
      parsedOptions.stickyAcceptedConfirmNotify
  }
  if (parsedOptions.stickyTerminalSnapshotNotifications !== undefined) {
    appConfig.sticky_terminal_snapshot_notifications =
      parsedOptions.stickyTerminalSnapshotNotifications
  }

  let toolsetArgs: string[] = []
  let rulesetArgs: string[] = []
  let mergedRuleset: RulesetConfig | undefined
  let tempMcpConfigPath: string | undefined

  let toolsetsToLoad: string[] = []
  if (parsedOptions.toolset && parsedOptions.toolset.length > 0) {
    toolsetsToLoad = parsedOptions.toolset
  } else if (appConfig.toolsets && appConfig.toolsets.length > 0) {
    toolsetsToLoad = appConfig.toolsets
  }

  if (toolsetsToLoad.length > 0) {
    try {
      const mergedConfig = await mergeToolsets(toolsetsToLoad)
      toolsetArgs = buildToolsetArgs(mergedConfig)

      if (mergedConfig.mcp && Object.keys(mergedConfig.mcp).length > 0) {
        tempMcpConfigPath = createTempMcpConfig(mergedConfig.mcp)
        toolsetArgs.push('--mcp-config', tempMcpConfigPath)
      }
    } catch (error) {
      console.error(
        `\x1b[31m※ Error: ${error instanceof Error ? error.message : error}\x1b[0m`,
      )
      return {
        appConfig,
        toolsetArgs: [],
        rulesetArgs: [],
        childArgs: [],
        shouldExit: true,
        exitCode: 1,
        knownOptions,
        hasPrintOption,
      }
    }
  }

  let rulesetsToLoad: string[] = []
  if (parsedOptions.ruleset && parsedOptions.ruleset.length > 0) {
    rulesetsToLoad = parsedOptions.ruleset
  } else if (appConfig.rulesets && appConfig.rulesets.length > 0) {
    rulesetsToLoad = appConfig.rulesets
  }

  if (rulesetsToLoad.length > 0) {
    try {
      const rulesetConfigs = await Promise.all(
        rulesetsToLoad.map(name => loadRulesetFile(name)),
      )
      mergedRuleset = mergeRulesets(rulesetConfigs)
      rulesetArgs = buildRulesetArgs(mergedRuleset)

      rulesetsToLoad.forEach(name => {
        log(`※ Loaded ruleset: ${name}`)
      })
    } catch (error) {
      console.error(
        `\x1b[31m※ Error: ${error instanceof Error ? error.message : error}\x1b[0m`,
      )
      return {
        appConfig,
        toolsetArgs: [],
        rulesetArgs: [],
        childArgs: [],
        shouldExit: true,
        exitCode: 1,
        knownOptions,
        hasPrintOption,
      }
    }
  }

  const hasToolsetFlag =
    parsedOptions.toolset && parsedOptions.toolset.length > 0
  const hasToolsetConfig = appConfig.toolsets && appConfig.toolsets.length > 0
  const hasToolsetConfiguration = hasToolsetFlag || hasToolsetConfig

  const mutuallyExclusiveFlags = [
    '--mcp-config',
    '--allowed-tools',
    '--disallowed-tools',
  ]
  const usedMutuallyExclusiveFlags = argv.filter(arg => {
    return mutuallyExclusiveFlags.some(
      flag => arg === flag || arg.startsWith(flag + '='),
    )
  })

  if (hasToolsetConfiguration && usedMutuallyExclusiveFlags.length > 0) {
    const toolsetSource = hasToolsetFlag ? '--toolset' : 'toolsets in config'
    console.error(
      `※ Error: ${toolsetSource} is mutually exclusive with: ${usedMutuallyExclusiveFlags.join(', ')}`,
    )
    return {
      appConfig,
      toolsetArgs: [],
      rulesetArgs: [],
      childArgs: [],
      shouldExit: true,
      exitCode: 1,
      knownOptions,
      hasPrintOption,
    }
  }

  const childArgs: string[] = []
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]
    if (!knownOptions.has(arg)) {
      childArgs.push(arg)
    } else if (arg === '--toolset' && i + 1 < argv.length) {
      i++
    } else if (arg === '--ruleset' && i + 1 < argv.length) {
      i++
    }
  }

  childArgs.push(...toolsetArgs)
  childArgs.push(...rulesetArgs)

  if (isPrint) {
    log(`※ Starting Claude Code in non-interactive mode due to --print option`)
    return {
      appConfig,
      toolsetArgs,
      rulesetArgs,
      childArgs,
      shouldExit: true,
      exitCode: 0,
      knownOptions,
      hasPrintOption,
    }
  }

  if (isSubcommand) {
    log(`※ Accepting Claude Composer`)
    log(`※ Running Claude Code subcommand: ${subcommandResult.subcommand}`)
    return {
      appConfig,
      toolsetArgs,
      rulesetArgs,
      childArgs: argv.slice(2), // Use original args for subcommands
      shouldExit: true,
      exitCode: 0,
      knownOptions,
      hasPrintOption,
    }
  }

  try {
    checkGitInstalled()
  } catch (error) {
    console.error(`※ ${error instanceof Error ? error.message : error}`)
    return {
      appConfig,
      toolsetArgs,
      rulesetArgs,
      childArgs,
      shouldExit: true,
      exitCode: 1,
      knownOptions,
      hasPrintOption,
    }
  }

  const defaultChildAppPath = path.join(
    os.homedir(),
    '.claude',
    'local',
    'claude',
  )
  const childAppPath = process.env.CLAUDE_APP_PATH || defaultChildAppPath

  try {
    checkChildAppPath(childAppPath)
  } catch (error) {
    console.error(`※ ${error instanceof Error ? error.message : error}`)
    return {
      appConfig,
      toolsetArgs,
      rulesetArgs,
      childArgs,
      shouldExit: true,
      exitCode: 1,
      knownOptions,
      hasPrintOption,
    }
  }

  try {
    const hasVersionControl = await checkVersionControl(
      process.cwd(),
      appConfig.dangerously_allow_without_version_control,
      options,
    )

    if (!hasVersionControl) {
      warn('※ Dangerously running in project without version control')
    } else {
      const isDirty = await checkDirtyDirectory(
        process.cwd(),
        appConfig.dangerously_allow_in_dirty_directory,
        options,
      )

      if (isDirty) {
        warn('※ Dangerously running in directory with uncommitted changes')
      }
    }
  } catch (error) {
    console.error(
      `※ Exiting: ${error instanceof Error ? error.message : error}`,
    )
    return {
      appConfig,
      toolsetArgs,
      rulesetArgs,
      childArgs,
      shouldExit: true,
      exitCode: 1,
      knownOptions,
      hasPrintOption,
    }
  }

  if (appConfig.show_notifications !== false) {
    log('※ Notifications are enabled')
  }

  const automaticAcceptanceConfirmed = await handleAutomaticAcceptanceWarning(
    appConfig,
    mergedRuleset,
    options,
  )
  if (!automaticAcceptanceConfirmed) {
    return {
      appConfig,
      toolsetArgs,
      rulesetArgs,
      childArgs,
      shouldExit: true,
      exitCode: 0,
      knownOptions,
      hasPrintOption,
    }
  }

  log('※ Getting ready to launch Claude CLI')

  // Validate that at least one ruleset is configured (unless using --print)
  if (rulesetsToLoad.length === 0 && !isPrint) {
    console.error(
      '\x1b[31m※ Error: No rulesets configured. At least one ruleset is required.\x1b[0m',
    )
    console.error(
      '\x1b[31m※ Use --ruleset flag or configure rulesets in your config file.\x1b[0m',
    )
    console.error(
      '\x1b[31m※ To create a config file, run: claude-composer cc-init\x1b[0m',
    )
    return {
      appConfig,
      toolsetArgs: [],
      rulesetArgs: [],
      childArgs,
      shouldExit: true,
      exitCode: 1,
      knownOptions,
      hasPrintOption,
    }
  }

  return {
    appConfig,
    toolsetArgs,
    rulesetArgs,
    mergedRuleset,
    childArgs,
    tempMcpConfigPath,
    shouldExit: false,
    knownOptions,
    hasPrintOption,
  }
}

import { CONFIG_PATHS } from '../config/paths'
export const getConfigDirectory = CONFIG_PATHS.getConfigDirectory
export { log, warn } from '../utils/logging.js'
