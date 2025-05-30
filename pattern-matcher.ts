import stripAnsi from 'strip-ansi'

export type PatternAction = { type: 'input'; response: string | string[] }

export interface PatternConfig {
  id: string
  pattern: string[]
  action: PatternAction
}

export interface MatchResult {
  patternId: string
  action: PatternAction
  matchedText: string
  bufferContent: string
  strippedBufferContent: string
}

export class PatternMatcher {
  private patterns: Map<string, CompiledPattern> = new Map()
  private lastMatches: Map<string, string> = new Map()
  private lastMatchTimestamps: Map<string, number> = new Map()
  private buffer: string = ''
  private maxSize: number
  private duplicatePreventionWindowMs: number

  constructor(
    bufferSize: number = 2048,
    duplicatePreventionWindowMs: number = 5000,
  ) {
    this.maxSize = bufferSize
    this.duplicatePreventionWindowMs = duplicatePreventionWindowMs
  }

  addPattern(config: PatternConfig): void {
    const compiled = this.compilePattern(config)
    this.patterns.set(config.id, compiled)
  }

  removePattern(id: string): void {
    this.patterns.delete(id)
    this.lastMatches.delete(id)
    this.lastMatchTimestamps.delete(id)
  }

  getBufferContent(): string {
    return this.buffer
  }

  processData(data: string): MatchResult[] {
    if (data.length > 0) {
      this.buffer += data
      if (this.buffer.length > this.maxSize) {
        this.buffer = this.buffer.slice(-this.maxSize)
      }
    }

    const content = this.buffer
    const strippedContent = stripAnsi(content)
    const matches: MatchResult[] = []

    for (const [id, pattern] of this.patterns) {
      const sequenceMatch = this.matchSequence(
        strippedContent,
        pattern.sequence,
      )

      if (sequenceMatch) {
        const now = Date.now()
        const lastMatch = this.lastMatches.get(id)
        const lastTimestamp = this.lastMatchTimestamps.get(id) || 0

        // Check if we should prevent duplicate based on time window and text similarity
        if (
          this.shouldPreventDuplicate(
            id,
            sequenceMatch.text,
            lastMatch,
            lastTimestamp,
            now,
          )
        ) {
          continue
        }

        matches.push({
          patternId: id,
          action: pattern.config.action,
          matchedText: sequenceMatch.text,
          bufferContent: content,
          strippedBufferContent: strippedContent,
        })
        this.lastMatches.set(id, sequenceMatch.text)
        this.lastMatchTimestamps.set(id, now)
      }
    }

    return matches
  }

  private shouldPreventDuplicate(
    patternId: string,
    currentText: string,
    lastMatch: string | undefined,
    lastTimestamp: number,
    now: number,
  ): boolean {
    // If no previous match, allow this one
    if (!lastMatch) {
      return false
    }

    // If the matched text is different, allow immediately (different files/prompts)
    if (currentText !== lastMatch) {
      return false
    }

    // Same text: check if within time window (true duplicate)
    return now - lastTimestamp <= this.duplicatePreventionWindowMs
  }

  private compilePattern(config: PatternConfig): CompiledPattern {
    return {
      sequence: config.pattern,
      config,
    }
  }

  private matchSequence(
    content: string,
    sequence: string[],
  ): { text: string } | null {
    if (sequence.length === 0) {
      return null
    }
    const lines = content.split('\n')
    let sequenceIndex = 0
    let firstMatchLine = -1
    let lastMatchLine = -1

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      const searchString = sequence[sequenceIndex]

      if (!searchString) {
        return null
      }

      const matches = line.toLowerCase().includes(searchString.toLowerCase())

      if (matches) {
        if (sequenceIndex === 0) {
          firstMatchLine = i
        }
        sequenceIndex++
        lastMatchLine = i

        if (sequenceIndex === sequence.length) {
          const text = lines.slice(firstMatchLine, lastMatchLine + 1).join('\n')
          return { text }
        }
      }
    }

    return null
  }
}

interface CompiledPattern {
  sequence: string[]
  config: PatternConfig
}
