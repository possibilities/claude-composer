#!/usr/bin/env tsx

import * as os from 'node:os'
import * as pty from 'node-pty'
import { spawn, ChildProcess, execSync } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import { Command } from 'commander'
import stripAnsi from 'strip-ansi'
import * as yaml from 'js-yaml'
import notifier from 'node-notifier'
import * as readline from 'readline'
import { PatternMatcher, MatchResult } from './pattern-matcher'
import { ResponseQueue } from './response-queue'

interface AppConfig {
  show_notifications?: boolean
  dangerously_dismiss_edit_file_prompts?: boolean
  dangerously_dismiss_create_file_prompts?: boolean
  dangerously_dismiss_bash_command_prompts?: boolean
  dangerously_allow_in_dirty_directory?: boolean
  dangerously_allow_without_version_control?: boolean
  log_all_prompts?: boolean
}

interface ToolsetConfig {
  allowed?: string[]
  disallowed?: string[]
  mcp?: Record<string, any>
}

let ptyProcess: pty.IPty | undefined
let childProcess: ChildProcess | undefined
let isRawMode = false
let patternMatcher: PatternMatcher
let responseQueue: ResponseQueue
let tempMcpConfigPath: string | undefined
let appConfig: AppConfig = {
  show_notifications: true,
  dangerously_dismiss_edit_file_prompts: false,
  dangerously_dismiss_create_file_prompts: false,
  dangerously_dismiss_bash_command_prompts: false,
  dangerously_allow_in_dirty_directory: false,
  dangerously_allow_without_version_control: false,
  log_all_prompts: false,
}

function getConfigDirectory(): string {
  return (
    process.env.CLAUDE_COMPOSER_CONFIG_DIR ||
    path.join(os.homedir(), '.claude-composer')
  )
}

function getBackupDirectory(): string {
  return path.join(getConfigDirectory(), 'backups')
}

function calculateMd5(filePath: string): string {
  const content = fs.readFileSync(filePath)
  return crypto.createHash('md5').update(content).digest('hex')
}

function copyDirectory(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }

  const entries = fs.readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

function getBackupDirs(): { dir: string; mtime: number }[] {
  const backupDir = getBackupDirectory()
  if (!fs.existsSync(backupDir)) {
    return []
  }

  return fs
    .readdirSync(backupDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => {
      const dirPath = path.join(backupDir, entry.name)
      const stats = fs.statSync(dirPath)
      return { dir: entry.name, mtime: stats.mtimeMs }
    })
    .sort((a, b) => a.mtime - b.mtime)
}

function ensureBackupDirectory(): void {
  const backupDir = getBackupDirectory()
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }
}

function createBackup(md5: string): void {
  const sourceDir = path.join(os.homedir(), '.claude', 'local')
  const backupDir = path.join(getBackupDirectory(), md5)

  if (fs.existsSync(backupDir)) {
    return
  }

  log(`※ Creating backup of current claude app`)

  const existingBackups = getBackupDirs()
  if (existingBackups.length >= 5) {
    const oldestBackup = existingBackups[0]
    const oldestBackupPath = path.join(getBackupDirectory(), oldestBackup.dir)
    log(`※ Removing oldest backup: ${oldestBackup.dir}`)
    fs.rmSync(oldestBackupPath, { recursive: true, force: true })
  }

  copyDirectory(sourceDir, backupDir)
  log(`※ Backup created successfully`)
}

async function loadConfig(configPath?: string): Promise<void> {
  const finalConfigPath =
    configPath || path.join(getConfigDirectory(), 'config.yaml')

  if (fs.existsSync(finalConfigPath)) {
    try {
      const configData = fs.readFileSync(finalConfigPath, 'utf8')
      const parsed = yaml.load(configData) as AppConfig
      appConfig = { ...appConfig, ...parsed }
    } catch (error) {
      console.error('Error loading configuration file:', error)
    }
  }
}

function ensureConfigDirectory(): void {
  const configDir = getConfigDirectory()
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true })
  }
}

async function loadToolset(toolsetName: string): Promise<ToolsetConfig> {
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
    const parsed = yaml.load(toolsetData) as ToolsetConfig
    return parsed
  } catch (error) {
    throw new Error(`Error loading toolset file: ${error}`)
  }
}

function createTempMcpConfig(mcp: Record<string, any>): string {
  const tempFileName = `claude-composer-mcp-${Date.now()}-${Math.random().toString(36).substring(2, 9)}.json`
  const tempFilePath = path.join(os.tmpdir(), tempFileName)

  const mcpConfig = {
    mcpServers: mcp,
  }

  fs.writeFileSync(tempFilePath, JSON.stringify(mcpConfig, null, 2))

  return tempFilePath
}

function buildToolsetArgs(toolsetConfig: ToolsetConfig): string[] {
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

  if (toolsetConfig.mcp) {
    tempMcpConfigPath = createTempMcpConfig(toolsetConfig.mcp)
    args.push('--mcp-config', tempMcpConfigPath)
  }

  return args
}

export { loadConfig, appConfig, getConfigDirectory }

async function initializePatterns() {
  const patternsPath = process.env.CLAUDE_PATTERNS_PATH || './patterns'
  const { PATTERNS, SETTINGS } = await import(patternsPath)

  patternMatcher = new PatternMatcher(SETTINGS.bufferSize)
  responseQueue = new ResponseQueue()

  PATTERNS.forEach(pattern => {
    if (
      pattern.id === 'edit-file-prompt' &&
      !appConfig.dangerously_dismiss_edit_file_prompts
    ) {
      return
    }
    if (
      pattern.id === 'create-file-prompt' &&
      !appConfig.dangerously_dismiss_create_file_prompts
    ) {
      return
    }
    if (
      pattern.id === 'bash-command-prompt' &&
      !appConfig.dangerously_dismiss_bash_command_prompts
    ) {
      return
    }

    const isLogPattern = pattern.action.type === 'log'
    if (isLogPattern && !appConfig.log_all_prompts) {
      return
    }

    patternMatcher.addPattern(pattern)
  })
}

const defaultChildAppPath = path.join(
  os.homedir(),
  '.claude',
  'local',
  'claude',
)

const childAppPath = process.env.CLAUDE_APP_PATH || defaultChildAppPath

function cleanup() {
  if (isRawMode && process.stdin.isTTY) {
    process.stdin.setRawMode(false)
    isRawMode = false
  }

  if (ptyProcess) {
    try {
      ptyProcess.kill()
    } catch (e) {}
  }

  if (childProcess) {
    try {
      childProcess.kill()
    } catch (e) {}
  }

  if (tempMcpConfigPath && fs.existsSync(tempMcpConfigPath)) {
    try {
      fs.unlinkSync(tempMcpConfigPath)
    } catch (e) {}
  }
}

process.on('SIGINT', () => {
  cleanup()
  process.exit(130)
})

process.on('SIGTERM', () => {
  cleanup()
  process.exit(143)
})

process.on('SIGHUP', () => {
  cleanup()
  process.exit(129)
})

process.on('exit', cleanup)

process.on('uncaughtException', error => {
  console.error('Uncaught exception:', error)
  cleanup()
  process.exit(1)
})

function log(message: string) {
  console.info(`\x1b[36m${message}\x1b[0m`)
}

function warn(message: string) {
  console.warn(`\x1b[33m${message}\x1b[0m`)
}

async function askYesNo(
  question: string,
  defaultNo: boolean = true,
): Promise<boolean> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  })

  const prompt = defaultNo
    ? `\x1b[33m${question} (y/N): \x1b[0m`
    : `\x1b[33m${question} (Y/n): \x1b[0m`

  return new Promise(resolve => {
    rl.question(prompt, answer => {
      rl.close()

      if (process.stdin.isPaused()) {
        process.stdin.resume()
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

function showNotification(match: MatchResult): void {
  const projectName = path.basename(process.cwd())
  const title = '🤖 Claude Composer Next'
  const message = `Project: ${projectName}\nPattern triggered: ${match.patternId}`

  notifier.notify({
    title,
    message,
    wait: false,
    sound: false,
    timeout: 22222,
  })
}

function handlePatternMatches(data: string): void {
  const matches = patternMatcher.processData(data)

  for (const match of matches) {
    if (match.action.type === 'input') {
      responseQueue.enqueue(match.action.response)
    } else if (match.action.type === 'log') {
      const logEntry = {
        timestamp: new Date().toISOString(),
        patternId: match.patternId,
        matchedText: match.matchedText,
        bufferContent: match.strippedBufferContent,
      }
      fs.appendFileSync(match.action.path, JSON.stringify(logEntry) + '\n')
    }

    if (appConfig.show_notifications !== false) {
      showNotification(match)
    }
  }
}

async function main() {
  ensureConfigDirectory()
  ensureBackupDirectory()

  const ignoreGlobalConfig = process.argv.includes('--ignore-global-config')

  if (!ignoreGlobalConfig) {
    await loadConfig()
  } else {
    log('※ Ignoring global configuration file')
  }

  const helpRequested =
    process.argv.includes('--help') || process.argv.includes('-h')

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
      '--log-all-prompts',
      'Log all prompts (edit, create, bash command) to files in /tmp',
    )
    .option('--no-log-all-prompts', 'Do not log prompts')
    .option('--go-off', 'Go off. YOLO. What could go wrong?')
    .allowUnknownOption()
    .argument('[args...]', 'Arguments to pass to `claude`')

  if (helpRequested) {
    program.exitOverride()
    try {
      program.parse(process.argv)
    } catch (err: any) {
      if (err.exitCode === 0) {
        console.log('\n--- Claude CLI Help ---\n')

        const helpProcess = spawn(childAppPath, ['--help'], {
          stdio: 'inherit',
          env: process.env,
        })

        helpProcess.on('exit', code => {
          process.exit(code || 0)
        })

        return
      }
      throw err
    }
  } else {
    program.parse(process.argv)
  }

  const options = program.opts()

  // Build the known options set early so we can use it for filtering
  const knownOptions = new Set<string>()
  program.options.forEach(option => {
    if (option.long) knownOptions.add(option.long)
  })

  knownOptions.add('--no-show-notifications')
  knownOptions.add('--no-dangerously-dismiss-edit-file-prompts')
  knownOptions.add('--no-dangerously-dismiss-create-file-prompts')
  knownOptions.add('--no-dangerously-dismiss-bash-command-prompts')
  knownOptions.add('--no-dangerously-allow-in-dirty-directory')
  knownOptions.add('--no-dangerously-allow-without-version-control')
  knownOptions.add('--no-log-all-prompts')
  knownOptions.add('--toolset')

  // Process toolset early so we can use it in both print and interactive modes
  let toolsetArgs: string[] = []
  if (options.toolset) {
    try {
      const toolsetConfig = await loadToolset(options.toolset)
      toolsetArgs = buildToolsetArgs(toolsetConfig)
      log(`※ Loaded toolset: ${options.toolset}`)

      if (toolsetConfig.allowed && toolsetConfig.allowed.length > 0) {
        log(
          `※ Toolset ${options.toolset} allowed ${toolsetConfig.allowed.length} tool${toolsetConfig.allowed.length === 1 ? '' : 's'}`,
        )
      }

      if (toolsetConfig.disallowed && toolsetConfig.disallowed.length > 0) {
        log(
          `※ Toolset ${options.toolset} disallowed ${toolsetConfig.disallowed.length} tool${toolsetConfig.disallowed.length === 1 ? '' : 's'}`,
        )
      }

      if (toolsetConfig.mcp) {
        const mcpCount = Object.keys(toolsetConfig.mcp).length
        log(
          `※ Toolset ${options.toolset} configured ${mcpCount} MCP server${mcpCount === 1 ? '' : 's'}`,
        )
      }
    } catch (error: any) {
      console.error(`\x1b[31m※ Error: ${error.message}\x1b[0m`)
      process.exit(1)
    }
  }

  const hasPrintOption = process.argv.includes('--print')

  if (hasPrintOption) {
    log(`※ Starting Claude Code in non-interactive mode due to --print option`)

    // Filter out known options when passing to child app
    const childArgs: string[] = []
    for (let i = 2; i < process.argv.length; i++) {
      const arg = process.argv[i]
      if (!knownOptions.has(arg)) {
        childArgs.push(arg)
      } else if (arg === '--toolset' && i + 1 < process.argv.length) {
        // Skip the toolset value as well
        i++
      }
    }

    // Add the generated toolset args
    childArgs.push(...toolsetArgs)

    const printProcess = spawn(childAppPath, childArgs, {
      stdio: 'inherit',
      env: process.env,
    })

    printProcess.on('exit', code => {
      process.exit(code || 0)
    })

    return
  }

  const args = program.args
  let isSubcommand = false
  let subcommandName: string | undefined

  if (args.length > 0 && !args[0].includes(' ') && !args[0].startsWith('-')) {
    isSubcommand = true
    subcommandName = args[0]
  }

  if (isSubcommand) {
    log(`※ Bypassing Claude Composer`)
    log(`※ Running Claude Code subcommand: ${subcommandName}`)

    const childArgs = process.argv.slice(2)
    const subcommandProcess = spawn(childAppPath, childArgs, {
      stdio: 'inherit',
      env: process.env,
    })

    subcommandProcess.on('exit', code => {
      process.exit(code || 0)
    })

    return
  }

  log('※ Getting ready to launch Claude CLI')

  if (options.goOff) {
    if (
      options.dangerouslyDismissEditFilePrompts !== undefined ||
      options.dangerouslyDismissCreateFilePrompts !== undefined ||
      options.dangerouslyDismissBashCommandPrompts !== undefined
    ) {
      console.error(
        '\x1b[31m※ Error: Cannot use --go-off with individual dangerous prompt flags\x1b[0m',
      )
      console.error(
        '\x1b[31m※ The YOLO flag already sets all dangerous prompt dismissals\x1b[0m',
      )
      process.exit(1)
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
    )
    if (!proceed) {
      console.log('※ Good choice. Exiting safely.')
      process.exit(0)
    }

    appConfig.dangerously_dismiss_edit_file_prompts = true
    appConfig.dangerously_dismiss_create_file_prompts = true
    appConfig.dangerously_dismiss_bash_command_prompts = true

    warn('※ YOLO mode activated - All safety prompts disabled!')
  }

  if (options.showNotifications !== undefined) {
    appConfig.show_notifications = options.showNotifications
  }
  if (
    options.dangerouslyDismissEditFilePrompts !== undefined &&
    !options.goOff
  ) {
    appConfig.dangerously_dismiss_edit_file_prompts =
      options.dangerouslyDismissEditFilePrompts
  }
  if (
    options.dangerouslyDismissCreateFilePrompts !== undefined &&
    !options.goOff
  ) {
    appConfig.dangerously_dismiss_create_file_prompts =
      options.dangerouslyDismissCreateFilePrompts
  }
  if (
    options.dangerouslyDismissBashCommandPrompts !== undefined &&
    !options.goOff
  ) {
    appConfig.dangerously_dismiss_bash_command_prompts =
      options.dangerouslyDismissBashCommandPrompts
  }
  if (options.dangerouslyAllowInDirtyDirectory !== undefined) {
    appConfig.dangerously_allow_in_dirty_directory =
      options.dangerouslyAllowInDirtyDirectory
  }
  if (options.dangerouslyAllowWithoutVersionControl !== undefined) {
    appConfig.dangerously_allow_without_version_control =
      options.dangerouslyAllowWithoutVersionControl
  }
  if (options.logAllPrompts !== undefined) {
    appConfig.log_all_prompts = options.logAllPrompts
  }

  if (appConfig.show_notifications !== false) {
    log('※ Notifications are enabled')
  }

  if (appConfig.log_all_prompts) {
    log('※ Logging all prompts to /tmp')
  }

  try {
    execSync('git --version', { stdio: 'ignore' })
  } catch (error) {
    console.error('※ Git is not installed or not in PATH')
    console.error('※ Please install git to use this tool')
    process.exit(1)
  }

  if (!fs.existsSync(childAppPath)) {
    console.error(`※ Claude CLI not found at: ${childAppPath}`)
    console.error(
      '※ Please install Claude CLI or set CLAUDE_APP_PATH environment variable',
    )
    process.exit(1)
  }

  try {
    fs.accessSync(childAppPath, fs.constants.X_OK)
  } catch (error) {
    console.error(`※ Claude CLI is not executable: ${childAppPath}`)
    console.error('※ Please check file permissions')
    process.exit(1)
  }

  const gitDir = path.join(process.cwd(), '.git')
  if (!fs.existsSync(gitDir)) {
    if (!appConfig.dangerously_allow_without_version_control) {
      console.error('※ Running in project without version control')
      const proceed = await askYesNo('※ Do you want to continue?', true)
      if (!proceed) {
        console.error('※ Exiting: Version control is required')
        process.exit(1)
      }
    }
    warn('※ Dangerously running in project without version control')
  } else {
    if (!appConfig.dangerously_allow_in_dirty_directory) {
      try {
        const gitStatus = execSync('git status --porcelain', {
          encoding: 'utf8',
          cwd: process.cwd(),
        }).trim()

        if (gitStatus !== '') {
          console.error('※ Running in directory with uncommitted changes')
          const proceed = await askYesNo('※ Do you want to continue?', true)
          if (!proceed) {
            console.error('※ Exiting: Clean working directory required')
            process.exit(1)
          }
          warn('※ Dangerously running in directory with uncommitted changes')
        }
      } catch (error) {
        warn('※ Could not check git status')
      }
    } else {
      try {
        const gitStatus = execSync('git status --porcelain', {
          encoding: 'utf8',
          cwd: process.cwd(),
        }).trim()

        if (gitStatus !== '') {
          warn('※ Dangerously running in directory with uncommitted changes')
        }
      } catch (error) {
        warn('※ Could not check git status')
      }
    }
  }

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

  if (childAppPath === defaultChildAppPath) {
    try {
      const childCliPath = path.join(
        os.homedir(),
        '.claude',
        'local',
        'node_modules',
        '@anthropic-ai',
        'claude-code',
        'cli.js',
      )

      if (fs.existsSync(childCliPath)) {
        const md5 = calculateMd5(childCliPath)
        createBackup(md5)
      } else {
        warn(`※ Child CLI not found at expected location: ${childCliPath}`)
      }
    } catch (error) {
      warn(`※ Failed to create backup: ${error}`)
    }
  }

  await initializePatterns()

  log('※ Ready, Passing off control to Claude CLI')

  const childArgs: string[] = []

  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i]
    if (!knownOptions.has(arg)) {
      childArgs.push(arg)
    } else if (arg === '--toolset' && i + 1 < process.argv.length) {
      i++
    }
  }

  childArgs.push(...toolsetArgs)

  if (process.stdin.isTTY) {
    ptyProcess = pty.spawn(childAppPath, childArgs, {
      name: 'xterm-color',
      cols: process.stdout.columns || 80,
      rows: process.stdout.rows || 30,
      env: process.env,
      cwd: process.env.PWD,
    })

    responseQueue.setTargets(ptyProcess, undefined)

    ptyProcess.onData((data: string) => {
      process.stdout.write(data)
      handlePatternMatches(data)
    })

    process.stdin.removeAllListeners('data')

    process.stdin.setRawMode(true)
    isRawMode = true

    process.stdin.on('data', (data: Buffer) => {
      ptyProcess.write(data.toString())
    })

    ptyProcess.onExit(exitCode => {
      cleanup()
      process.exit(exitCode.exitCode || 0)
    })

    process.stdout.on('resize', () => {
      ptyProcess.resize(process.stdout.columns || 80, process.stdout.rows || 30)
    })
  } else {
    childProcess = spawn(childAppPath, childArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        FORCE_COLOR: '1',
        TERM: process.env.TERM || 'xterm-256color',
      },
    })

    responseQueue.setTargets(undefined, childProcess)

    process.stdin.pipe(childProcess.stdin!)

    childProcess.stdout!.on('data', (data: Buffer) => {
      const dataStr = data.toString()
      process.stdout.write(data)
      handlePatternMatches(dataStr)
    })

    childProcess.stderr!.pipe(process.stderr)

    childProcess.on('exit', (code: number | null) => {
      cleanup()
      process.exit(code || 0)
    })
  }
}

main().catch(error => {
  console.error('Failed to start CLI:', error)
  process.exit(1)
})
