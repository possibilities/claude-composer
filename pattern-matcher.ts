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
  fullMatchedContent: string
  firstLineNumber: number
  lastLineNumber: number
  bufferContent: string
  strippedBufferContent: string
}

export class PatternMatcher {
  private patterns: Map<string, CompiledPattern> = new Map()
  private previousMatch: MatchResult | null = null

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
    const allMatches: MatchResult[] = []

    for (const [id, pattern] of this.patterns) {
      const sequenceMatch = this.matchSequence(
        strippedContent,
        pattern.sequence,
      )

      if (sequenceMatch) {
        allMatches.push({
          patternId: id,
          action: pattern.config.action,
          matchedText: sequenceMatch.text,
          fullMatchedContent: sequenceMatch.fullMatchedContent,
          firstLineNumber: sequenceMatch.firstLineNumber,
          lastLineNumber: sequenceMatch.lastLineNumber,
          bufferContent: content,
          strippedBufferContent: strippedContent,
        })
      }
    }

    if (allMatches.length === 0) {
      return []
    }

    const bottomMostMatch = allMatches.reduce((bottomMost, current) =>
      current.lastLineNumber > bottomMost.lastLineNumber ? current : bottomMost,
    )

    if (
      this.previousMatch &&
      this.previousMatch.fullMatchedContent ===
        bottomMostMatch.fullMatchedContent
    ) {
      return []
    }

    this.previousMatch = bottomMostMatch
    return [bottomMostMatch]
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
  ): {
    text: string
    firstLineNumber: number
    lastLineNumber: number
    fullMatchedContent: string
  } | null {
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
          const fullMatchedContent = lines
            .slice(firstMatchLine, lastMatchLine + 1)
            .join('\n')
          return {
            text,
            firstLineNumber: firstMatchLine,
            lastLineNumber: lastMatchLine,
            fullMatchedContent,
          }
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
