import { parentPort } from 'worker_threads'
import stripAnsi from 'strip-ansi'
import type { PatternConfig } from '../../config/schemas'
import type {
  WorkerMessage,
  WorkerResponse,
  WorkerMessageType,
  MatchRequest,
  MatchResponse,
} from './types'
import type { MatchResult } from '../matcher'

// Worker state
let patterns: PatternConfig[] = []
let logAllMatches = false

/**
 * Match a single pattern against content
 */
function matchPattern(
  pattern: PatternConfig,
  content: string,
): string | string[] | null {
  const strippedContent = stripAnsi(content)

  try {
    for (const patternStr of pattern.patterns) {
      const regex = new RegExp(patternStr, 'gm')
      const match = strippedContent.match(regex)

      if (match) {
        if (typeof pattern.response === 'function') {
          return pattern.response(match, strippedContent)
        }
        return pattern.response
      }
    }
  } catch (error) {
    throw new Error(`Pattern ${pattern.id} failed: ${error.message}`)
  }

  return null
}

/**
 * Process a match request
 */
function processMatchRequest(request: MatchRequest): MatchResponse {
  const startTime = Date.now()
  const matches: MatchResult[] = []
  const errors: string[] = []

  // Filter patterns by type if specified
  const patternsToMatch = request.filterType
    ? patterns.filter(p => p.type === request.filterType)
    : patterns

  for (const pattern of patternsToMatch) {
    try {
      const response = matchPattern(pattern, request.content)

      if (response) {
        matches.push({
          patternId: pattern.id,
          patternTitle: pattern.title,
          response,
          notification: pattern.notification,
        })

        if (logAllMatches) {
          console.log(`Pattern matched: ${pattern.id}`)
        }
      }
    } catch (error) {
      errors.push(`${pattern.id}: ${error.message}`)
    }
  }

  const duration = Date.now() - startTime

  return {
    id: request.id,
    matches,
    duration,
    error: errors.length > 0 ? errors.join('; ') : undefined,
  }
}

// Listen for messages from the main thread
if (parentPort) {
  parentPort.on('message', (message: WorkerMessage) => {
    try {
      switch (message.type) {
        case WorkerMessageType.INITIALIZE:
          patterns = message.patterns
          logAllMatches = message.logAllMatches

          // Send ready signal
          const readyResponse: WorkerResponse = {
            type: WorkerMessageType.READY,
          }
          parentPort!.postMessage(readyResponse)
          break

        case WorkerMessageType.MATCH:
          const matchResponse = processMatchRequest(message.request)

          const response: WorkerResponse = {
            type: WorkerMessageType.MATCH_RESULT,
            response: matchResponse,
          }
          parentPort!.postMessage(response)
          break

        default:
          throw new Error(`Unknown message type: ${(message as any).type}`)
      }
    } catch (error) {
      const errorResponse: WorkerResponse = {
        type: WorkerMessageType.ERROR,
        error: error.message,
        requestId: (message as any).request?.id,
      }
      parentPort!.postMessage(errorResponse)
    }
  })
}
