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

  // Check for config file existence first, before doing other checks
  if (!ignoreGlobalConfig && !isPrint && !isSubcommand) {
    const { CONFIG_PATHS } = await import('../config/paths.js')
    const configPath = options?.configPath || CONFIG_PATHS.getConfigFilePath()
    const projectConfigPath = CONFIG_PATHS.getProjectConfigFilePath()

    // Check if either global or project config exists
    const fs = await import('fs')
    const hasGlobalConfig = fs.existsSync(configPath)
    const hasProjectConfig = fs.existsSync(projectConfigPath)

    if (!hasGlobalConfig && !hasProjectConfig) {
      console.error('\x1b[31m※ Error: No configuration file found.\x1b[0m')
      console.error(
        '\x1b[31m※ Claude Composer requires a configuration file to run.\x1b[0m',
      )
      console.error(
        '\x1b[31m※ To create a config file, run: claude-composer cc-init\x1b[0m',
      )
      return {
        appConfig,
        toolsetArgs: [],
        childArgs: [],
        shouldExit: true,
        exitCode: 1,
        knownOptions,
        hasPrintOption,
      }
    }
  }

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
  if (parsedOptions.dangerouslySuppressYoloConfirmation !== undefined) {
    appConfig.dangerously_suppress_yolo_confirmation =
      parsedOptions.dangerouslySuppressYoloConfirmation
  }
  if (parsedOptions.yolo !== undefined) {
    appConfig.yolo = parsedOptions.yolo
  }
  if (parsedOptions.logAllPatternMatches !== undefined) {
    appConfig.log_all_pattern_matches = parsedOptions.logAllPatternMatches
  }
  if (parsedOptions.allowBufferSnapshots !== undefined) {
    appConfig.allow_buffer_snapshots = parsedOptions.allowBufferSnapshots
  }
  if (parsedOptions.outputFormatter !== undefined) {
    if (parsedOptions.outputFormatter === false) {
      delete appConfig.output_formatter
    } else {
      appConfig.output_formatter = parsedOptions.outputFormatter as string
    }
  }
  // Handle mode: CLI flag takes precedence over config
  if (parsedOptions.mode !== undefined) {
    appConfig.mode = parsedOptions.mode
  }
  // If no CLI flag provided, config value is preserved from loadConfigFile above

  let toolsetArgs: string[] = []
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
      // If this is an unknown option that expects a value, include the next argument too
      if (arg.startsWith('--') && !arg.includes('=') && i + 1 < argv.length) {
        const nextArg = argv[i + 1]
        // Only skip the next arg if it's not another option
        if (nextArg && !nextArg.startsWith('-')) {
          i++
          childArgs.push(nextArg)
        }
      }
    } else if (arg === '--toolset' && i + 1 < argv.length) {
      i++
    } else if (arg === '--mode' && i + 1 < argv.length) {
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
      hasPrintOption,
    }
  }

  if (isSubcommand) {
    log(`※ Accepting Claude Composer`)
    log(`※ Running Claude Code subcommand: ${subcommandResult.subcommand}`)
    return {
      appConfig,
      toolsetArgs,

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
    options,
  )
  if (!automaticAcceptanceConfirmed) {
    return {
      appConfig,
      toolsetArgs,

      childArgs,
      shouldExit: true,
      exitCode: 0,
      knownOptions,
      hasPrintOption,
    }
  }

  log('※ Getting ready to launch Claude CLI')

  return {
    appConfig,
    toolsetArgs,
    childArgs,
    tempMcpConfigPath,
    shouldExit: false,
    knownOptions,
    hasPrintOption,
    yolo: appConfig.yolo,
  }
}

import { CONFIG_PATHS } from '../config/paths'
export const getConfigDirectory = CONFIG_PATHS.getConfigDirectory
export { log, warn } from '../utils/logging.js'
