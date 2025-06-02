import stripAnsi from 'strip-ansi'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { type PatternConfig } from '../config/schemas'
import { CONFIG_PATHS } from '../config/paths'

export interface MatchResult {
  patternId: string
  patternTitle: string
  response: string | string[]
  matchedText: string
  fullMatchedContent: string
  firstLineNumber: number
  lastLineNumber: number
  bufferContent: string
  strippedBufferContent: string
  extractedData?: Record<string, string>
  notification?: string
}

export class PatternMatcher {
  private patterns: Map<string, CompiledPattern> = new Map()
  private previousMatch: MatchResult | null = null
  private logAllMatches: boolean = false

  constructor(logAllMatches: boolean = false) {
    this.logAllMatches = logAllMatches
    if (this.logAllMatches) {
      this.ensureLogDirectory()
    }
  }

  addPattern(config: PatternConfig): void {
    if (!config.title) {
      throw new Error(`Pattern ${config.id} is missing required title field`)
    }
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
      const hasAnsiPattern = pattern.sequence.some(p =>
        this.containsAnsiSequence(p),
      )
      const contentToMatch = hasAnsiPattern ? content : strippedContent

      const sequenceMatch = this.matchSequence(contentToMatch, pattern.sequence)

      if (sequenceMatch) {
        const response =
          typeof pattern.config.response === 'function'
            ? pattern.config.response()
            : pattern.config.response

        // Apply transformExtractedData if present
        let extractedData = sequenceMatch.extractedData
        if (extractedData && pattern.config.transformExtractedData) {
          extractedData = pattern.config.transformExtractedData(extractedData)
        }

        allMatches.push({
          patternId: id,
          patternTitle: pattern.config.title || `Unknown Pattern (${id})`,
          response,
          matchedText: sequenceMatch.text,
          fullMatchedContent: sequenceMatch.fullMatchedContent,
          firstLineNumber: sequenceMatch.firstLineNumber,
          lastLineNumber: sequenceMatch.lastLineNumber,
          bufferContent: content,
          strippedBufferContent: strippedContent,
          extractedData,
          notification: pattern.config.notification,
        })
      }
    }

    if (allMatches.length === 0) {
      return []
    }

    const bottomMostMatch = allMatches.reduce((bottomMost, current) =>
      current.lastLineNumber > bottomMost.lastLineNumber ? current : bottomMost,
    )

    const matchedPattern = this.patterns.get(bottomMostMatch.patternId)
    const patternType = matchedPattern?.config.type
    const isSelfClearing = patternType === 'completion'

    if (
      !isSelfClearing &&
      this.previousMatch &&
      this.previousMatch.fullMatchedContent ===
        bottomMostMatch.fullMatchedContent
    ) {
      return []
    }

    this.previousMatch = bottomMostMatch

    if (this.logAllMatches) {
      this.logMatch(bottomMostMatch)
    }

    return [bottomMostMatch]
  }

  processDataByType(
    data: string,
    filterType: 'completion' | 'prompt',
  ): MatchResult[] {
    const content = data
    const strippedContent = stripAnsi(content)
    const allMatches: MatchResult[] = []

    for (const [id, pattern] of this.patterns) {
      if (pattern.config.type !== filterType) {
        continue
      }

      const hasAnsiPattern = pattern.sequence.some(p =>
        this.containsAnsiSequence(p),
      )
      const contentToMatch = hasAnsiPattern ? content : strippedContent

      const sequenceMatch = this.matchSequence(contentToMatch, pattern.sequence)

      if (sequenceMatch) {
        const response =
          typeof pattern.config.response === 'function'
            ? pattern.config.response()
            : pattern.config.response

        // Apply transformExtractedData if present
        let extractedData = sequenceMatch.extractedData
        if (extractedData && pattern.config.transformExtractedData) {
          extractedData = pattern.config.transformExtractedData(extractedData)
        }

        allMatches.push({
          patternId: id,
          patternTitle: pattern.config.title || `Unknown Pattern (${id})`,
          response,
          matchedText: sequenceMatch.text,
          fullMatchedContent: sequenceMatch.fullMatchedContent,
          firstLineNumber: sequenceMatch.firstLineNumber,
          lastLineNumber: sequenceMatch.lastLineNumber,
          bufferContent: content,
          strippedBufferContent: strippedContent,
          extractedData,
          notification: pattern.config.notification,
        })
      }
    }

    if (allMatches.length === 0) {
      return []
    }

    const bottomMostMatch = allMatches.reduce((bottomMost, current) =>
      current.lastLineNumber > bottomMost.lastLineNumber ? current : bottomMost,
    )

    const matchedPattern = this.patterns.get(bottomMostMatch.patternId)
    const patternType = matchedPattern?.config.type
    const isSelfClearing = patternType === 'completion'

    if (
      !isSelfClearing &&
      this.previousMatch &&
      this.previousMatch.fullMatchedContent ===
        bottomMostMatch.fullMatchedContent
    ) {
      return []
    }

    this.previousMatch = bottomMostMatch

    if (this.logAllMatches) {
      this.logMatch(bottomMostMatch)
    }

    return [bottomMostMatch]
  }

  private compilePattern(config: PatternConfig): CompiledPattern {
    return {
      sequence: config.pattern,
      config,
    }
  }

  private containsAnsiSequence(text: string): boolean {
    return /\x1b\[[0-9;]*m/.test(text)
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

    const matchedLines: Array<{
      lineIndex: number
      patternIndex: number
      lineResult: any
      isMultilinePlaceholder: boolean
    }> = []

    let startSearchFrom = 0

    for (let patternIndex = 0; patternIndex < sequence.length; patternIndex++) {
      const pattern = sequence[patternIndex]

      if (this.isMultilinePlaceholderPattern(pattern)) {
        matchedLines.push({
          lineIndex: -1, // Will be filled in later
          patternIndex,
          lineResult: { matches: true, extractedData: {} },
          isMultilinePlaceholder: true,
        })
        continue
      }

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
            isMultilinePlaceholder: false,
          })
          startSearchFrom = lineIndex + 1
          found = true
          break
        }
      }

      if (!found) {
        return null
      }
    }

    const extractedData: Record<string, string> = {}
    let firstLineNumber = -1
    let lastLineNumber = -1

    for (let i = 0; i < matchedLines.length; i++) {
      const match = matchedLines[i]

      if (!match.isMultilinePlaceholder) {
        if (firstLineNumber === -1) {
          firstLineNumber = match.lineIndex
        }
        lastLineNumber = match.lineIndex

        Object.assign(extractedData, match.lineResult.extractedData)
      } else {
        const pattern = sequence[match.patternIndex]
        const multilinePlaceholderInfo = this.parseMultilinePlaceholder(pattern)

        if (multilinePlaceholderInfo) {
          const prevMatch = this.findPreviousConcreteMatch(matchedLines, i)
          const nextMatch = this.findNextConcreteMatch(matchedLines, i)

          if (prevMatch !== null && nextMatch !== null) {
            const startLine = prevMatch.lineIndex + 1
            const endLine = nextMatch.lineIndex - 1

            if (startLine <= endLine) {
              const capturedContent = lines
                .slice(startLine, endLine + 1)
                .join('\n')
              extractedData[multilinePlaceholderInfo.name] = capturedContent
            } else {
              extractedData[multilinePlaceholderInfo.name] = ''
            }
          } else if (prevMatch !== null && nextMatch === null) {
            const startLine = prevMatch.lineIndex + 1
            if (startLine < lines.length) {
              const capturedContent = lines.slice(startLine).join('\n')
              extractedData[multilinePlaceholderInfo.name] = capturedContent
            } else {
              extractedData[multilinePlaceholderInfo.name] = ''
            }
          } else if (prevMatch === null && nextMatch !== null) {
            const endLine = nextMatch.lineIndex - 1
            if (endLine >= 0) {
              const capturedContent = lines.slice(0, endLine + 1).join('\n')
              extractedData[multilinePlaceholderInfo.name] = capturedContent
            } else {
              extractedData[multilinePlaceholderInfo.name] = ''
            }
          }
        }
      }
    }

    if (firstLineNumber === -1 || lastLineNumber === -1) {
      return null
    }

    const text = lines.slice(firstLineNumber, lastLineNumber + 1).join('\n')
    const fullMatchedContent = text

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
    const placeholders: Array<{
      name: string
      type: 'simple' | 'multiline'
      start: number
      end: number
    }> = []
    let match

    while ((match = placeholderRegex.exec(pattern)) !== null) {
      const content = match[1].trim()
      let name: string
      let type: 'simple' | 'multiline' = 'simple'

      if (content.includes('|')) {
        const parts = content.split('|').map(p => p.trim())
        name = parts[0]
        const typeStr = parts[1]
        if (typeStr === 'multiline') {
          type = 'multiline'
        }
      } else {
        name = content
      }

      placeholders.push({
        name,
        type,
        start: match.index,
        end: match.index + match[0].length,
      })
    }

    if (placeholders.length === 0) {
      return {
        matches: line.includes(pattern),
        extractedData: {},
      }
    }

    let regexPattern = pattern

    const PLACEHOLDER_MARKER = '___PLACEHOLDER___'
    for (let i = placeholders.length - 1; i >= 0; i--) {
      const placeholder = placeholders[i]
      const before = regexPattern.substring(0, placeholder.start)
      const after = regexPattern.substring(placeholder.end)
      regexPattern = before + PLACEHOLDER_MARKER + after
    }

    regexPattern = regexPattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

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

  private isMultilinePlaceholderPattern(pattern: string): boolean {
    const placeholderRegex = /\{\{\s*([^}]+)\s*\}\}/g
    let match

    while ((match = placeholderRegex.exec(pattern)) !== null) {
      const content = match[1].trim()
      if (
        content.includes('|') &&
        content.split('|')[1]?.trim() === 'multiline'
      ) {
        return true
      }
    }

    return false
  }

  private parseMultilinePlaceholder(pattern: string): { name: string } | null {
    const placeholderRegex = /\{\{\s*([^}]+)\s*\}\}/g
    let match

    while ((match = placeholderRegex.exec(pattern)) !== null) {
      const content = match[1].trim()
      if (content.includes('|')) {
        const parts = content.split('|').map(p => p.trim())
        if (parts[1] === 'multiline') {
          return { name: parts[0] }
        }
      }
    }

    return null
  }

  private findPreviousConcreteMatch(
    matchedLines: Array<{
      lineIndex: number
      patternIndex: number
      lineResult: any
      isMultilinePlaceholder: boolean
    }>,
    currentIndex: number,
  ): { lineIndex: number; patternIndex: number } | null {
    for (let i = currentIndex - 1; i >= 0; i--) {
      if (!matchedLines[i].isMultilinePlaceholder) {
        return {
          lineIndex: matchedLines[i].lineIndex,
          patternIndex: matchedLines[i].patternIndex,
        }
      }
    }
    return null
  }

  private findNextConcreteMatch(
    matchedLines: Array<{
      lineIndex: number
      patternIndex: number
      lineResult: any
      isMultilinePlaceholder: boolean
    }>,
    currentIndex: number,
  ): { lineIndex: number; patternIndex: number } | null {
    for (let i = currentIndex + 1; i < matchedLines.length; i++) {
      if (!matchedLines[i].isMultilinePlaceholder) {
        return {
          lineIndex: matchedLines[i].lineIndex,
          patternIndex: matchedLines[i].patternIndex,
        }
      }
    }
    return null
  }

  private ensureLogDirectory(): void {
    const logsDir = CONFIG_PATHS.getLogsDirectory()
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true })
    }
  }

  private logMatch(match: MatchResult): void {
    try {
      const logsDir = CONFIG_PATHS.getLogsDirectory()
      const logFile = path.join(
        logsDir,
        `pattern-matches-${match.patternId}.jsonl`,
      )

      const logEntry = {
        timestamp: new Date().toISOString(),
        patternId: match.patternId,
        matchedText: match.matchedText,
        fullMatchedContent: match.fullMatchedContent,
        firstLineNumber: match.firstLineNumber,
        lastLineNumber: match.lastLineNumber,
        extractedData: match.extractedData,
      }

      const logLine = JSON.stringify(logEntry) + '\n'
      fs.appendFileSync(logFile, logLine)
    } catch (error) {}
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
