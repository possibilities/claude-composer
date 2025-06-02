import type { PatternConfig } from '../../config/schemas'
import type { PatternError, PatternMetrics } from './types'
import { CONFIG_PATHS } from '../../config/paths'
import * as fs from 'fs'
import * as path from 'path'

/**
 * Centralized error handling for pattern matching
 */
export class PatternErrorHandler {
  private errorLog: PatternError[] = []
  private metrics: Map<string, PatternMetrics> = new Map()
  private disabledPatterns: Set<string> = new Set()
  private readonly maxErrorsBeforeDisable = 10
  private readonly errorLogFile: string

  constructor() {
    this.errorLogFile = path.join(
      CONFIG_PATHS.getLogsDirectory(),
      'pattern-errors.jsonl',
    )
    this.ensureLogDirectory()
  }

  /**
   * Handle a pattern matching error
   */
  handleMatchError(
    error: Error,
    pattern: PatternConfig,
    content?: string,
  ): void {
    const patternError: PatternError = {
      patternId: pattern.id,
      error: error.message,
      timestamp: Date.now(),
      content: content?.substring(0, 200), // Limit content size for logging
    }

    this.errorLog.push(patternError)
    this.updateMetrics(pattern.id, 'error')
    this.logError(patternError)

    // Check if pattern should be disabled
    const metrics = this.metrics.get(pattern.id)
    if (metrics && metrics.errorCount >= this.maxErrorsBeforeDisable) {
      this.disablePattern(pattern.id)
    }
  }

  /**
   * Record successful pattern match
   */
  recordMatch(patternId: string, duration: number): void {
    this.updateMetrics(patternId, 'success', duration)
  }

  /**
   * Update pattern metrics
   */
  private updateMetrics(
    patternId: string,
    type: 'success' | 'error',
    duration?: number,
  ): void {
    const current = this.metrics.get(patternId) || {
      patternId,
      matchCount: 0,
      errorCount: 0,
      totalDuration: 0,
      averageDuration: 0,
    }

    if (type === 'success') {
      current.matchCount++
      if (duration) {
        current.totalDuration += duration
        current.averageDuration = current.totalDuration / current.matchCount
      }
    } else {
      current.errorCount++
    }

    this.metrics.set(patternId, current)
  }

  /**
   * Disable a pattern that's causing too many errors
   */
  private disablePattern(patternId: string): void {
    this.disabledPatterns.add(patternId)
    console.warn(
      `Pattern "${patternId}" has been disabled due to excessive errors`,
    )
  }

  /**
   * Check if a pattern is disabled
   */
  isPatternDisabled(patternId: string): boolean {
    return this.disabledPatterns.has(patternId)
  }

  /**
   * Log error to file
   */
  private logError(error: PatternError): void {
    try {
      const logEntry = JSON.stringify(error) + '\n'
      fs.appendFileSync(this.errorLogFile, logEntry)
    } catch (e) {
      // Silently fail if logging fails
    }
  }

  /**
   * Ensure log directory exists
   */
  private ensureLogDirectory(): void {
    const logsDir = CONFIG_PATHS.getLogsDirectory()
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }
  }

  /**
   * Get error report
   */
  getErrorReport(): {
    recentErrors: PatternError[]
    metrics: PatternMetrics[]
    disabledPatterns: string[]
  } {
    return {
      recentErrors: this.errorLog.slice(-100), // Last 100 errors
      metrics: Array.from(this.metrics.values()),
      disabledPatterns: Array.from(this.disabledPatterns),
    }
  }

  /**
   * Clear error history (useful for testing)
   */
  clearHistory(): void {
    this.errorLog = []
    this.metrics.clear()
    this.disabledPatterns.clear()
  }
}
