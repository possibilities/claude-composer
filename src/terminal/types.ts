import type { IPty } from '@homebridge/node-pty-prebuilt-multiarch'
import type { ChildProcess } from 'child_process'
import type { PassThrough } from 'stream'
import type { Terminal } from '@xterm/xterm'
import type { SerializeAddon } from '@xterm/addon-serialize'

export interface TerminalConfig {
  isTTY: boolean
  cols: number
  rows: number
  env: NodeJS.ProcessEnv
  cwd: string
  childAppPath: string
  childArgs: string[]
}

export interface TerminalSnapshot {
  patternId: string
  patternTitle: string
  timestamp: string
  terminalContent: string
  strippedTerminalContent: string
  bufferContent: string
  strippedBufferContent: string
  metadata: {
    cols: number
    rows: number
    scrollback: number
    cwd: string
    projectName: string
    snapshotType: string
  }
}

export interface TerminalState {
  ptyProcess?: IPty
  childProcess?: ChildProcess
  terminal?: Terminal
  serializeAddon?: SerializeAddon
  stdinBuffer?: PassThrough
  isStdinPaused: boolean
  isRawMode: boolean
  pendingPromptCheck: NodeJS.Timeout | null
  screenReadInterval?: NodeJS.Timeout
}

export interface TerminalEvents {
  onData: (callback: (data: string) => void) => void
  onExit: (callback: (code: number) => void) => void
  onResize: (callback: (cols: number, rows: number) => void) => void
}

export type DataHandler = (data: string) => void
export type ExitHandler = (code: number) => void
export type ResizeHandler = (cols: number, rows: number) => void
