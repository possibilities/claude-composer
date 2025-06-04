import * as os from 'node:os'
import * as fs from 'fs'
import * as path from 'path'
import * as util from 'node:util'
import { spawn } from 'child_process'
import { fileURLToPath } from 'node:url'
import picomatch from 'picomatch'
import { PatternMatcher, MatchResult } from './patterns/matcher'
import { ResponseQueue } from './core/response-queue'
import { patterns } from './patterns/registry'
import { type AppConfig, type RulesetConfig } from './config/schemas.js'
import { runPreflight, log, warn } from './core/preflight.js'
import {
  showNotification,
  showPatternNotification,
} from './utils/notifications.js'
import { TerminalManager } from './terminal/manager'
import { RemoteNotificationService } from './services/remote-notifications'
import {
  ensureBackupDirectory,
  createBackup,
  calculateMd5,
  saveTerminalSnapshot,
} from './terminal/utils'
import type { TerminalConfig } from './terminal/types'
import { ActivityMonitor } from './core/activity-monitor'
import { isFileInProjectRoot } from './utils/file-utils.js'
import {
  checkAcceptConfig,
  shouldAcceptPrompt as shouldAcceptPromptUtil,
} from './utils/prompt-acceptance.js'

let patternMatcher: PatternMatcher
let responseQueue: ResponseQueue
let terminalManager: TerminalManager
let tempMcpConfigPath: string | undefined
let appConfig: AppConfig | undefined
let mergedRuleset: RulesetConfig | undefined
let confirmationPatternTriggers: string[] = []
let activityMonitor: ActivityMonitor | undefined

const debugLog = util.debuglog('claude-composer')

export { appConfig }

async function initializePatterns(): Promise<boolean> {
  let patternsToUse = patterns

  if (process.env.CLAUDE_PATTERNS_PATH) {
    try {
      const customPatterns = await import(process.env.CLAUDE_PATTERNS_PATH)
      // Validate custom patterns
      const { validatePatternConfigs } = await import('./config/schemas.js')
      const validationResult = validatePatternConfigs(customPatterns.patterns)
      if (!validationResult.success) {
        console.error(
          `Invalid custom pattern configuration from ${process.env.CLAUDE_PATTERNS_PATH}:`,
          JSON.stringify(validationResult.error.errors, null, 2),
        )
      } else {
        patternsToUse = validationResult.data
      }
    } catch (error) {
      console.warn(
        `Failed to load custom patterns from ${process.env.CLAUDE_PATTERNS_PATH}:`,
        error,
      )
    }
  }
  patternMatcher = new PatternMatcher(
    appConfig?.log_all_pattern_matches || false,
  )
  if (!responseQueue) {
    responseQueue = new ResponseQueue()
  }

  let hasActivePatterns = false

  const confirmationTriggers = new Set<string>()

  patternsToUse.forEach(pattern => {
    if (pattern.type === 'confirmation' && pattern.triggerText) {
      confirmationTriggers.add(pattern.triggerText)
    }

    // Always add confirmation patterns so notifications work, acceptance is handled later

    try {
      patternMatcher.addPattern(pattern)
      hasActivePatterns = true
    } catch (error) {
      console.error(`Failed to add pattern: ${error.message}`)
      throw error
    }
  })

  confirmationPatternTriggers = Array.from(confirmationTriggers)

  return hasActivePatterns
}

function cleanup() {
  if (terminalManager) {
    terminalManager.cleanup()
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
  cleanup()
  process.exit(1)
})

// Wrapper function that uses the imported utility with current app state
function shouldAcceptPrompt(match: MatchResult): boolean {
  return shouldAcceptPromptUtil(match, appConfig, mergedRuleset)
}

function handlePatternMatches(data: string, filterType?: 'confirmation'): void {
  const matches = filterType
    ? patternMatcher.processDataByType(data, filterType)
    : patternMatcher.processData(data)

  for (const match of matches) {
    let actionResponse: 'Accepted' | 'Prompted' | undefined
    let actionResponseIcon: string | undefined

    if (shouldAcceptPrompt(match)) {
      responseQueue.enqueue(match.response)
      actionResponse = 'Accepted'
      actionResponseIcon = '👍'
    } else if (match.type === 'confirmation') {
      actionResponse = 'Prompted'
      actionResponseIcon = '✋'
    }

    if (appConfig.show_notifications !== false && match.notification) {
      // Special handling for bash commands with path-based config but no directory
      if (
        (match.patternId === 'bash-command-prompt-format-1' ||
          match.patternId === 'bash-command-prompt-format-2') &&
        !match.extractedData?.directory
      ) {
        const isInProjectRoot = isFileInProjectRoot(process.cwd())
        const bashConfig = isInProjectRoot
          ? mergedRuleset?.accept_project_bash_command_prompts
          : mergedRuleset?.accept_global_bash_command_prompts

        if (
          bashConfig &&
          typeof bashConfig === 'object' &&
          'paths' in bashConfig
        ) {
          // Show special unacceptable notification
          showNotification(
            {
              title: '🚨 Claude Composer',
              message: 'UNACCEPTABLE DIALOG BECAUSE NO DIRECTORY IS SPECIFIED',
              timeout: false, // Always sticky
              sound: true,
            },
            appConfig,
          ).catch(err => console.error('Failed to send notification:', err))
          return
        }
      }

      showPatternNotification(
        match,
        appConfig,
        actionResponse,
        actionResponseIcon,
      ).catch(err => console.error('Failed to send notification:', err))
    }
  }
}

function handleTerminalData(data: string): void {
  try {
    process.stdout.write(data)

    terminalManager.updateTerminalBuffer(data)
    const matchedTrigger = confirmationPatternTriggers.find(trigger =>
      data.includes(trigger),
    )
    if (matchedTrigger) {
      const state = terminalManager.getTerminalState()
      if (state.pendingPromptCheck) {
        clearTimeout(state.pendingPromptCheck)
      }

      const timeout = setTimeout(async () => {
        try {
          const currentScreenContent = await terminalManager.captureSnapshot()
          if (currentScreenContent) {
            handlePatternMatches(currentScreenContent, 'confirmation')
          }
        } catch (error) {}
        terminalManager.setPendingPromptCheck(null)
      }, 100)

      terminalManager.setPendingPromptCheck(timeout)
    }
  } catch (error) {}
}

function handleStdinData(data: Buffer): void {
  try {
    terminalManager.handleStdinData(data)
  } catch (error) {}
}

export async function main() {
  // Check for cc-init subcommand first
  if (process.argv[2] === 'cc-init') {
    const { handleCcInit } = await import('./cli/cc-init.js')
    await handleCcInit(process.argv.slice(3))
    return
  }

  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    const { createClaudeComposerCommand } = await import('./cli/parser.js')
    const program = createClaudeComposerCommand()

    program.outputHelp()
    console.log('\n--- Claude CLI Help ---\n')

    const defaultChildAppPath = path.join(
      os.homedir(),
      '.claude',
      'local',
      'claude',
    )
    const childAppPath = process.env.CLAUDE_APP_PATH || defaultChildAppPath

    const helpProcess = spawn(childAppPath, ['--help'], {
      stdio: 'inherit',
      env: process.env,
    })

    helpProcess.on('exit', code => {
      process.exit(code || 0)
    })

    return
  }

  if (process.argv.includes('--version') || process.argv.includes('-v')) {
    try {
      const currentFilePath = fileURLToPath(import.meta.url)
      const currentDir = path.dirname(currentFilePath)
      const packageJsonPath = path.resolve(currentDir, '..', 'package.json')
      const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
      console.log(`${packageJson.version} (Claude Composer)`)
    } catch (error) {
      console.log('Claude Composer')
    }

    const defaultChildAppPath = path.join(
      os.homedir(),
      '.claude',
      'local',
      'claude',
    )
    const childAppPath = process.env.CLAUDE_APP_PATH || defaultChildAppPath

    const versionProcess = spawn(childAppPath, ['--version'], {
      stdio: 'inherit',
      env: process.env,
    })

    versionProcess.on('exit', code => {
      process.exit(code || 0)
    })

    return
  }

  ensureBackupDirectory()

  const preflightResult = await runPreflight(process.argv)

  if (preflightResult.shouldExit) {
    if (process.argv.includes('--print')) {
      const defaultChildAppPath = path.join(
        os.homedir(),
        '.claude',
        'local',
        'claude',
      )
      const childAppPath = process.env.CLAUDE_APP_PATH || defaultChildAppPath

      const printProcess = spawn(childAppPath, preflightResult.childArgs, {
        stdio: 'inherit',
        env: process.env,
      })

      printProcess.on('exit', code => {
        // Ensure logs are flushed before exiting
        setImmediate(() => {
          process.exit(code || 0)
        })
      })

      return
    }

    const args = preflightResult.childArgs
    if (args.length > 0 && !args[0].includes(' ') && !args[0].startsWith('-')) {
      const defaultChildAppPath = path.join(
        os.homedir(),
        '.claude',
        'local',
        'claude',
      )
      const childAppPath = process.env.CLAUDE_APP_PATH || defaultChildAppPath

      const subcommandProcess = spawn(childAppPath, preflightResult.childArgs, {
        stdio: 'inherit',
        env: process.env,
      })

      subcommandProcess.on('exit', code => {
        // Ensure logs are flushed before exiting
        setImmediate(() => {
          process.exit(code || 0)
        })
      })

      return
    }

    process.exit(preflightResult.exitCode || 0)
  }

  appConfig = preflightResult.appConfig
  mergedRuleset = preflightResult.mergedRuleset
  tempMcpConfigPath = preflightResult.tempMcpConfigPath

  // Initialize remote notification service if enabled
  if (appConfig?.send_remote_notifications) {
    const remoteService = RemoteNotificationService.getInstance()
    const initialized = await remoteService.initialize()
    if (!initialized) {
      warn(
        '※ Remote notifications enabled but initialization failed. Check ~/.claude-composer/remote-notifications.yaml',
      )
    }
  }

  responseQueue = new ResponseQueue()
  terminalManager = new TerminalManager(appConfig, responseQueue)
  if (tempMcpConfigPath) {
    terminalManager.setTempMcpConfigPath(tempMcpConfigPath)
  }

  const defaultChildAppPath = path.join(
    os.homedir(),
    '.claude',
    'local',
    'claude',
  )
  const childAppPath = process.env.CLAUDE_APP_PATH || defaultChildAppPath

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

  const hasActivePatterns = await initializePatterns()

  log('※ Ready, Passing off control to Claude CLI')

  if (appConfig.notify_work_started === true) {
    const projectName = process.cwd().split('/').pop() || 'Unknown'
    showNotification(
      {
        message: `Claude Composer started working 🚀\nProject: ${projectName}`,
      },
      appConfig,
    ).catch(err => console.error('Failed to send notification:', err))
  }

  const childArgs = preflightResult.childArgs

  const terminalConfig: TerminalConfig = {
    isTTY: process.stdin.isTTY || false,
    cols: process.stdout.columns || 80,
    rows: process.stdout.rows || 30,
    env: process.env,
    cwd: process.env.PWD || process.cwd(),
    childAppPath,
    childArgs,
  }

  await terminalManager.initialize(terminalConfig)

  terminalManager.onData(handleTerminalData)

  terminalManager.onExit((code: number) => {
    cleanup()
    process.exit(code)
  })

  if (process.stdin.isTTY) {
    process.stdin.on('data', handleStdinData)
  }

  if (process.stdin.isTTY) {
    process.stdout.on('resize', () => {
      const newCols = process.stdout.columns || 80
      const newRows = process.stdout.rows || 30
      terminalManager.resize(newCols, newRows)
    })
  }

  if (appConfig) {
    activityMonitor = new ActivityMonitor(appConfig)
    terminalManager.startTerminalPolling(1000, (snapshot: string) => {
      activityMonitor?.checkSnapshot(snapshot)
    })
  }
}

main().catch(error => {
  console.error('Failed to start CLI:', error)
  process.exit(1)
})
