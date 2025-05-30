#!/usr/bin/env tsx

import * as os from 'node:os'
import * as pty from 'node-pty'
import { spawn, ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import * as util from 'node:util'
import notifier from 'node-notifier'
import { PatternMatcher, MatchResult } from './pattern-matcher'
import { ResponseQueue } from './response-queue'
import { type AppConfig } from './config-schemas.js'
import { PassThrough } from 'stream'
import { runPreflight, getConfigDirectory, log, warn } from './preflight.js'

let ptyProcess: pty.IPty | undefined
let childProcess: ChildProcess | undefined
let isRawMode = false
let patternMatcher: PatternMatcher
let responseQueue: ResponseQueue
let tempMcpConfigPath: string | undefined
let terminal: any | undefined
let serializeAddon: any | undefined
let screenReadInterval: NodeJS.Timeout | undefined
let appConfig: AppConfig | undefined
let stdinBuffer: PassThrough | undefined
let isStdinPaused = false

const debugLog = util.debuglog('claude-composer')

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

export { appConfig }

async function initializePatterns(): Promise<boolean> {
  const patternsPath = process.env.CLAUDE_PATTERNS_PATH || './patterns'
  const { PATTERNS } = await import(patternsPath)

  patternMatcher = new PatternMatcher()
  responseQueue = new ResponseQueue()

  let hasActivePatterns = false

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

    patternMatcher.addPattern(pattern)
    hasActivePatterns = true
  })

  return hasActivePatterns
}

function cleanup() {
  if (isRawMode && process.stdin.isTTY) {
    process.stdin.setRawMode(false)
    isRawMode = false
  }

  if (screenReadInterval) {
    clearInterval(screenReadInterval)
    screenReadInterval = undefined
  }

  if (terminal) {
    terminal.dispose()
    terminal = undefined
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

  if (stdinBuffer) {
    stdinBuffer.destroy()
    stdinBuffer = undefined
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
  // Silently handle uncaught exceptions to avoid interrupting child app output
  cleanup()
  process.exit(1)
})

function showNotification(match: MatchResult): void {
  const projectName = path.basename(process.cwd())
  const title = '🤖 Claude Composer'
  let message = `Project: ${projectName}\nPattern triggered: ${match.patternId}`

  if (match.extractedData && Object.keys(match.extractedData).length > 0) {
    const extractedInfo = Object.entries(match.extractedData)
      .map(([key, value]) => `${key}: ${value}`)
      .join(', ')
    message += `\nExtracted: ${extractedInfo}`
  }

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
    }

    if (
      appConfig.show_notifications !== false &&
      match.action.type === 'input'
    ) {
      showNotification(match)
    }
  }
}

async function main() {
  // Handle --help and --version early to avoid preflight messages
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    // First show the wrapper's help using the shared command setup
    const { createClaudeComposerCommand } = await import('./preflight.js')
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
      const packageJsonPath = path.resolve('./package.json')
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

  if (!process.stdin.isTTY) {
    stdinBuffer = new PassThrough()
    process.stdin.pipe(stdinBuffer)
    process.stdin.pause()
    isStdinPaused = true
  }

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
  tempMcpConfigPath = preflightResult.tempMcpConfigPath

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

  const childArgs = preflightResult.childArgs

  if (process.stdin.isTTY) {
    const cols = process.stdout.columns || 80
    const rows = process.stdout.rows || 30

    ptyProcess = pty.spawn(childAppPath, childArgs, {
      name: 'xterm-color',
      cols: cols,
      rows: rows,
      env: process.env,
      cwd: process.env.PWD,
    })

    responseQueue.setTargets(ptyProcess, undefined)

    if (hasActivePatterns) {
      const { Terminal } = await import('@xterm/xterm')
      const { SerializeAddon } = await import('@xterm/addon-serialize')

      terminal = new Terminal({
        cols: cols,
        rows: rows,
        scrollback: 5000,
      })

      serializeAddon = new SerializeAddon()
      terminal.loadAddon(serializeAddon)

      ptyProcess.onData((data: string) => {
        process.stdout.write(data)
        try {
          terminal.write(data)
        } catch (error) {
          // Silently ignore xterm parsing errors
        }
      })

      let lastScreenContent = ''
      screenReadInterval = setInterval(() => {
        if (terminal && serializeAddon) {
          try {
            const currentScreenContent = serializeAddon.serialize()
            if (currentScreenContent !== lastScreenContent) {
              handlePatternMatches(currentScreenContent)
              lastScreenContent = currentScreenContent
            }
          } catch (error) {
            // Silently ignore xterm parsing errors
          }
        }
      }, 100)
    } else {
      ptyProcess.onData((data: string) => {
        process.stdout.write(data)
      })
    }

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
      const newCols = process.stdout.columns || 80
      const newRows = process.stdout.rows || 30
      ptyProcess.resize(newCols, newRows)
      if (terminal) {
        terminal.resize(newCols, newRows)
      }
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

    if (hasActivePatterns) {
      const { Terminal } = await import('@xterm/xterm')
      const { SerializeAddon } = await import('@xterm/addon-serialize')

      terminal = new Terminal({
        cols: 80,
        rows: 30,
        scrollback: 5000,
      })

      serializeAddon = new SerializeAddon()
      terminal.loadAddon(serializeAddon)

      if (stdinBuffer) {
        if (isStdinPaused) {
          process.stdin.resume()
          isStdinPaused = false
        }
        stdinBuffer.pipe(childProcess.stdin!)
      } else {
        process.stdin.pipe(childProcess.stdin!)
      }

      childProcess.stdout!.on('data', (data: Buffer) => {
        const dataStr = data.toString()
        process.stdout.write(data)
        try {
          terminal.write(dataStr)
        } catch (error) {
          // Silently ignore xterm parsing errors
        }
      })

      let lastScreenContent = ''
      screenReadInterval = setInterval(() => {
        if (terminal && serializeAddon) {
          try {
            const currentScreenContent = serializeAddon.serialize()
            if (currentScreenContent !== lastScreenContent) {
              handlePatternMatches(currentScreenContent)
              lastScreenContent = currentScreenContent
            }
          } catch (error) {
            // Silently ignore xterm parsing errors
          }
        }
      }, 100)
    } else {
      if (stdinBuffer) {
        if (isStdinPaused) {
          process.stdin.resume()
          isStdinPaused = false
        }
        stdinBuffer.pipe(childProcess.stdin!)
      } else {
        process.stdin.pipe(childProcess.stdin!)
      }

      childProcess.stdout!.on('data', (data: Buffer) => {
        process.stdout.write(data)
      })
    }

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
