#!/usr/bin/env tsx

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { PatternMatcher } from '../src/patterns/matcher'
import { patterns } from '../src/patterns/registry'
import { stripBoxChars } from '../src/utils/strip-box-chars'

// Configuration variables
const SHOW_SUBSTRING = 'SetRecordDirectory'
const DELETE_SUBSTRING = ''

interface LogEntry {
  fullMatchedContent?: string
  patternId?: string
  [key: string]: any
}

const LOG_FILES = [
  '~/.claude-composer/logs/pattern-matches-bash-command-prompt.jsonl',
  '~/.claude-composer/logs/pattern-matches-bash-command-prompt-format-1.jsonl',
  '~/.claude-composer/logs/pattern-matches-bash-command-prompt-format-2.jsonl',
]

// Track totals across all files
let totalShownCount = 0
let totalDeletedCount = 0

// Iterate through LOG_FILES and process entries based on configuration
LOG_FILES.forEach(logFile => {
  const expandedPath = logFile.replace('~', os.homedir())

  try {
    if (fs.existsSync(expandedPath)) {
      const content = fs.readFileSync(expandedPath, 'utf-8')
      const lines = content
        .trim()
        .split('\n')
        .filter(line => line.trim())

      if (lines.length > 0) {
        const linesToKeep: string[] = []
        let fileShownCount = 0
        let fileDeletedCount = 0

        lines.forEach((line, index) => {
          try {
            const jsonData = JSON.parse(line)
            let shouldDelete = false
            let shouldShow = false

            if (jsonData.fullMatchedContent) {
              // Only process entries that look like they might have command data
              const stripped = stripBoxChars(jsonData.fullMatchedContent)
              if (!stripped.includes('Bash command')) {
                linesToKeep.push(line)
                return // Skip non-bash command entries
              }

              // Recreate extractedData using PatternMatcher
              const matcher = new PatternMatcher()

              // Always try all prompt patterns
              const promptPatterns = patterns.filter(p => p.type === 'prompt')

              // Add all prompt patterns
              promptPatterns.forEach(pattern => matcher.addPattern(pattern))

              const matches = matcher.processData(jsonData.fullMatchedContent)

              if (
                matches.length > 0 &&
                matches[0].extractedData &&
                matches[0].extractedData.command
              ) {
                const command = stripBoxChars(
                  matches[0].extractedData.command,
                ).trim()

                // Check if we should show based on SHOW_SUBSTRING
                if (SHOW_SUBSTRING && command.includes(SHOW_SUBSTRING)) {
                  shouldShow = true
                  fileShownCount++
                }

                // Check if we should delete based on DELETE_SUBSTRING
                if (DELETE_SUBSTRING && command.includes(DELETE_SUBSTRING)) {
                  shouldDelete = true
                  fileDeletedCount++
                  console.log(
                    '\n--- DELETING Entry from',
                    path.basename(logFile),
                    '---',
                  )
                  console.log('Matched Content:', stripped)
                  console.log('Extracted Command:', command)

                  // Show all extracted data
                  if (matches[0].extractedData) {
                    console.log('Extracted Data:')
                    Object.entries(matches[0].extractedData).forEach(
                      ([key, value]) => {
                        const cleanedValue = stripBoxChars(
                          value as string,
                        ).trim()
                        console.log(`  ${key}: ${cleanedValue}`)
                      },
                    )
                  }
                  console.log('---\n')
                } else if (shouldShow) {
                  console.log(
                    '\n--- SHOWING Entry from',
                    path.basename(logFile),
                    '---',
                  )
                  console.log('Matched Content:', stripped)
                  console.log('Extracted Command:', command)

                  // Show all extracted data
                  if (matches[0].extractedData) {
                    console.log('Extracted Data:')
                    Object.entries(matches[0].extractedData).forEach(
                      ([key, value]) => {
                        const cleanedValue = stripBoxChars(
                          value as string,
                        ).trim()
                        console.log(`  ${key}: ${cleanedValue}`)
                      },
                    )
                  }
                  console.log('---\n')
                } else if (!SHOW_SUBSTRING) {
                  // Only print commands normally if SHOW_SUBSTRING is not set
                  console.log(command)
                  console.log('Matched:', stripped)

                  // Show all extracted data
                  if (matches[0].extractedData) {
                    console.log('Extracted Data:')
                    Object.entries(matches[0].extractedData).forEach(
                      ([key, value]) => {
                        const cleanedValue = stripBoxChars(
                          value as string,
                        ).trim()
                        console.log(`  ${key}: ${cleanedValue}`)
                      },
                    )
                  }
                  console.log() // Empty line for readability
                }
                // If SHOW_SUBSTRING is set but this entry doesn't match, don't print anything
              }
            }

            if (!shouldDelete) {
              linesToKeep.push(line)
            }
          } catch (parseError) {
            console.log(
              `Failed to parse line ${index + 1} as JSON:`,
              parseError.message,
            )
            linesToKeep.push(line) // Keep lines that can't be parsed
          }
        })

        // Update totals
        totalShownCount += fileShownCount
        totalDeletedCount += fileDeletedCount

        // Rewrite the file if we deleted entries
        if (fileDeletedCount > 0) {
          const newContent =
            linesToKeep.join('\n') + (linesToKeep.length > 0 ? '\n' : '')
          fs.writeFileSync(expandedPath, newContent, 'utf-8')
          console.log(
            `Deleted ${fileDeletedCount} entries from ${path.basename(logFile)}`,
          )
        }
      } else {
        console.log(`\n${path.basename(logFile)} is empty`)
      }
    } else {
      console.log(`\n${path.basename(logFile)} does not exist`)
    }
  } catch (error) {
    console.error(`Error processing ${path.basename(logFile)}:`, error.message)
  }
})

// Print summary
if (SHOW_SUBSTRING || DELETE_SUBSTRING) {
  console.log('\n=== SUMMARY ===')
  if (SHOW_SUBSTRING) {
    console.log(
      `Total entries shown containing "${SHOW_SUBSTRING}": ${totalShownCount}`,
    )
  }
  if (DELETE_SUBSTRING) {
    console.log(
      `Total entries deleted containing "${DELETE_SUBSTRING}": ${totalDeletedCount}`,
    )
  }
}
