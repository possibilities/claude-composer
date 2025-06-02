import * as pty from '@homebridge/node-pty-prebuilt-multiarch'
import { spawn, ChildProcess } from 'child_process'
import { PassThrough } from 'stream'
import * as fs from 'fs'
import type { Terminal } from '@xterm/xterm'
import type { SerializeAddon } from '@xterm/addon-serialize'
import type {
  TerminalConfig,
  TerminalState,
  DataHandler,
  ExitHandler,
  ResizeHandler,
} from './types'
import { saveTerminalSnapshot } from './utils'
import type { AppConfig } from '../config/schemas'
import type { ResponseQueue } from '../core/response-queue'

export class TerminalManager {
  private state: TerminalState = {
    isStdinPaused: false,
    isRawMode: false,
    pendingPromptCheck: null,
  }

  private dataHandlers: DataHandler[] = []
  private exitHandlers: ExitHandler[] = []
  private resizeHandlers: ResizeHandler[] = []
  private tempMcpConfigPath?: string
  private appConfig?: AppConfig
  private responseQueue?: ResponseQueue
  private pollingCallback?: (snapshot: string) => void

  constructor(appConfig?: AppConfig, responseQueue?: ResponseQueue) {
    this.appConfig = appConfig
    this.responseQueue = responseQueue
  }

  async initialize(config: TerminalConfig): Promise<void> {
    const { isTTY, cols, rows, env, cwd, childAppPath, childArgs } = config

    if (isTTY) {
      await this.initializePty(childAppPath, childArgs, cols, rows, env, cwd)
    } else {
      await this.initializeChildProcess(childAppPath, childArgs, env)
    }
  }

  private async initializePty(
    childAppPath: string,
    childArgs: string[],
    cols: number,
    rows: number,
    env: NodeJS.ProcessEnv,
    cwd: string,
  ): Promise<void> {
    this.state.ptyProcess = pty.spawn(childAppPath, childArgs, {
      name: 'xterm-color',
      cols,
      rows,
      env,
      cwd,
    })

    if (this.responseQueue) {
      this.responseQueue.setTargets(this.state.ptyProcess, undefined)
    }

    if (this.appConfig && this.shouldInitializeXterm()) {
      await this.initializeXterm(cols, rows)
    }
    this.state.ptyProcess.onData((data: string) => {
      this.dataHandlers.forEach(handler => handler(data))
    })

    this.state.ptyProcess.onExit(exitCode => {
      this.exitHandlers.forEach(handler => handler(exitCode.exitCode || 0))
    })

    if (process.stdin.isTTY) {
      process.stdin.removeAllListeners('data')
      process.stdin.setRawMode(true)
      this.state.isRawMode = true
    }
  }

  private async initializeChildProcess(
    childAppPath: string,
    childArgs: string[],
    env: NodeJS.ProcessEnv,
  ): Promise<void> {
    if (!process.stdin.isTTY) {
      this.state.stdinBuffer = new PassThrough()
      process.stdin.pipe(this.state.stdinBuffer)
      process.stdin.pause()
      this.state.isStdinPaused = true
    }

    this.state.childProcess = spawn(childAppPath, childArgs, {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...env,
        FORCE_COLOR: '1',
        TERM: env.TERM || 'xterm-256color',
      },
    })

    if (this.responseQueue) {
      this.responseQueue.setTargets(undefined, this.state.childProcess)
    }

    if (this.appConfig && this.shouldInitializeXterm()) {
      await this.initializeXterm(80, 30)
    }
    if (this.state.stdinBuffer) {
      if (this.state.isStdinPaused) {
        process.stdin.resume()
        this.state.isStdinPaused = false
      }
      this.state.stdinBuffer.pipe(this.state.childProcess.stdin!)
    } else {
      process.stdin.pipe(this.state.childProcess.stdin!)
    }

    this.state.childProcess.stdout!.on('data', (data: Buffer) => {
      const dataStr = data.toString()
      this.dataHandlers.forEach(handler => handler(dataStr))
    })

    this.state.childProcess.stderr!.pipe(process.stderr)
    this.state.childProcess.on('exit', (code: number | null) => {
      this.exitHandlers.forEach(handler => handler(code || 0))
    })
  }

  private async initializeXterm(cols: number, rows: number): Promise<void> {
    try {
      const xtermModule = await import('@xterm/xterm')
      const Terminal =
        xtermModule.Terminal ||
        xtermModule.default?.Terminal ||
        xtermModule.default
      const addonModule = await import('@xterm/addon-serialize')
      const SerializeAddon =
        addonModule.SerializeAddon ||
        addonModule.default?.SerializeAddon ||
        addonModule.default

      this.state.terminal = new Terminal({
        cols,
        rows,
        scrollback: 5000,
      }) as Terminal

      this.state.serializeAddon = new SerializeAddon() as SerializeAddon
      this.state.terminal.loadAddon(this.state.serializeAddon)
    } catch (error) {}
  }

  private shouldInitializeXterm(): boolean {
    return true
  }

  handleStdinData(data: Buffer): void {
    try {
      if (
        this.appConfig?.allow_buffer_snapshots &&
        data.length === 1 &&
        data[0] === 19
      ) {
        saveTerminalSnapshot(
          this.state.terminal,
          this.state.serializeAddon,
          this.appConfig,
        )
        return
      }

      if (this.state.ptyProcess) {
        this.state.ptyProcess.write(data.toString())
      }
    } catch (error) {}
  }

  onData(handler: DataHandler): void {
    this.dataHandlers.push(handler)
  }

  onExit(handler: ExitHandler): void {
    this.exitHandlers.push(handler)
  }

  onResize(handler: ResizeHandler): void {
    this.resizeHandlers.push(handler)
  }

  write(data: string | Buffer): void {
    if (this.state.ptyProcess) {
      this.state.ptyProcess.write(data.toString())
    } else if (this.state.childProcess?.stdin) {
      this.state.childProcess.stdin.write(data)
    }
  }

  resize(cols: number, rows: number): void {
    try {
      if (this.state.ptyProcess) {
        this.state.ptyProcess.resize(cols, rows)
      }
      if (this.state.terminal) {
        this.state.terminal.resize(cols, rows)
      }
      this.resizeHandlers.forEach(handler => handler(cols, rows))
    } catch (error) {}
  }

  async captureSnapshot(): Promise<string | null> {
    if (!this.state.terminal || !this.state.serializeAddon) {
      return null
    }

    try {
      return this.state.serializeAddon.serialize()
    } catch (error) {
      return null
    }
  }

  updateTerminalBuffer(data: string): void {
    if (this.state.terminal) {
      this.state.terminal.write(data)
    }
  }

  cleanup(): void {
    if (this.state.isRawMode && process.stdin.isTTY) {
      process.stdin.setRawMode(false)
      this.state.isRawMode = false
    }

    if (this.state.screenReadInterval) {
      clearInterval(this.state.screenReadInterval)
      this.state.screenReadInterval = undefined
    }

    if (this.state.pendingPromptCheck) {
      clearTimeout(this.state.pendingPromptCheck)
      this.state.pendingPromptCheck = null
    }

    if (this.state.terminal) {
      this.state.terminal.dispose()
      this.state.terminal = undefined
    }

    if (this.state.ptyProcess) {
      try {
        this.state.ptyProcess.kill()
      } catch (e) {}
    }

    if (this.state.childProcess) {
      try {
        this.state.childProcess.kill()
      } catch (e) {}
    }

    if (this.tempMcpConfigPath && fs.existsSync(this.tempMcpConfigPath)) {
      try {
        fs.unlinkSync(this.tempMcpConfigPath)
      } catch (e) {}
    }

    if (this.state.stdinBuffer) {
      this.state.stdinBuffer.destroy()
      this.state.stdinBuffer = undefined
    }
  }

  setTempMcpConfigPath(path: string): void {
    this.tempMcpConfigPath = path
  }

  getTerminalState(): TerminalState {
    return { ...this.state }
  }

  setPendingPromptCheck(timeout: NodeJS.Timeout | null): void {
    if (this.state.pendingPromptCheck) {
      clearTimeout(this.state.pendingPromptCheck)
    }
    this.state.pendingPromptCheck = timeout
  }

  startTerminalPolling(
    intervalMs: number,
    callback: (snapshot: string) => void,
  ): void {
    if (this.state.screenReadInterval) {
      clearInterval(this.state.screenReadInterval)
    }

    this.pollingCallback = callback

    this.state.screenReadInterval = setInterval(async () => {
      const snapshot = await this.captureSnapshot()
      if (snapshot && this.pollingCallback) {
        this.pollingCallback(snapshot)
      }
    }, intervalMs)
  }

  stopTerminalPolling(): void {
    if (this.state.screenReadInterval) {
      clearInterval(this.state.screenReadInterval)
      this.state.screenReadInterval = undefined
    }
    this.pollingCallback = undefined
  }
}
