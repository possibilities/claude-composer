#!/usr/bin/env tsx

import * as os from 'node:os'
import * as pty from 'node-pty'
import { spawn, ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const logFile: string = path.join('/tmp', `claude-log-${Date.now()}.txt`)
const logStream: fs.WriteStream = fs.createWriteStream(logFile, { flags: 'a' })

let ptyProcess: pty.IPty | undefined
let childProcess: ChildProcess | undefined
let isRawMode = false

const childAppPath =
  process.env.CLAUDE_APP_PATH ||
  path.join(os.homedir(), '.claude', 'local', 'claude')

function cleanup() {
  if (logStream && !logStream.destroyed) {
    logStream.end()
  }

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

if (process.stdin.isTTY) {
  const args: string[] = process.argv.slice(2)
  ptyProcess = pty.spawn(childAppPath, args, {
    name: 'xterm-color',
    cols: process.stdout.columns || 80,
    rows: process.stdout.rows || 30,
    env: process.env,
    cwd: process.env.PWD,
  })

  ptyProcess.onData((data: string) => {
    process.stdout.write(data)
    const lines: string[] = data.split('\n')
    lines.forEach((line: string) => {
      if (line.trim()) {
        logStream.write(`[${new Date().toISOString()}] ${line}\n`)
      }
    })
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
  const args: string[] = process.argv.slice(2)
  childProcess = spawn(childAppPath, args, {
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      ...process.env,
      FORCE_COLOR: '1',
      TERM: process.env.TERM || 'xterm-256color',
    },
  })

  process.stdin.pipe(childProcess.stdin!)

  childProcess.stdout!.on('data', (data: Buffer) => {
    process.stdout.write(data)
    const lines: string[] = data.toString().split('\n')
    lines.forEach((line: string) => {
      if (line.trim()) {
        logStream.write(`[${new Date().toISOString()}] ${line}\n`)
      }
    })
  })

  childProcess.stderr!.pipe(process.stderr)

  childProcess.on('exit', (code: number | null) => {
    cleanup()
    process.exit(code || 0)
  })
}
