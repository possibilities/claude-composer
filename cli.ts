#!/usr/bin/env tsx

import * as os from 'node:os'
import * as pty from 'node-pty'
import { spawn, ChildProcess } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'

const logFile: string = path.join('/tmp', `claude-log-${Date.now()}.txt`)
const logStream: fs.WriteStream = fs.createWriteStream(logFile, { flags: 'a' })

if (process.stdin.isTTY) {
  const args: string[] = process.argv.slice(2)
  const ptyProcess: pty.IPty = pty.spawn(
    '/home/mike/.claude/local/claude',
    args,
    {
      name: 'xterm-color',
      cols: process.stdout.columns || 80,
      rows: process.stdout.rows || 30,
      env: process.env,
      cwd: process.env.PWD,
    },
  )

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
  process.stdin.on('data', (data: Buffer) => {
    ptyProcess.write(data.toString())
  })

  ptyProcess.onExit(() => {
    logStream.end()
    process.exit()
  })

  process.on('exit', () => {
    process.stdin.setRawMode(false)
  })

  process.stdout.on('resize', () => {
    ptyProcess.resize(process.stdout.columns || 80, process.stdout.rows || 30)
  })
} else {
  const args: string[] = process.argv.slice(2)
  const claudeProcess: ChildProcess = spawn(
    '/home/mike/.claude/local/claude',
    args,
    {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        FORCE_COLOR: '1',
        TERM: process.env.TERM || 'xterm-256color',
      },
    },
  )

  process.stdin.pipe(claudeProcess.stdin!)

  claudeProcess.stdout!.on('data', (data: Buffer) => {
    process.stdout.write(data)
    const lines: string[] = data.toString().split('\n')
    lines.forEach((line: string) => {
      if (line.trim()) {
        logStream.write(`[${new Date().toISOString()}] ${line}\n`)
      }
    })
  })

  claudeProcess.stderr!.pipe(process.stderr)

  claudeProcess.on('exit', (code: number | null) => {
    logStream.end()
    process.exit(code || 0)
  })
}
