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

export class CircularBuffer {
  private buffer: string
  private maxSize: number

  constructor(maxSize: number = 2048) {
    this.buffer = ''
    this.maxSize = maxSize
  }

  append(data: string): void {
    this.buffer += data
    if (this.buffer.length > this.maxSize) {
      this.buffer = this.buffer.slice(-this.maxSize)
    }
  }

  getContent(): string {
    return this.buffer
  }

  clear(): void {
    this.buffer = ''
  }
}

export class PatternMatcher {
  private patterns: Map<string, CompiledPattern> = new Map()
  private lastMatches: Map<string, string> = new Map()
  private buffer: CircularBuffer

  constructor(bufferSize: number = 2048) {
    this.buffer = new CircularBuffer(bufferSize)
  }

  addPattern(config: PatternConfig): void {
    const compiled = this.compilePattern(config)
    this.patterns.set(config.id, compiled)
  }

  removePattern(id: string): void {
    this.patterns.delete(id)
    this.lastMatches.delete(id)
  }

  getBufferContent(): string {
    return this.buffer.getContent()
  }

  processData(data: string): MatchResult[] {
    if (data.length > 0) {
      this.buffer.append(data)
    }

    const content = this.buffer.getContent()
    const strippedContent = stripAnsi(content)
    const matches: MatchResult[] = []

    for (const [id, pattern] of this.patterns) {
      const sequenceMatch = this.matchSequence(
        strippedContent,
        pattern.sequence,
      )

      if (sequenceMatch) {
        const lastMatch = this.lastMatches.get(id)
        if (lastMatch === sequenceMatch.text) {
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
      }
    }

    return matches
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
