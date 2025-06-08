import * as os from 'node:os'
import * as fs from 'fs'
import * as path from 'path'
import * as util from 'node:util'
import { spawn } from 'child_process'
import { fileURLToPath } from 'node:url'
import picomatch from 'picomatch'
import { PatternMatcher, MatchResult } from './patterns/matcher'
import { ResponseQueue } from './core/response-queue'
import {
  patterns,
  confirmationPatterns,
  createAppReadyPattern,
  createTrustPromptPattern,
} from './patterns/registry'
import { type AppConfig, type RulesetConfig } from './config/schemas.js'
import { runPreflight, log, warn } from './core/preflight.js'
import {
  showNotification,
  showPatternNotification,
} from './utils/notifications.js'
import { TerminalManager } from './terminal/manager'
import {
  ensureBackupDirectory,
  createBackup,
  calculateMd5,
  saveTerminalSnapshot,
} from './terminal/utils'
import type { TerminalConfig } from './terminal/types'
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
let pipedInputPath: string | undefined

const debugLog = util.debuglog('claude-composer')

export { appConfig, pipedInputPath }

async function initializePatterns(): Promise<boolean> {
  let patternsToUse = patterns

  if (process.env.CLAUDE_PATTERNS_PATH) {
    try {
      const customPatterns = await import(process.env.CLAUDE_PATTERNS_PATH)
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
    if (pattern.triggerText) {
      confirmationTriggers.add(pattern.triggerText)
    }

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

  if (pipedInputPath && fs.existsSync(pipedInputPath)) {
    try {
      fs.unlinkSync(pipedInputPath)
    } catch (e) {}
  }

  const ttyStream = (global as any).__ttyStream
  if (ttyStream) {
    try {
      ttyStream.setRawMode(false)
      ttyStream.destroy()
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

    if (
      match.patternId === 'allow-trusted-root' &&
      match.response &&
      (Array.isArray(match.response)
        ? match.response.length > 0
        : match.response !== '')
    ) {
      responseQueue.enqueue(match.response)
      actionResponse = 'Accepted'
      actionResponseIcon = '👍'
    } else if (match.patternId === 'app-ready-handler' && match.response) {
      // Always accept app-ready-handler responses
      responseQueue.enqueue(match.response)
      actionResponse = 'Accepted'
      actionResponseIcon = '👍'

      // Remove the pattern after first use to prevent re-triggering
      patternMatcher.removePattern('app-ready-handler')
      const triggerText = '? for shortcuts'
      const index = confirmationPatternTriggers.indexOf(triggerText)
      if (index > -1) {
        confirmationPatternTriggers.splice(index, 1)
      }
    } else if (shouldAcceptPrompt(match)) {
      responseQueue.enqueue(match.response)
      actionResponse = 'Accepted'
      actionResponseIcon = '👍'

      if (match.patternId === 'app-ready-handler') {
        patternMatcher.removePattern('app-ready-handler')
        const triggerText = '? for shortcuts'
        const index = confirmationPatternTriggers.indexOf(triggerText)
        if (index > -1) {
          confirmationPatternTriggers.splice(index, 1)
        }
      }

      if (match.patternId === 'allow-trusted-root') {
        patternMatcher.removePattern('allow-trusted-root')
      }
    } else {
      actionResponse = 'Prompted'
      actionResponseIcon = '✋'
    }

    if (appConfig.show_notifications !== false && match.notification) {
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
          showNotification(
            {
              title: '🚨 Claude Composer',
              message: 'UNACCEPTABLE DIALOG BECAUSE NO DIRECTORY IS SPECIFIED',
              timeout: false,
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
    // If there's an error (exitCode !== 0), exit immediately with the error code
    // regardless of whether --print is being used
    if (preflightResult.exitCode !== 0) {
      process.exit(preflightResult.exitCode)
    }

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

  const trustPromptPattern = createTrustPromptPattern(() => appConfig)
  try {
    patternMatcher.addPattern(trustPromptPattern)
    if (trustPromptPattern.triggerText) {
      confirmationPatternTriggers.push(trustPromptPattern.triggerText)
    }
  } catch (error) {
    console.error(`Failed to add trust prompt pattern: ${error.message}`)
  }

  log('※ Ready, Passing off control to Claude CLI')

  const childArgs = preflightResult.childArgs

  const terminalConfig: TerminalConfig = {
    isTTY: !preflightResult.hasPrintOption,
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

  // Add app ready pattern if in plan mode or if there's piped input
  // IMPORTANT: This must be done AFTER terminal manager is initialized so response queue has targets
  if (appConfig?.mode === 'plan' || !process.stdin.isTTY) {
    const appStartedPattern = createAppReadyPattern(() => ({
      pipedInputPath,
      mode: appConfig?.mode,
    }))
    try {
      patternMatcher.addPattern(appStartedPattern)
      confirmationPatternTriggers.push(appStartedPattern.triggerText!)
    } catch (error) {
      console.error(`Failed to add app-ready-handler pattern: ${error.message}`)
    }
  }

  if (process.stdin.isTTY) {
    process.stdin.on('data', handleStdinData)
  } else {
    const fs = await import('fs')
    const os = await import('os')
    const path = await import('path')

    const tmpDir = os.tmpdir()
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
    pipedInputPath = path.join(tmpDir, `claude-composer-piped-${timestamp}.txt`)
    const writeStream = fs.createWriteStream(pipedInputPath)

    process.stdin.on('data', chunk => {
      writeStream.write(chunk)
    })

    process.stdin.on('end', () => {
      writeStream.end()
    })

    process.stdin.resume()

    const tty = await import('tty')
    if (os.platform() !== 'win32') {
      try {
        const ttyFd = fs.openSync('/dev/tty', 'r')
        const ttyStream = new tty.ReadStream(ttyFd)

        ttyStream.setRawMode(true)

        ttyStream.on('data', handleStdinData)
        ;(global as any).__ttyStream = ttyStream

        process.stdout.on('resize', () => {
          const newCols = process.stdout.columns || 80
          const newRows = process.stdout.rows || 30
          terminalManager.resize(newCols, newRows)
        })
      } catch (error) {
        console.warn('※ Could not open /dev/tty for input:', error)
      }
    }
  }

  if (process.stdin.isTTY) {
    process.stdout.on('resize', () => {
      const newCols = process.stdout.columns || 80
      const newRows = process.stdout.rows || 30
      terminalManager.resize(newCols, newRows)
    })
  }
}

main().catch(error => {
  console.error('Failed to start CLI:', error)
  process.exit(1)
})
