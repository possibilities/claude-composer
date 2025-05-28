#!/usr/bin/env tsx

import * as os from 'node:os'
import * as pty from 'node-pty'
import { spawn, ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
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
  dangerously_allow_in_dirty_directory?: boolean
  dangerously_allow_without_version_control?: boolean
}

let ptyProcess: pty.IPty | undefined
let childProcess: ChildProcess | undefined
let isRawMode = false
let patternMatcher: PatternMatcher
let responseQueue: ResponseQueue
let appConfig: AppConfig = {
  show_notifications: true,
  dangerously_dismiss_edit_file_prompts: false,
  dangerously_dismiss_create_file_prompts: false,
  dangerously_allow_in_dirty_directory: false,
  dangerously_allow_without_version_control: false,
}

async function loadConfig(configPath?: string): Promise<void> {
  const finalConfigPath =
    configPath || path.join(os.homedir(), '.claude-composer', 'config.yaml')

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
  const configDir = path.join(os.homedir(), '.claude-composer')
  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true })
  }
}

// Export for testing
export { loadConfig, appConfig }

async function initializePatterns() {
  // Load patterns from specified file or default
  const patternsPath = process.env.CLAUDE_PATTERNS_PATH || './patterns'
  const { PATTERNS, SETTINGS } = await import(patternsPath)

  patternMatcher = new PatternMatcher(SETTINGS.bufferSize)
  responseQueue = new ResponseQueue()

  PATTERNS.forEach(pattern => {
    patternMatcher.addPattern(pattern)
  })
}

const childAppPath =
  process.env.CLAUDE_APP_PATH ||
  path.join(os.homedir(), '.claude', 'local', 'claude')

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

  const prompt = defaultNo ? `${question} (y/N): ` : `${question} (Y/n): `

  return new Promise(resolve => {
    rl.question(prompt, answer => {
      rl.close()
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
  const title = '🤖 Claude Composer Next'
  const message = `Pattern triggered: ${match.patternId}\nMatched: ${stripAnsi(match.matchedText).substring(0, 100)}`

  notifier.notify({
    title,
    message,
    timeout: false, // Stay forever until dismissed
    wait: false,
    sound: false,
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
        matchedText: stripAnsi(match.matchedText),
        bufferContent: stripAnsi(match.bufferContent),
      }
      fs.appendFileSync(match.action.path, JSON.stringify(logEntry) + '\n')
    }

    // Show notification if enabled (default true)
    if (appConfig.show_notifications !== false) {
      showNotification(match)
    }
  }
}

async function main() {
  ensureConfigDirectory()
  await loadConfig()
  await initializePatterns()

  // Check if --help was requested before parsing
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
      '--go-off-yolo-what-could-go-wrong',
      'Go off. YOLO. What could go wrong?',
    )
    .allowUnknownOption()
    .argument('[args...]', 'Arguments to pass to `claude`')

  if (helpRequested) {
    // Configure commander to not exit on help
    program.exitOverride()
    try {
      program.parse(process.argv)
    } catch (err: any) {
      // Commander throws an error with exitCode 0 for help
      if (err.exitCode === 0) {
        // Now show the child app's help
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

  log('※ Getting ready to launch Claude CLI')

  // CLI flags take precedence over YAML config
  if (options.showNotifications !== undefined) {
    appConfig.show_notifications = options.showNotifications
  }
  if (options.dangerouslyDismissEditFilePrompts !== undefined) {
    appConfig.dangerously_dismiss_edit_file_prompts =
      options.dangerouslyDismissEditFilePrompts
  }
  if (options.dangerouslyDismissCreateFilePrompts !== undefined) {
    appConfig.dangerously_dismiss_create_file_prompts =
      options.dangerouslyDismissCreateFilePrompts
  }
  if (options.dangerouslyAllowInDirtyDirectory !== undefined) {
    appConfig.dangerously_allow_in_dirty_directory =
      options.dangerouslyAllowInDirtyDirectory
  }
  if (options.dangerouslyAllowWithoutVersionControl !== undefined) {
    appConfig.dangerously_allow_without_version_control =
      options.dangerouslyAllowWithoutVersionControl
  }

  if (appConfig.show_notifications !== false) {
    log('※ Notifications are enabled')
  }

  // Check for version control
  const gitDir = path.join(process.cwd(), '.git')
  if (!fs.existsSync(gitDir)) {
    if (!appConfig.dangerously_allow_without_version_control) {
      console.error('※ Running in project without version control')
      const proceed = await askYesNo('Do you want to continue?', true)
      if (!proceed) {
        console.error('※ Exiting: Version control is required')
        process.exit(1)
      }
    }
    warn('※ Dangerously running in project without version control')
  }

  log('※ Ready, Passing off control to Claude CLI')

  const knownOptions = new Set<string>()
  program.options.forEach(option => {
    if (option.long) knownOptions.add(option.long)
  })

  // Add negatable options
  knownOptions.add('--no-show-notifications')
  knownOptions.add('--no-dangerously-dismiss-edit-file-prompts')
  knownOptions.add('--no-dangerously-dismiss-create-file-prompts')
  knownOptions.add('--no-dangerously-allow-in-dirty-directory')
  knownOptions.add('--no-dangerously-allow-without-version-control')

  const childArgs: string[] = []
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i]
    if (!knownOptions.has(arg)) {
      childArgs.push(arg)
    } else if (arg === '--toolset' && i + 1 < process.argv.length) {
      // Skip the next argument which is the toolset value
      i++
    }
  }

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
