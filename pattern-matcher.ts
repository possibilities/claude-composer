import stripAnsi from 'strip-ansi'

export type PatternAction =
  | { type: 'input'; response: string | string[] }
  | { type: 'log'; path: string }

export interface PatternConfig {
  id: string
  pattern: string | RegExp | string[]
  action: PatternAction
  cooldown?: number
  multiline?: boolean
  caseSensitive?: boolean
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
  private lastMatchTimes: Map<string, number> = new Map()
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
    this.lastMatchTimes.delete(id)
  }

  processData(data: string): MatchResult[] {
    if (data.length > 0) {
      this.buffer.append(data)
    }

    const content = this.buffer.getContent()
    const strippedContent = stripAnsi(content)
    const matches: MatchResult[] = []
    const now = Date.now()

    for (const [id, pattern] of this.patterns) {
      if (this.isInCooldown(id, now)) {
        continue
      }

      let matchResult: { matched: boolean; text: string } | null = null

      if (pattern.regex) {
        const regexMatch = pattern.regex.exec(strippedContent)
        if (regexMatch) {
          matchResult = { matched: true, text: regexMatch[0] }
        }
      } else if (pattern.sequence) {
        const sequenceMatch = this.matchSequence(
          strippedContent,
          pattern.sequence,
          pattern.config.caseSensitive,
        )
        if (sequenceMatch) {
          matchResult = { matched: true, text: sequenceMatch.text }
        }
      }

      if (matchResult) {
        matches.push({
          patternId: id,
          action: pattern.config.action,
          matchedText: matchResult.text,
          bufferContent: content,
          strippedBufferContent: strippedContent,
        })
        this.lastMatchTimes.set(id, now)
      }
    }

    return matches
  }

  private compilePattern(config: PatternConfig): CompiledPattern {
    if (Array.isArray(config.pattern)) {
      return {
        sequence: config.pattern,
        config,
      }
    } else if (config.pattern instanceof RegExp) {
      return {
        regex: config.pattern,
        config,
      }
    } else {
      const flags = []
      if (!config.caseSensitive) flags.push('i')
      if (config.multiline) flags.push('m')

      const escaped = config.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      return {
        regex: new RegExp(escaped, flags.join('')),
        config,
      }
    }
  }

  private isInCooldown(patternId: string, now: number): boolean {
    const lastMatch = this.lastMatchTimes.get(patternId)
    if (!lastMatch) return false

    const pattern = this.patterns.get(patternId)
    const cooldown = pattern?.config.cooldown || 1000

    return now - lastMatch < cooldown
  }

  private matchSequence(
    content: string,
    sequence: string[],
    caseSensitive?: boolean,
  ): { text: string } | null {
    if (sequence.length === 0) {
      return null
    }

    // Optimization: First check if the last line of the sequence exists
    const lastPatternLine = sequence[sequence.length - 1]
    const quickCheck = caseSensitive
      ? content.includes(lastPatternLine)
      : content.toLowerCase().includes(lastPatternLine.toLowerCase())

    if (!quickCheck) {
      // Last line not found, no need to do full sequence matching
      return null
    }

    // Proceed with full sequence matching
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

      const matches = caseSensitive
        ? line.includes(searchString)
        : line.toLowerCase().includes(searchString.toLowerCase())

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
  regex?: RegExp
  sequence?: string[]
  config: PatternConfig
}
