export interface PatternConfig {
  id: string
  pattern: string | RegExp
  response: string | string[]
  cooldown?: number
  multiline?: boolean
  caseSensitive?: boolean
}

export interface MatchResult {
  patternId: string
  response: string | string[]
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
    this.buffer.append(data)
    const content = this.buffer.getContent()
    const matches: MatchResult[] = []
    const now = Date.now()

    for (const [id, pattern] of this.patterns) {
      if (this.isInCooldown(id, now)) {
        continue
      }

      if (pattern.regex.test(content)) {
        matches.push({
          patternId: id,
          response: pattern.config.response,
        })
        this.lastMatchTimes.set(id, now)
      }
    }

    return matches
  }

  private compilePattern(config: PatternConfig): CompiledPattern {
    let regex: RegExp

    if (config.pattern instanceof RegExp) {
      regex = config.pattern
    } else {
      const flags = []
      if (!config.caseSensitive) flags.push('i')
      if (config.multiline) flags.push('m')

      const escaped = config.pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      regex = new RegExp(escaped, flags.join(''))
    }

    return {
      regex,
      config,
    }
  }

  private isInCooldown(patternId: string, now: number): boolean {
    const lastMatch = this.lastMatchTimes.get(patternId)
    if (!lastMatch) return false

    const pattern = this.patterns.get(patternId)
    const cooldown = pattern?.config.cooldown || 1000

    return now - lastMatch < cooldown
  }
}

interface CompiledPattern {
  regex: RegExp
  config: PatternConfig
}
