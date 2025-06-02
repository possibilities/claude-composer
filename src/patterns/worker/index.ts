import { Worker } from 'worker_threads'
import * as path from 'path'
import { EventEmitter } from 'events'
import type { PatternConfig } from '../../config/schemas'
import type {
  MatchRequest,
  MatchResponse,
  WorkerMessage,
  WorkerResponse,
  WorkerMessageType,
  FilterType,
} from './types'
import type { MatchResult } from '../matcher'
import { PatternErrorHandler } from './error-handler'
import { PatternDebouncer } from './debouncer'

/**
 * Options for pattern matching worker
 */
export interface PatternWorkerOptions {
  logAllMatches?: boolean
  maxWorkerRestarts?: number
}

/**
 * Async pattern matching using worker threads
 */
export class PatternMatchingWorker extends EventEmitter {
  private worker: Worker | null = null
  private errorHandler: PatternErrorHandler
  private debouncer: PatternDebouncer
  private pendingRequests: Map<
    string,
    {
      resolve: (matches: MatchResult[]) => void
      reject: (error: Error) => void
    }
  > = new Map()
  private patterns: PatternConfig[] = []
  private options: PatternWorkerOptions
  private restartCount = 0
  private isReady = false
  private readyPromise: Promise<void> | null = null
  private readyResolve: (() => void) | null = null

  constructor(options: PatternWorkerOptions = {}) {
    super()
    this.options = {
      logAllMatches: false,
      maxWorkerRestarts: 3,
      ...options,
    }
    this.errorHandler = new PatternErrorHandler()
    this.debouncer = new PatternDebouncer()
  }

  /**
   * Initialize the worker with patterns
   */
  async initialize(patterns: PatternConfig[]): Promise<void> {
    this.patterns = patterns
    await this.startWorker()
  }

  /**
   * Start the worker thread
   */
  private async startWorker(): Promise<void> {
    if (this.worker) {
      await this.terminate()
    }

    // Create ready promise
    this.readyPromise = new Promise(resolve => {
      this.readyResolve = resolve
    })

    try {
      // Create worker thread
      const workerPath = path.join(__dirname, 'worker-thread.js')
      this.worker = new Worker(workerPath)

      // Set up event handlers
      this.worker.on('message', this.handleWorkerMessage.bind(this))
      this.worker.on('error', this.handleWorkerError.bind(this))
      this.worker.on('exit', this.handleWorkerExit.bind(this))

      // Initialize worker with patterns
      const initMessage: WorkerMessage = {
        type: WorkerMessageType.INITIALIZE,
        patterns: this.patterns,
        logAllMatches: this.options.logAllMatches || false,
      }
      this.worker.postMessage(initMessage)

      // Wait for ready signal
      await this.readyPromise
    } catch (error) {
      throw new Error(`Failed to start pattern worker: ${error.message}`)
    }
  }

  /**
   * Match patterns against content
   */
  async match(
    content: string,
    filterType?: FilterType,
  ): Promise<MatchResult[]> {
    if (!this.isReady) {
      throw new Error('Pattern worker not ready')
    }

    const requestId = this.generateRequestId()
    const request: MatchRequest = {
      id: requestId,
      content,
      filterType,
      timestamp: Date.now(),
    }

    return new Promise((resolve, reject) => {
      this.pendingRequests.set(requestId, { resolve, reject })

      if (!this.worker) {
        reject(new Error('Worker not available'))
        return
      }

      const message: WorkerMessage = {
        type: WorkerMessageType.MATCH,
        request,
      }

      this.worker.postMessage(message)
    })
  }

  /**
   * Match with debouncing
   */
  matchDebounced(
    content: string,
    filterType?: FilterType,
    debounceKey?: string,
  ): void {
    const key = debounceKey || `match-${filterType || 'all'}`

    const debouncedMatch = this.debouncer.debounce(key, async () => {
      try {
        const matches = await this.match(content, filterType)
        this.emit('matches', matches)
      } catch (error) {
        this.emit('error', error)
      }
    })

    debouncedMatch()
  }

  /**
   * Handle messages from worker
   */
  private handleWorkerMessage(message: WorkerResponse): void {
    switch (message.type) {
      case WorkerMessageType.READY:
        this.isReady = true
        if (this.readyResolve) {
          this.readyResolve()
          this.readyResolve = null
        }
        this.emit('ready')
        break

      case WorkerMessageType.MATCH_RESULT:
        this.handleMatchResult(message.response)
        break

      case WorkerMessageType.ERROR:
        this.handleMatchError(message.error, message.requestId)
        break
    }
  }

  /**
   * Handle match result
   */
  private handleMatchResult(response: MatchResponse): void {
    const pending = this.pendingRequests.get(response.id)
    if (!pending) return

    this.pendingRequests.delete(response.id)

    // Record metrics
    for (const match of response.matches) {
      this.errorHandler.recordMatch(match.patternId, response.duration)
    }

    // Handle any partial errors
    if (response.error) {
      console.warn(`Pattern matching had errors: ${response.error}`)
    }

    pending.resolve(response.matches)
  }

  /**
   * Handle match error
   */
  private handleMatchError(error: string, requestId?: string): void {
    if (requestId) {
      const pending = this.pendingRequests.get(requestId)
      if (pending) {
        this.pendingRequests.delete(requestId)
        pending.reject(new Error(error))
      }
    } else {
      console.error('Worker error:', error)
    }
  }

  /**
   * Handle worker errors
   */
  private handleWorkerError(error: Error): void {
    console.error('Pattern worker error:', error)
    this.emit('error', error)

    // Reject all pending requests
    for (const [id, pending] of this.pendingRequests) {
      pending.reject(new Error('Worker error'))
    }
    this.pendingRequests.clear()

    // Attempt restart
    this.attemptRestart()
  }

  /**
   * Handle worker exit
   */
  private handleWorkerExit(code: number): void {
    if (code !== 0) {
      console.warn(`Pattern worker exited with code ${code}`)
      this.attemptRestart()
    }
  }

  /**
   * Attempt to restart worker
   */
  private async attemptRestart(): Promise<void> {
    if (this.restartCount >= (this.options.maxWorkerRestarts || 3)) {
      console.error('Pattern worker restart limit reached')
      this.emit('error', new Error('Worker restart limit reached'))
      return
    }

    this.restartCount++
    console.log(`Restarting pattern worker (attempt ${this.restartCount})`)

    try {
      await this.startWorker()
      this.restartCount = 0 // Reset on successful restart
    } catch (error) {
      console.error('Failed to restart pattern worker:', error)
    }
  }

  /**
   * Terminate the worker
   */
  async terminate(): Promise<void> {
    this.debouncer.cancelAll()

    if (this.worker) {
      await this.worker.terminate()
      this.worker = null
    }

    this.isReady = false
    this.pendingRequests.clear()
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * Get error report
   */
  getErrorReport() {
    return this.errorHandler.getErrorReport()
  }

  /**
   * Get disabled patterns
   */
  getDisabledPatterns(): string[] {
    return this.patterns
      .filter(p => this.errorHandler.isPatternDisabled(p.id))
      .map(p => p.id)
  }
}
