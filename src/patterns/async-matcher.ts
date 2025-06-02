import { PatternMatchingWorker } from './worker'
import type { PatternConfig } from '../config/schemas'
import type { MatchResult } from './matcher'
import type { FilterType } from './worker/types'

/**
 * Async pattern matcher using worker threads
 * Drop-in replacement for PatternMatcher with async API
 */
export class AsyncPatternMatcher {
  private worker: PatternMatchingWorker
  private patterns: PatternConfig[] = []
  private initialized = false

  constructor(private logAllMatches: boolean = false) {
    this.worker = new PatternMatchingWorker({
      logAllMatches: this.logAllMatches,
    })

    // Set up event handlers
    this.worker.on('error', error => {
      console.error('Pattern matching error:', error)
    })
  }

  /**
   * Add a pattern configuration
   */
  addPattern(pattern: PatternConfig): void {
    this.patterns.push(pattern)
    this.initialized = false // Need to reinitialize worker
  }

  /**
   * Initialize worker if needed
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.worker.initialize(this.patterns)
      this.initialized = true
    }
  }

  /**
   * Process data and find matches asynchronously
   */
  async processData(data: string): Promise<MatchResult[]> {
    await this.ensureInitialized()
    return this.worker.match(data)
  }

  /**
   * Process data with type filter
   */
  async processDataByType(
    data: string,
    type: FilterType,
  ): Promise<MatchResult[]> {
    await this.ensureInitialized()
    return this.worker.match(data, type)
  }

  /**
   * Process data with debouncing
   * Results are emitted via the 'matches' event
   */
  processDataDebounced(
    data: string,
    filterType?: FilterType,
    debounceKey?: string,
  ): void {
    this.ensureInitialized().then(() => {
      this.worker.matchDebounced(data, filterType, debounceKey)
    })
  }

  /**
   * Subscribe to match results from debounced processing
   */
  onMatches(callback: (matches: MatchResult[]) => void): void {
    this.worker.on('matches', callback)
  }

  /**
   * Get error report
   */
  getErrorReport() {
    return this.worker.getErrorReport()
  }

  /**
   * Get list of disabled patterns
   */
  getDisabledPatterns(): string[] {
    return this.worker.getDisabledPatterns()
  }

  /**
   * Cleanup resources
   */
  async destroy(): Promise<void> {
    await this.worker.terminate()
  }
}

/**
 * Factory function to create async pattern matcher
 */
export function createAsyncPatternMatcher(
  logAllMatches: boolean = false,
): AsyncPatternMatcher {
  return new AsyncPatternMatcher(logAllMatches)
}
