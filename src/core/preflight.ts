import * as os from 'os'
import * as path from 'path'
import type {
  PreflightOptions,
  PreflightResult,
  AppConfig,
} from '../types/preflight.js'
import {
  ensureConfigDirectory,
  loadConfigFile,
  createTempMcpConfig,
} from '../config/loader.js'
import { buildToolsetArgs, mergeToolsets } from '../config/toolsets.js'
import {
  checkGitInstalled,
  checkChildAppPath,
  checkVersionControl,
  checkDirtyDirectory,
  handleGoOffMode,
  handleDangerFlagsWarning,
  displayDangerousWarnings,
} from '../safety/checker.js'
import { parseCommandLineArgs, buildKnownOptionsSet } from '../cli/parser.js'
import { log, warn, setQuietMode, clearScreen } from '../utils/logging.js'

export async function runPreflight(
  argv: string[],
  options?: PreflightOptions,
): Promise<PreflightResult> {
  let appConfig: AppConfig = {
    show_notifications: true,
    dangerously_dismiss_edit_file_prompts: false,
    dangerously_dismiss_create_file_prompts: false,
    dangerously_dismiss_bash_command_prompts: false,
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

  // Check if --safe is used with other known flags
  if (parsedOptions.safe) {
    const knownOptions = buildKnownOptionsSet(program)
    const usedOptions = argv.filter(
      arg => arg.startsWith('--') && arg !== '--safe',
    )
    const knownUsedOptions = usedOptions.filter(
      opt => knownOptions.has(opt) || knownOptions.has(opt.split('=')[0]),
    )

    if (knownUsedOptions.length > 0) {
      console.error(
        `※ Error: --safe flag cannot be used with other claude-composer flags: ${knownUsedOptions.join(', ')}`,
      )
      return {
        appConfig,
        toolsetArgs: [],
        childArgs: [],
        shouldExit: true,
        exitCode: 1,
        knownOptions,
      }
    }
  }

  const knownOptions = buildKnownOptionsSet(program)

  // Set quiet mode based on parsed options
  if (parsedOptions.quiet) {
    setQuietMode(true)
  }

  const isHelp = helpRequested
  const isVersion = versionRequested
  const isPrint = hasPrintOption
  const isSubcommand =
    args.length > 0 && !args[0].includes(' ') && !args[0].startsWith('-')

  if (isHelp || isVersion) {
    return {
      appConfig,
      toolsetArgs: [],
      childArgs: [],
      shouldExit: true,
      exitCode: 0,
      knownOptions,
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
        childArgs: [],
        shouldExit: true,
        exitCode: 1,
        knownOptions,
      }
    }
  } else {
    log('※ Ignoring global configuration file')
  }

  if (parsedOptions.showNotifications !== undefined) {
    appConfig.show_notifications = parsedOptions.showNotifications
  }
  if (parsedOptions.dangerouslyDismissEditFilePrompts !== undefined) {
    appConfig.dangerously_dismiss_edit_file_prompts =
      parsedOptions.dangerouslyDismissEditFilePrompts
  }
  if (parsedOptions.dangerouslyDismissCreateFilePrompts !== undefined) {
    appConfig.dangerously_dismiss_create_file_prompts =
      parsedOptions.dangerouslyDismissCreateFilePrompts
  }
  if (parsedOptions.dangerouslyDismissBashCommandPrompts !== undefined) {
    appConfig.dangerously_dismiss_bash_command_prompts =
      parsedOptions.dangerouslyDismissBashCommandPrompts
  }
  if (parsedOptions.dangerouslyAllowInDirtyDirectory !== undefined) {
    appConfig.dangerously_allow_in_dirty_directory =
      parsedOptions.dangerouslyAllowInDirtyDirectory
  }
  if (parsedOptions.dangerouslyAllowWithoutVersionControl !== undefined) {
    appConfig.dangerously_allow_without_version_control =
      parsedOptions.dangerouslyAllowWithoutVersionControl
  }
  if (parsedOptions.logAllPatternMatches !== undefined) {
    appConfig.log_all_pattern_matches = parsedOptions.logAllPatternMatches
  }
  if (parsedOptions.allowBufferSnapshots !== undefined) {
    appConfig.allow_buffer_snapshots = parsedOptions.allowBufferSnapshots
  }
  if (parsedOptions.allowAddingProjectTree !== undefined) {
    appConfig.allow_adding_project_tree = parsedOptions.allowAddingProjectTree
  }
  if (parsedOptions.allowAddingProjectChanges !== undefined) {
    appConfig.allow_adding_project_changes =
      parsedOptions.allowAddingProjectChanges
  }

  let toolsetArgs: string[] = []
  let tempMcpConfigPath: string | undefined

  let toolsetsToLoad: string[] = []
  if (parsedOptions.toolset && parsedOptions.toolset.length > 0) {
    toolsetsToLoad = parsedOptions.toolset
  } else if (
    appConfig.toolsets &&
    appConfig.toolsets.length > 0 &&
    parsedOptions.defaultToolsets !== false
  ) {
    toolsetsToLoad = appConfig.toolsets
  } else if (
    appConfig.toolsets &&
    appConfig.toolsets.length > 0 &&
    parsedOptions.defaultToolsets === false
  ) {
    log('※ Ignoring default toolsets from configuration')
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
        childArgs: [],
        shouldExit: true,
        exitCode: 1,
        knownOptions,
      }
    }
  }

  // Check for mutually exclusive options
  const hasToolsetFlag =
    parsedOptions.toolset && parsedOptions.toolset.length > 0
  const hasToolsetConfig =
    appConfig.toolsets &&
    appConfig.toolsets.length > 0 &&
    parsedOptions.defaultToolsets !== false
  const hasToolsetConfiguration = hasToolsetFlag || hasToolsetConfig

  const mutuallyExclusiveFlags = [
    '--mcp-config',
    '--allowed-tools',
    '--disallowed-tools',
  ]
  const usedMutuallyExclusiveFlags = argv.filter(arg => {
    // Check exact matches and variations with = sign
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
      childArgs: [],
      shouldExit: true,
      exitCode: 1,
      knownOptions,
    }
  }

  const childArgs: string[] = []
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]
    if (!knownOptions.has(arg)) {
      childArgs.push(arg)
    } else if (arg === '--toolset' && i + 1 < argv.length) {
      i++
    }
  }

  childArgs.push(...toolsetArgs)

  if (isPrint) {
    log(`※ Starting Claude Code in non-interactive mode due to --print option`)
    return {
      appConfig,
      toolsetArgs,
      childArgs,
      shouldExit: true,
      exitCode: 0,
      knownOptions,
    }
  }

  if (isSubcommand) {
    log(`※ Bypassing Claude Composer`)
    log(`※ Running Claude Code subcommand: ${args[0]}`)
    return {
      appConfig,
      toolsetArgs,
      childArgs: argv.slice(2), // Use original args for subcommands
      shouldExit: true,
      exitCode: 0,
      knownOptions,
    }
  }

  try {
    const goOffAccepted = await handleGoOffMode(parsedOptions, options)
    if (parsedOptions.goOff && !goOffAccepted) {
      return {
        appConfig,
        toolsetArgs,
        childArgs,
        shouldExit: true,
        exitCode: 0,
        knownOptions,
      }
    }
    if (goOffAccepted) {
      appConfig.dangerously_dismiss_edit_file_prompts = true
      appConfig.dangerously_dismiss_create_file_prompts = true
      appConfig.dangerously_dismiss_bash_command_prompts = true
    }
  } catch (error) {
    console.error(
      `\x1b[31m※ Error: ${error instanceof Error ? error.message : error}\x1b[0m`,
    )
    return {
      appConfig,
      toolsetArgs,
      childArgs,
      shouldExit: true,
      exitCode: 1,
      knownOptions,
    }
  }

  try {
    checkGitInstalled()
  } catch (error) {
    console.error(`※ ${error instanceof Error ? error.message : error}`)
    return {
      appConfig,
      toolsetArgs,
      childArgs,
      shouldExit: true,
      exitCode: 1,
      knownOptions,
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
      childArgs,
      shouldExit: true,
      exitCode: 1,
      knownOptions,
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
      childArgs,
      shouldExit: true,
      exitCode: 1,
      knownOptions,
    }
  }

  if (appConfig.show_notifications !== false) {
    log('※ Notifications are enabled')
  }

  if (!parsedOptions.goOff) {
    const dangerFlagsAccepted = await handleDangerFlagsWarning(
      appConfig,
      options,
    )
    if (!dangerFlagsAccepted) {
      return {
        appConfig,
        toolsetArgs,
        childArgs,
        shouldExit: true,
        exitCode: 0,
        knownOptions,
      }
    }
  }

  displayDangerousWarnings(appConfig)

  log('※ Getting ready to launch Claude CLI')

  // Clear screen if quiet mode is enabled
  if (parsedOptions.quiet) {
    clearScreen()
  }

  return {
    appConfig,
    toolsetArgs,
    childArgs,
    tempMcpConfigPath,
    shouldExit: false,
    knownOptions,
  }
}

// Export config directory functions for compatibility
export { getConfigDirectory } from '../config/loader.js'
export { log, warn } from '../utils/logging.js'
