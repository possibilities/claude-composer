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

  constructor() {}

  addPattern(config: PatternConfig): void {
    const compiled = this.compilePattern(config)
    this.patterns.set(config.id, compiled)
  }

  removePattern(id: string): void {
    this.patterns.delete(id)
  }

  processData(data: string): MatchResult[] {
    const content = data
    const strippedContent = stripAnsi(content)
    const matches: MatchResult[] = []

    for (const [id, pattern] of this.patterns) {
      const sequenceMatch = this.matchSequence(
        strippedContent,
        pattern.sequence,
      )

      if (sequenceMatch) {
        matches.push({
          patternId: id,
          action: pattern.config.action,
          matchedText: sequenceMatch.text,
          bufferContent: content,
          strippedBufferContent: strippedContent,
        })
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

      const matches = line.includes(searchString)

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
