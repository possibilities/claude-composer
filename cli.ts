#!/usr/bin/env tsx

import * as os from 'node:os'
import * as pty from 'node-pty'
import { spawn, ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import { Command } from 'commander'
import { PatternMatcher } from './pattern-matcher'
import { ResponseQueue } from './response-queue'
import { PATTERNS, SETTINGS } from './patterns'

let ptyProcess: pty.IPty | undefined
let childProcess: ChildProcess | undefined
let isRawMode = false

const patternMatcher = new PatternMatcher(SETTINGS.bufferSize)
const responseQueue = new ResponseQueue()

PATTERNS.forEach(pattern => {
  patternMatcher.addPattern(pattern)
})

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

function debugLog(message: string) {
  const timestamp = new Date().toISOString()
  const logMessage = `${timestamp}: ${message}\n`
  fs.appendFileSync('/tmp/claude-composer-debug.log', logMessage)
}

function outputLog(data: string) {
  const timestamp = new Date().toISOString()
  const logMessage = `${timestamp}: ${JSON.stringify(data)}\n`
  fs.appendFileSync('/tmp/claude-composer-output.log', logMessage)
}

function handlePatternMatches(data: string): void {
  // Always log when we receive data during tests
  if (SETTINGS.logMatches) {
    debugLog(
      `Processing data chunk (length: ${data.length}): ${JSON.stringify(data.substring(0, 100))}...`,
    )
    if (data.includes('Welcome to')) {
      debugLog(`Data contains 'Welcome to': ${JSON.stringify(data)}`)
    }
  }

  const matches = patternMatcher.processData(data)

  if (SETTINGS.logMatches) {
    debugLog(`Pattern matcher returned ${matches.length} matches`)
    if (matches.length > 0) {
      debugLog(`Found ${matches.length} pattern matches`)
      matches.forEach(m =>
        debugLog(`  → Pattern ${m.patternId}: ${m.response}`),
      )
    }
  }

  for (const match of matches) {
    debugLog(`Enqueueing response: ${match.response}`)
    responseQueue.enqueue(match.response)
  }
}

const program = new Command()
program
  .name('claude-composer')
  .description('Claude Composer CLI')
  .option('--show-notifications', 'Show notifications')
  .allowUnknownOption()
  .argument('[args...]', 'Arguments to pass to `claude`')
  .parse(process.argv)

const options = program.opts()

log('※ Getting ready to launch Claude CLI')

if (options.showNotifications) {
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
    outputLog(data)
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
    outputLog(dataStr)
    process.stdout.write(data)
    handlePatternMatches(dataStr)
  })

  childProcess.stderr!.pipe(process.stderr)

  childProcess.on('exit', (code: number | null) => {
    cleanup()
    process.exit(code || 0)
  })
}
