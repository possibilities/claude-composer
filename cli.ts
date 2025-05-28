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
import { PatternMatcher, MatchResult } from './pattern-matcher'
import { ResponseQueue } from './response-queue'

interface AppConfig {
  show_notifications?: boolean
}

let ptyProcess: pty.IPty | undefined
let childProcess: ChildProcess | undefined
let isRawMode = false
let patternMatcher: PatternMatcher
let responseQueue: ResponseQueue
let appConfig: AppConfig = { show_notifications: true }

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
    .option('--show-notifications', 'Show notifications (default: true)')
    .option('--no-show-notifications', 'Disable notifications')
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

  // CLI flag takes precedence over YAML config, default true
  if (options.showNotifications !== undefined) {
    appConfig.show_notifications = options.showNotifications
  }

  if (appConfig.show_notifications !== false) {
    log('※ Notifications are enabled')
  }

  log('※ Ready, Passing off control to Claude CLI')

  const knownOptions = new Set<string>()
  program.options.forEach(option => {
    if (option.long) knownOptions.add(option.long)
  })

  const childArgs: string[] = []
  for (let i = 2; i < process.argv.length; i++) {
    const arg = process.argv[i]
    if (!knownOptions.has(arg)) {
      childArgs.push(arg)
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
