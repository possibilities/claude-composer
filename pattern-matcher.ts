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
  extractedData?: Record<string, string>
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
          extractedData: sequenceMatch.extractedData,
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
    extractedData?: Record<string, string>
  } | null {
    if (sequence.length === 0) {
      return null
    }
    const lines = content.split('\n')

    // Track which lines matched which patterns
    const matchedLines: Array<{
      lineIndex: number
      patternIndex: number
      lineResult: any
    }> = []

    // For each pattern in sequence, find the first line that matches it
    // (after the previous pattern match)
    let startSearchFrom = 0

    for (let patternIndex = 0; patternIndex < sequence.length; patternIndex++) {
      const pattern = sequence[patternIndex]
      let found = false

      for (
        let lineIndex = startSearchFrom;
        lineIndex < lines.length;
        lineIndex++
      ) {
        const line = lines[lineIndex]
        const matchResult = this.matchLineWithPlaceholders(line, pattern)

        if (matchResult.matches) {
          matchedLines.push({
            lineIndex,
            patternIndex,
            lineResult: matchResult,
          })
          startSearchFrom = lineIndex + 1 // Next pattern must come after this line
          found = true
          break
        }
      }

      // If we couldn't find this pattern, the sequence doesn't match
      if (!found) {
        return null
      }
    }

    // All patterns found! Now build the result
    const firstLineNumber = matchedLines[0].lineIndex
    const lastLineNumber = matchedLines[matchedLines.length - 1].lineIndex
    const text = lines.slice(firstLineNumber, lastLineNumber + 1).join('\n')
    const fullMatchedContent = text

    // Collect extracted data from all matched lines
    const extractedData: Record<string, string> = {}
    for (const match of matchedLines) {
      Object.assign(extractedData, match.lineResult.extractedData)
    }

    return {
      text,
      firstLineNumber,
      lastLineNumber,
      fullMatchedContent,
      extractedData:
        Object.keys(extractedData).length > 0 ? extractedData : undefined,
    }
  }

  private matchLineWithPlaceholders(
    line: string,
    pattern: string,
  ): LineMatchResult {
    const extractedData: Record<string, string> = {}

    // Check if pattern contains placeholders
    const placeholderRegex = /\{\{\s*([^}]+)\s*\}\}/g
    const placeholders: Array<{ name: string; start: number; end: number }> = []
    let match

    while ((match = placeholderRegex.exec(pattern)) !== null) {
      placeholders.push({
        name: match[1].trim(),
        start: match.index,
        end: match.index + match[0].length,
      })
    }

    if (placeholders.length === 0) {
      // No placeholders, use simple string matching
      return {
        matches: line.includes(pattern),
        extractedData: {},
      }
    }

    // Build regex pattern by replacing placeholders with capture groups
    // Use a simpler approach: replace placeholders first, then escape
    let regexPattern = pattern

    // Replace all placeholders with a unique marker first
    const PLACEHOLDER_MARKER = '___PLACEHOLDER___'
    for (let i = placeholders.length - 1; i >= 0; i--) {
      const placeholder = placeholders[i]
      const before = regexPattern.substring(0, placeholder.start)
      const after = regexPattern.substring(placeholder.end)
      regexPattern = before + PLACEHOLDER_MARKER + after
    }

    // Escape all special regex characters
    regexPattern = regexPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

    // Now replace markers with capture groups
    // Use greedy matching that also allows empty strings
    regexPattern = regexPattern.replace(
      new RegExp(
        PLACEHOLDER_MARKER.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'),
        'g',
      ),
      '(.*)',
    )

    try {
      const regex = new RegExp(regexPattern)
      const lineMatch = line.match(regex)

      if (lineMatch) {
        // Extract captured values - use original order for mapping to capture groups
        const originalOrderPlaceholders = [...placeholders].sort(
          (a, b) => a.start - b.start,
        )
        originalOrderPlaceholders.forEach((placeholder, index) => {
          extractedData[placeholder.name] = lineMatch[index + 1] || ''
        })

        return {
          matches: true,
          extractedData,
        }
      }
    } catch (error) {
      // If regex construction fails, fall back to simple matching
      return {
        matches: line.includes(pattern.replace(/\{\{\s*\w+\s*\}\}/g, '')),
        extractedData: {},
      }
    }

    return {
      matches: false,
      extractedData: {},
    }
  }
}

interface CompiledPattern {
  sequence: string[]
  config: PatternConfig
}

interface LineMatchResult {
  matches: boolean
  extractedData: Record<string, string>
}
