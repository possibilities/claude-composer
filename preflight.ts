import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import * as util from 'node:util'
import { execSync } from 'child_process'
import { Command } from 'commander'
import * as yaml from 'js-yaml'
import * as readline from 'readline'
import {
  validateAppConfig,
  validateToolsetConfig,
  type AppConfig,
  type ToolsetConfig,
} from './config-schemas.js'

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
  toolset?: string
  ignoreGlobalConfig?: boolean
  defaultToolsets?: boolean
  goOff?: boolean
}

// Create a debug logger that only outputs when NODE_DEBUG=claude-composer is set
// This ensures logs only appear in inspector/debug mode and not in the terminal
const debugLog = util.debuglog('claude-composer')

export function getConfigDirectory(): string {
  return (
    process.env.CLAUDE_COMPOSER_CONFIG_DIR ||
    path.join(os.homedir(), '.claude-composer')
  )
}

export function ensureConfigDirectory(): void {
  const configDir = getConfigDirectory()
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true })
  }
}

export async function loadConfigFile(
  configPath?: string,
): Promise<Partial<AppConfig>> {
  const finalConfigPath =
    configPath || path.join(getConfigDirectory(), 'config.yaml')

  if (!fs.existsSync(finalConfigPath)) {
    return {}
  }

  try {
    const configData = fs.readFileSync(finalConfigPath, 'utf8')
    const parsed = yaml.load(configData)
    const result = validateAppConfig(parsed)

    if (!result.success) {
      console.error(`\nError: Invalid configuration in ${finalConfigPath}`)
      console.error('\nValidation errors:')
      result.error.issues.forEach(issue => {
        const fieldPath = issue.path.length > 0 ? issue.path.join('.') : 'root'
        console.error(`  • ${fieldPath}: ${issue.message}`)
      })
      console.error('')
      throw new Error('Configuration validation failed')
    }

    return result.data
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Configuration validation failed'
    ) {
      throw error
    }
    throw new Error(`Error loading configuration file: ${error}`)
  }
}

export async function loadToolsetFile(
  toolsetName: string,
): Promise<ToolsetConfig> {
  const toolsetPath = path.join(
    getConfigDirectory(),
    'toolsets',
    `${toolsetName}.yaml`,
  )

  if (!fs.existsSync(toolsetPath)) {
    throw new Error(`Toolset file not found: ${toolsetPath}`)
  }

  try {
    const toolsetData = fs.readFileSync(toolsetPath, 'utf8')
    const parsed = yaml.load(toolsetData)
    const result = validateToolsetConfig(parsed)

    if (!result.success) {
      console.error(`\nError: Invalid toolset configuration in ${toolsetPath}`)
      console.error('\nValidation errors:')
      result.error.issues.forEach(issue => {
        const fieldPath = issue.path.length > 0 ? issue.path.join('.') : 'root'
        console.error(`  • ${fieldPath}: ${issue.message}`)
      })
      console.error('')
      throw new Error('Toolset validation failed')
    }

    return result.data
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === 'Toolset validation failed'
    ) {
      throw error
    }
    throw new Error(`Error loading toolset file: ${error}`)
  }
}

export function createTempMcpConfig(mcp: Record<string, any>): string {
  const tempFileName = `claude-composer-mcp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.json`
  const tempFilePath = path.join(os.tmpdir(), tempFileName)

  const mcpConfig = {
    mcpServers: mcp,
  }

  fs.writeFileSync(tempFilePath, JSON.stringify(mcpConfig, null, 2))
  debugLog('Temp MCP config written to:', tempFilePath, mcpConfig)

  return tempFilePath
}

export function buildToolsetArgs(toolsetConfig: ToolsetConfig): string[] {
  const args: string[] = []

  if (toolsetConfig.allowed) {
    for (const tool of toolsetConfig.allowed) {
      args.push('--allowedTools', tool)
    }
  }

  if (toolsetConfig.disallowed) {
    for (const tool of toolsetConfig.disallowed) {
      args.push('--disallowedTools', tool)
    }
  }

  return args
}

export function parseCommandLineArgs(argv: string[]): {
  program: Command
  options: ParsedOptions
  args: string[]
  helpRequested: boolean
  hasPrintOption: boolean
} {
  const helpRequested = argv.includes('--help') || argv.includes('-h')
  const hasPrintOption = argv.includes('--print')

  const program = new Command()
  program
    .name('claude-composer')
    .description('A wrapper that enhances the Claude Code CLI')
    .option(
      '--show-notifications',
      'Show desktop notifications for file edits, creates, and prompts',
    )
    .option('--no-show-notifications', 'Disable notifications')
    .option(
      '--dangerously-dismiss-edit-file-prompts',
      'Automatically dismiss edit file prompts',
    )
    .option(
      '--no-dangerously-dismiss-edit-file-prompts',
      'Do not automatically dismiss edit file prompts',
    )
    .option(
      '--dangerously-dismiss-create-file-prompts',
      'Automatically dismiss create file prompts',
    )
    .option(
      '--no-dangerously-dismiss-create-file-prompts',
      'Do not automatically dismiss create file prompts',
    )
    .option(
      '--dangerously-dismiss-bash-command-prompts',
      'Automatically dismiss bash command prompts',
    )
    .option(
      '--no-dangerously-dismiss-bash-command-prompts',
      'Do not automatically dismiss bash command prompts',
    )
    .option(
      '--dangerously-allow-in-dirty-directory',
      'Allow running in a directory with uncommitted git changes',
    )
    .option(
      '--no-dangerously-allow-in-dirty-directory',
      'Do not allow running in a directory with uncommitted git changes',
    )
    .option(
      '--dangerously-allow-without-version-control',
      'Allow running in a directory not under version control',
    )
    .option(
      '--no-dangerously-allow-without-version-control',
      'Do not allow running in a directory not under version control',
    )
    .option(
      '--toolset <name>',
      'Use a predefined toolset from ~/.claude-composer/toolsets/ directory',
    )
    .option(
      '--ignore-global-config',
      'Ignore configuration from ~/.claude-composer/config.yaml',
    )
    .option(
      '--no-default-toolsets',
      'Ignore default toolsets from the main config file',
    )
    .option('--go-off', 'Go off. YOLO. What could go wrong?')
    .allowUnknownOption()
    .argument('[args...]', 'Arguments to pass to `claude`')

  if (helpRequested) {
    program.exitOverride()
    try {
      program.parse(argv)
    } catch (err: any) {
      if (err.exitCode === 0) {
        // Help was displayed, we'll handle this in the caller
        return {
          program,
          options: {},
          args: [],
          helpRequested: true,
          hasPrintOption,
        }
      }
      throw err
    }
  } else {
    program.parse(argv)
  }

  const options = program.opts() as ParsedOptions
  const args = program.args

  return {
    program,
    options,
    args,
    helpRequested,
    hasPrintOption,
  }
}

export function buildKnownOptionsSet(program: Command): Set<string> {
  const knownOptions = new Set<string>()

  program.options.forEach(option => {
    if (option.long) knownOptions.add(option.long)
  })

  // Add negation options
  knownOptions.add('--no-show-notifications')
  knownOptions.add('--no-dangerously-dismiss-edit-file-prompts')
  knownOptions.add('--no-dangerously-dismiss-create-file-prompts')
  knownOptions.add('--no-dangerously-dismiss-bash-command-prompts')
  knownOptions.add('--no-dangerously-allow-in-dirty-directory')
  knownOptions.add('--no-dangerously-allow-without-version-control')
  knownOptions.add('--toolset')
  knownOptions.add('--no-default-toolsets')

  return knownOptions
}

export async function askYesNo(
  question: string,
  defaultNo: boolean = true,
  stdin?: NodeJS.ReadableStream,
  stdout?: NodeJS.WritableStream,
): Promise<boolean> {
  const prompt = defaultNo
    ? `\x1b[33m${question} (y/N): \x1b[0m`
    : `\x1b[33m${question} (Y/n): \x1b[0m`

  const input = stdin || process.stdin
  const output = stdout || process.stdout

  // If stdin is being piped, we need to use a different approach
  if (!input.isTTY) {
    // In production, we want to read from /dev/tty to avoid consuming piped data
    // In tests, /dev/tty might not be available, so we fall back to stdin
    let ttyInput: NodeJS.ReadableStream = input
    let tty: fs.ReadStream | undefined

    try {
      // Only try /dev/tty if we're not in a test environment
      // Tests will have stdin available for interaction
      if (
        !process.env.NODE_ENV?.includes('test') &&
        fs.existsSync('/dev/tty')
      ) {
        tty = fs.createReadStream('/dev/tty')
        // Test if we can actually use it
        await new Promise((resolve, reject) => {
          tty!.once('error', reject)
          tty!.once('open', resolve)
        })
        ttyInput = tty
      }
    } catch (error) {
      // Fall back to stdin if /dev/tty fails
      if (tty) {
        tty.close()
      }
    }

    const rl = readline.createInterface({
      input: ttyInput,
      output,
    })

    return new Promise(resolve => {
      rl.question(prompt, answer => {
        rl.close()
        if (tty) {
          tty.close()
        }

        const normalizedAnswer = answer.trim().toLowerCase()

        if (normalizedAnswer === '') {
          resolve(!defaultNo)
        } else {
          resolve(normalizedAnswer === 'y' || normalizedAnswer === 'yes')
        }
      })
    })
  } else {
    // Normal TTY mode
    const rl = readline.createInterface({
      input,
      output,
    })

    return new Promise(resolve => {
      rl.question(prompt, answer => {
        rl.close()

        if (input.isPaused && 'resume' in input) {
          input.resume()
        }

        const normalizedAnswer = answer.trim().toLowerCase()

        if (normalizedAnswer === '') {
          resolve(!defaultNo)
        } else {
          resolve(normalizedAnswer === 'y' || normalizedAnswer === 'yes')
        }
      })
    })
  }
}

export function checkGitInstalled(): void {
  try {
    execSync('git --version', { stdio: 'ignore' })
  } catch (error) {
    throw new Error(
      'Git is not installed or not in PATH. Please install git to use this tool',
    )
  }
}

export function checkChildAppPath(childAppPath: string): void {
  if (!fs.existsSync(childAppPath)) {
    throw new Error(
      `Claude CLI not found at: ${childAppPath}\n` +
        'Please install Claude CLI or set CLAUDE_APP_PATH environment variable',
    )
  }

  try {
    fs.accessSync(childAppPath, fs.constants.X_OK)
  } catch (error) {
    throw new Error(
      `Claude CLI is not executable: ${childAppPath}\n` +
        'Please check file permissions',
    )
  }
}

export async function checkVersionControl(
  cwd: string,
  allowWithoutVersionControl: boolean,
  options?: PreflightOptions,
): Promise<boolean> {
  const gitDir = path.join(cwd, '.git')

  if (!fs.existsSync(gitDir)) {
    if (!allowWithoutVersionControl) {
      console.error('※ Running in project without version control')
      const proceed = await askYesNo(
        '※ Do you want to continue?',
        true,
        options?.stdin,
        options?.stdout,
      )
      if (!proceed) {
        throw new Error('Version control is required')
      }
    }
    return false // No version control
  }

  return true // Has version control
}

export async function checkDirtyDirectory(
  cwd: string,
  allowInDirtyDirectory: boolean,
  options?: PreflightOptions,
): Promise<boolean> {
  try {
    const gitStatus = execSync('git status --porcelain', {
      encoding: 'utf8',
      cwd,
    }).trim()

    if (gitStatus !== '') {
      if (!allowInDirtyDirectory) {
        console.error('※ Running in directory with uncommitted changes')
        const proceed = await askYesNo(
          '※ Do you want to continue?',
          true,
          options?.stdin,
          options?.stdout,
        )
        if (!proceed) {
          throw new Error('Clean working directory required')
        }
      }
      return true // Is dirty
    }

    return false // Is clean
  } catch (error) {
    console.warn('※ Could not check git status')
    return false // Assume clean if we can't check
  }
}

export async function handleGoOffMode(
  options: ParsedOptions,
  preflightOptions?: PreflightOptions,
): Promise<boolean> {
  if (!options.goOff) {
    return false
  }

  if (
    options.dangerouslyDismissEditFilePrompts !== undefined ||
    options.dangerouslyDismissCreateFilePrompts !== undefined ||
    options.dangerouslyDismissBashCommandPrompts !== undefined
  ) {
    throw new Error(
      'Cannot use --go-off with individual dangerous prompt flags\n' +
        'The YOLO flag already sets all dangerous prompt dismissals',
    )
  }

  console.log(
    '\x1b[31m╔════════════════════════════════════════════════════════════════╗\x1b[0m',
  )
  console.log(
    '\x1b[31m║                       🚨 DANGER ZONE 🚨                        ║\x1b[0m',
  )
  console.log(
    '\x1b[31m╠════════════════════════════════════════════════════════════════╣\x1b[0m',
  )
  console.log(
    '\x1b[31m║ You have enabled --go-off                                      ║\x1b[0m',
  )
  console.log(
    '\x1b[31m║                                                                ║\x1b[0m',
  )
  console.log(
    '\x1b[31m║ This will:                                                     ║\x1b[0m',
  )
  console.log(
    '\x1b[31m║ • Automatically dismiss ALL file edit prompts                  ║\x1b[0m',
  )
  console.log(
    '\x1b[31m║ • Automatically dismiss ALL file creation prompts              ║\x1b[0m',
  )
  console.log(
    '\x1b[31m║ • Automatically dismiss ALL bash command prompts               ║\x1b[0m',
  )
  console.log(
    '\x1b[31m║                                                                ║\x1b[0m',
  )
  console.log(
    '\x1b[31m║ Claude will have FULL CONTROL to modify files and run commands ║\x1b[0m',
  )
  console.log(
    '\x1b[31m║ without ANY confirmation!                                      ║\x1b[0m',
  )
  console.log(
    '\x1b[31m║                                                                ║\x1b[0m',
  )
  console.log(
    '\x1b[31m║ ⚠️  This is EXTREMELY DANGEROUS and should only be used when    ║\x1b[0m',
  )
  console.log(
    '\x1b[31m║    you fully trust the AI and understand the risks!            ║\x1b[0m',
  )
  console.log(
    '\x1b[31m╚════════════════════════════════════════════════════════════════╝\x1b[0m',
  )

  const proceed = await askYesNo(
    'Are you ABSOLUTELY SURE you want to continue?',
    true,
    preflightOptions?.stdin,
    preflightOptions?.stdout,
  )

  if (!proceed) {
    console.log('※ Good choice. Exiting safely.')
    return false
  }

  console.warn('※ YOLO mode activated - All safety prompts disabled!')
  return true
}

export function displayDangerousWarnings(appConfig: AppConfig): void {
  if (appConfig.dangerously_dismiss_edit_file_prompts) {
    console.log(
      '\x1b[33m⚠️  WARNING: --dangerously-dismiss-edit-file-prompts is enabled\x1b[0m',
    )
    console.log(
      '\x1b[33m   All file edit prompts will be automatically dismissed!\x1b[0m',
    )
  }
  if (appConfig.dangerously_dismiss_create_file_prompts) {
    console.log(
      '\x1b[33m⚠️  WARNING: --dangerously-dismiss-create-file-prompts is enabled\x1b[0m',
    )
    console.log(
      '\x1b[33m   All file creation prompts will be automatically dismissed!\x1b[0m',
    )
  }
  if (appConfig.dangerously_dismiss_bash_command_prompts) {
    console.log(
      '\x1b[33m⚠️  WARNING: --dangerously-dismiss-bash-command-prompts is enabled\x1b[0m',
    )
    console.log(
      '\x1b[33m   All bash command prompts will be automatically dismissed!\x1b[0m',
    )
  }
}

export function log(message: string) {
  console.info(`\x1b[36m${message}\x1b[0m`)
}

export function warn(message: string) {
  console.warn(`\x1b[33m${message}\x1b[0m`)
}

export async function mergeToolsets(
  toolsetsToLoad: string[],
): Promise<ToolsetConfig> {
  let mergedConfig: ToolsetConfig = {
    allowed: [],
    disallowed: [],
    mcp: {},
  }

  for (const toolsetName of toolsetsToLoad) {
    const toolsetConfig = await loadToolsetFile(toolsetName)

    // Merge allowed tools
    if (toolsetConfig.allowed) {
      mergedConfig.allowed = mergedConfig.allowed || []
      mergedConfig.allowed.push(...toolsetConfig.allowed)
    }

    // Merge disallowed tools
    if (toolsetConfig.disallowed) {
      mergedConfig.disallowed = mergedConfig.disallowed || []
      mergedConfig.disallowed.push(...toolsetConfig.disallowed)
    }

    // Merge MCP configs
    if (toolsetConfig.mcp) {
      mergedConfig.mcp = {
        ...mergedConfig.mcp,
        ...toolsetConfig.mcp,
      }
    }

    log(`※ Loaded toolset: ${toolsetName}`)

    if (toolsetConfig.allowed && toolsetConfig.allowed.length > 0) {
      log(
        `※ Toolset ${toolsetName} allowed ${toolsetConfig.allowed.length} tool${toolsetConfig.allowed.length === 1 ? '' : 's'}`,
      )
    }

    if (toolsetConfig.disallowed && toolsetConfig.disallowed.length > 0) {
      log(
        `※ Toolset ${toolsetName} disallowed ${toolsetConfig.disallowed.length} tool${toolsetConfig.disallowed.length === 1 ? '' : 's'}`,
      )
    }

    if (toolsetConfig.mcp) {
      const mcpCount = Object.keys(toolsetConfig.mcp).length
      log(
        `※ Toolset ${toolsetName} configured ${mcpCount} MCP server${mcpCount === 1 ? '' : 's'}`,
      )
    }
  }

  return mergedConfig
}

export async function runPreflight(
  argv: string[],
  options?: PreflightOptions,
): Promise<PreflightResult> {
  // Default config
  let appConfig: AppConfig = {
    show_notifications: true,
    dangerously_dismiss_edit_file_prompts: false,
    dangerously_dismiss_create_file_prompts: false,
    dangerously_dismiss_bash_command_prompts: false,
    dangerously_allow_in_dirty_directory: false,
    dangerously_allow_without_version_control: false,
  }

  // Ensure config directory exists
  ensureConfigDirectory()

  // Parse command line arguments
  const {
    program,
    options: parsedOptions,
    args,
    helpRequested,
    hasPrintOption,
  } = parseCommandLineArgs(argv)

  // Build known options set
  const knownOptions = buildKnownOptionsSet(program)

  // Check if we're in a special mode that needs early exit
  const isHelp = helpRequested
  const isPrint = hasPrintOption
  const isSubcommand =
    args.length > 0 && !args[0].includes(' ') && !args[0].startsWith('-')

  // Load config file
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

  // Apply command-line options to config
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

  // Handle toolsets (needed for print option)
  let toolsetArgs: string[] = []
  let tempMcpConfigPath: string | undefined

  // Determine which toolsets to load
  let toolsetsToLoad: string[] = []
  if (parsedOptions.toolset) {
    // If --toolset is provided, only use that toolset
    toolsetsToLoad = [parsedOptions.toolset]
  } else if (
    appConfig.toolsets &&
    appConfig.toolsets.length > 0 &&
    parsedOptions.defaultToolsets !== false
  ) {
    // Otherwise, use default toolsets from config unless --no-default-toolsets is specified
    toolsetsToLoad = appConfig.toolsets
  } else if (
    appConfig.toolsets &&
    appConfig.toolsets.length > 0 &&
    parsedOptions.defaultToolsets === false
  ) {
    // Log message when ignoring default toolsets
    log('※ Ignoring default toolsets from configuration')
  }

  // Load and merge all toolsets
  if (toolsetsToLoad.length > 0) {
    try {
      const mergedConfig = await mergeToolsets(toolsetsToLoad)
      toolsetArgs = buildToolsetArgs(mergedConfig)

      // Create temp MCP config if needed
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

  // Build child args
  const childArgs: string[] = []
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i]
    if (!knownOptions.has(arg)) {
      childArgs.push(arg)
    } else if (arg === '--toolset' && i + 1 < argv.length) {
      // Skip the toolset value as well
      i++
    }
  }

  childArgs.push(...toolsetArgs)

  // Handle early exits with proper toolset args
  if (isHelp) {
    return {
      appConfig,
      toolsetArgs,
      childArgs,
      shouldExit: true,
      exitCode: 0,
      knownOptions,
    }
  }

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

  // Continue with normal processing for interactive mode

  // Handle --go-off mode
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

  // Check git installation
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

  // Check child app path
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

  // Check version control and dirty directory
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

  // Display status messages
  if (appConfig.show_notifications !== false) {
    log('※ Notifications are enabled')
  }

  // Display dangerous warnings
  displayDangerousWarnings(appConfig)

  log('※ Getting ready to launch Claude CLI')

  return {
    appConfig,
    toolsetArgs,
    childArgs,
    tempMcpConfigPath,
    shouldExit: false,
    knownOptions,
  }
}
