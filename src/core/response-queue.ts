import * as pty from '@homebridge/node-pty-prebuilt-multiarch'
import { ChildProcess } from 'child_process'

export interface QueuedResponse {
  id: string
  response: string | (string | number)[] | null | undefined
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

  enqueue(
    response: string | (string | number)[] | null | undefined,
    delay: number = 0,
  ): void {
    // Skip if response is null or undefined
    if (response === null || response === undefined) {
      return
    }
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

  private async sendResponse(
    response: string | (string | number)[],
  ): Promise<void> {
    const responses = Array.isArray(response) ? response : [response]

    for (const resp of responses) {
      if (typeof resp === 'number') {
        // If it's a number, use it as a pause duration in milliseconds
        await this.sleep(resp)
      } else {
        // If it's a string, send it to the PTY or child process
        if (this.ptyProcess) {
          this.ptyProcess.write(resp)
        } else if (this.childProcess?.stdin) {
          this.childProcess.stdin.write(resp)
        }
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
