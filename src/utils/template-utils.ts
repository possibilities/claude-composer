import * as path from 'path'
import stripAnsi from 'strip-ansi'
import { MatchResult } from '../patterns/matcher'
import { stripBoxChars } from './strip-box-chars'

export function replacePlaceholders(
  template: string,
  match: MatchResult,
): string {
  let result = template

  const projectName = path.basename(process.cwd())
  result = result.replace(/\{\{\s*title\s*\}\}/gi, match.patternTitle)
  result = result.replace(/\{\{\s*project\s*\}\}/gi, projectName)
  result = result.replace(
    /\{\{\s*matchedText\s*\}\}/gi,
    stripAnsi(match.matchedText),
  )

  if (match.extractedData) {
    for (const [key, value] of Object.entries(match.extractedData)) {
      const regex = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'gi')
      const strippedValue = stripBoxChars(value)
      const cleanValue = strippedValue
        .split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .join('\n')
        .trim()
      result = result.replace(regex, cleanValue)
    }
  }

  return result
}
