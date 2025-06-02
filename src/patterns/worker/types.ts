import type { PatternConfig } from '../../config/schemas'
import type { MatchResult } from '../matcher'

/**
 * Message types for communication between main thread and worker
 */
export enum WorkerMessageType {
  INITIALIZE = 'INITIALIZE',
  MATCH = 'MATCH',
  MATCH_RESULT = 'MATCH_RESULT',
  ERROR = 'ERROR',
  READY = 'READY',
}

/**
 * Filter type for pattern matching
 */
export type FilterType = 'completion' | 'prompt'

/**
 * Request to match patterns against content
 */
export interface MatchRequest {
  id: string
  content: string
  filterType?: FilterType
  timestamp: number
}

/**
 * Result of pattern matching
 */
export interface MatchResponse {
  id: string
  matches: MatchResult[]
  duration: number
  error?: string
}

/**
 * Messages sent to the worker
 */
export type WorkerMessage =
  | {
      type: WorkerMessageType.INITIALIZE
      patterns: PatternConfig[]
      logAllMatches: boolean
    }
  | {
      type: WorkerMessageType.MATCH
      request: MatchRequest
    }

/**
 * Messages received from the worker
 */
export type WorkerResponse =
  | {
      type: WorkerMessageType.READY
    }
  | {
      type: WorkerMessageType.MATCH_RESULT
      response: MatchResponse
    }
  | {
      type: WorkerMessageType.ERROR
      error: string
      requestId?: string
    }

/**
 * Pattern matching error details
 */
export interface PatternError {
  patternId: string
  error: string
  timestamp: number
  content?: string
}

/**
 * Pattern matching metrics
 */
export interface PatternMetrics {
  patternId: string
  matchCount: number
  errorCount: number
  totalDuration: number
  averageDuration: number
}
