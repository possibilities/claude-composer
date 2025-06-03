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
import {
  ensureBackupDirectory,
  createBackup,
  calculateMd5,
  saveTerminalSnapshot,
} from './terminal/utils'
import type { TerminalConfig } from './terminal/types'
import { ActivityMonitor } from './core/activity-monitor'
import { isFileInProjectRoot } from './utils/file-utils.js'

let patternMatcher: PatternMatcher
let responseQueue: ResponseQueue
let terminalManager: TerminalManager
let tempMcpConfigPath: string | undefined
let appConfig: AppConfig | undefined
let mergedRuleset: RulesetConfig | undefined
let promptPatternTriggers: string[] = []
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

  const promptTriggers = new Set<string>()

  patternsToUse.forEach(pattern => {
    if (pattern.type === 'prompt' && pattern.triggerText) {
      promptTriggers.add(pattern.triggerText)
    }

    // Always add prompt patterns so notifications work, dismissal is handled later
    if (
      pattern.id === 'add-tree-trigger' &&
      !appConfig.allow_adding_project_tree
    ) {
      return
    }
    if (
      pattern.id === 'add-changes-trigger' &&
      !appConfig.allow_adding_project_changes
    ) {
      return
    }

    try {
      patternMatcher.addPattern(pattern)
      hasActivePatterns = true
    } catch (error) {
      console.error(`Failed to add pattern: ${error.message}`)
      throw error
    }
  })

  promptPatternTriggers = Array.from(promptTriggers)

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

function checkDismissConfig(
  config: boolean | { paths: string[] } | undefined,
  filePath: string,
  isProjectContext: boolean,
): boolean {
  if (config === true) return true
  if (config === false || config === undefined) return false

  if (typeof config === 'object' && 'paths' in config) {
    const normalizedPath = path.normalize(filePath)
    const pathToCheck = isProjectContext
      ? path.relative(process.cwd(), normalizedPath) || '.'
      : normalizedPath

    const isMatch = picomatch(config.paths)
    return isMatch(pathToCheck)
  }

  return false
}

function shouldDismissPrompt(match: MatchResult): boolean {
  const fileName = match.extractedData?.fileName
  const directory = match.extractedData?.directory

  let checkPath = fileName || directory || process.cwd()
  if (!checkPath) return false

  const isInProjectRoot = isFileInProjectRoot(checkPath)

  switch (match.patternId) {
    case 'edit-file-prompt':
      if (!appConfig.dangerously_dismiss_edit_file_prompts) return false
      if (!mergedRuleset) return false
      return isInProjectRoot
        ? checkDismissConfig(
            mergedRuleset.dismiss_project_edit_file_prompts,
            checkPath,
            true,
          )
        : checkDismissConfig(
            mergedRuleset.dismiss_global_edit_file_prompts,
            checkPath,
            false,
          )
    case 'create-file-prompt':
      if (!appConfig.dangerously_dismiss_create_file_prompts) return false
      if (!mergedRuleset) return false
      return isInProjectRoot
        ? checkDismissConfig(
            mergedRuleset.dismiss_project_create_file_prompts,
            checkPath,
            true,
          )
        : checkDismissConfig(
            mergedRuleset.dismiss_global_create_file_prompts,
            checkPath,
            false,
          )
    case 'bash-command-prompt-format-1':
    case 'bash-command-prompt-format-2':
      if (!appConfig.dangerously_dismiss_bash_command_prompts) return false
      if (!mergedRuleset) return false
      return isInProjectRoot
        ? checkDismissConfig(
            mergedRuleset.dismiss_project_bash_command_prompts,
            checkPath,
            true,
          )
        : checkDismissConfig(
            mergedRuleset.dismiss_global_bash_command_prompts,
            checkPath,
            false,
          )
    case 'read-files-prompt':
      if (!appConfig.dangerously_dismiss_read_files_prompts) return false
      if (!mergedRuleset) return false
      return isInProjectRoot
        ? checkDismissConfig(
            mergedRuleset.dismiss_project_read_files_prompts,
            checkPath,
            true,
          )
        : checkDismissConfig(
            mergedRuleset.dismiss_global_read_files_prompts,
            checkPath,
            false,
          )
    case 'fetch-content-prompt':
      if (!appConfig.dangerously_dismiss_fetch_content_prompts) return false
      if (!mergedRuleset) return false
      return mergedRuleset.dismiss_fetch_content_prompts === true
    default:
      return false
  }
}

function handlePatternMatches(
  data: string,
  filterType?: 'completion' | 'prompt',
): void {
  const matches = filterType
    ? patternMatcher.processDataByType(data, filterType)
    : patternMatcher.processData(data)

  for (const match of matches) {
    const isCompletionPattern =
      match.patternId === 'add-tree-trigger' ||
      match.patternId === 'add-changes-trigger' ||
      match.type === 'completion'

    let actionResponse: 'Dismissed' | 'Prompted' | undefined
    let actionResponseIcon: string | undefined

    if (isCompletionPattern) {
      responseQueue.enqueue(match.response)
    } else if (shouldDismissPrompt(match)) {
      responseQueue.enqueue(match.response)
      actionResponse = 'Dismissed'
      actionResponseIcon = '👍'
    } else if (match.type === 'prompt') {
      actionResponse = 'Prompted'
      actionResponseIcon = '✋'
    }

    if (appConfig.show_notifications !== false && match.notification) {
      showPatternNotification(
        match,
        appConfig,
        actionResponse,
        actionResponseIcon,
      )
    }
  }
}

function handleTerminalData(data: string): void {
  try {
    process.stdout.write(data)

    terminalManager.updateTerminalBuffer(data)
    const matchedTrigger = promptPatternTriggers.find(trigger =>
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
            handlePatternMatches(currentScreenContent, 'prompt')
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
    if (data.length === 1 && data[0] === 32) {
      terminalManager.captureSnapshot().then(snapshot => {
        if (snapshot) {
          handlePatternMatches(snapshot, 'completion')
        }
      })
    }

    terminalManager.handleStdinData(data)
  } catch (error) {}
}

export async function main() {
  if (process.argv.includes('--config-help')) {
    const { getConfigHelp } = await import('./cli/config-help.js')
    console.log(getConfigHelp())
    process.exit(0)
  }

  if (process.argv.includes('--safe')) {
    const { createClaudeComposerCommand } = await import('./cli/parser.js')
    const { buildKnownOptionsSet } = await import('./cli/parser.js')
    const program = createClaudeComposerCommand()
    const knownOptions = buildKnownOptionsSet(program)

    const usedOptions = process.argv.filter(
      arg => arg.startsWith('--') && arg !== '--safe',
    )
    const knownUsedOptions = usedOptions.filter(
      opt => knownOptions.has(opt) || knownOptions.has(opt.split('=')[0]),
    )

    if (knownUsedOptions.length > 0) {
      console.error(
        `※ Error: --safe flag cannot be used with other claude-composer flags: ${knownUsedOptions.join(', ')}`,
      )
      process.exit(1)
    }

    const defaultChildAppPath = path.join(
      os.homedir(),
      '.claude',
      'local',
      'claude',
    )
    const childAppPath = process.env.CLAUDE_APP_PATH || defaultChildAppPath

    const childArgs = process.argv.slice(2).filter(arg => arg !== '--safe')

    const safeProcess = spawn(childAppPath, childArgs, {
      stdio: 'inherit',
      env: process.env,
    })

    safeProcess.on('exit', code => {
      process.exit(code || 0)
    })

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
        process.exit(code || 0)
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
        process.exit(code || 0)
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

  log('※ Ready, Passing off control to Claude CLI')

  if (appConfig.notify_work_started === true) {
    const projectName = process.cwd().split('/').pop() || 'Unknown'
    showNotification(
      { message: `Claude Composer started working\nProject: ${projectName}` },
      appConfig,
    )
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
