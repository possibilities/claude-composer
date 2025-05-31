import * as pty from 'node-pty'
import { ChildProcess } from 'child_process'

export interface QueuedResponse {
  id: string
  response: string | string[]
  timestamp: number
  delay: number
}

export class ResponseQueue {
  private queue: QueuedResponse[] = []
  private processing = false
  private ptyProcess?: pty.IPty
  private childProcess?: ChildProcess

  constructor(ptyProcess?: pty.IPty, childProcess?: ChildProcess) {
    this.ptyProcess = ptyProcess
    this.childProcess = childProcess
  }

  setTargets(ptyProcess?: pty.IPty, childProcess?: ChildProcess): void {
    this.ptyProcess = ptyProcess
    this.childProcess = childProcess
  }

  enqueue(response: string | string[], delay: number = 0): void {
    const queuedResponse: QueuedResponse = {
      id: `${Date.now()}-${Math.random()}`,
      response,
      timestamp: Date.now(),
      delay,
    }

    this.queue.push(queuedResponse)

    if (!this.processing) {
      this.processQueue()
    }
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.queue.length === 0) {
      return
    }

    this.processing = true

    while (this.queue.length > 0) {
      const item = this.queue.shift()!

      if (item.delay > 0) {
        await this.sleep(item.delay)
      }

      await this.sendResponse(item.response)
    }

    this.processing = false
  }

  private async sendResponse(response: string | string[]): Promise<void> {
    const responses = Array.isArray(response) ? response : [response]

    for (const resp of responses) {
      await new Promise(resolve => setTimeout(resolve, 10))
      if (this.ptyProcess) {
        this.ptyProcess.write(resp)
      } else if (this.childProcess?.stdin) {
        this.childProcess.stdin.write(resp)
      }
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  clear(): void {
    this.queue = []
  }

  getQueueLength(): number {
    return this.queue.length
  }

  isProcessing(): boolean {
    return this.processing
  }
}
