#!/usr/bin/env tsx

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { stripBoxChars } from '../src/utils/strip-box-chars'

interface PatternMatch {
  extractedData?: {
    command?: string
  }
}

const LOG_FILES = [
  '~/.claude-composer/logs/pattern-matches-bash-command-prompt.jsonl',
  '~/.claude-composer/logs/pattern-matches-bash-command-prompt-format-1.jsonl',
  '~/.claude-composer/logs/pattern-matches-bash-command-prompt-format-2.jsonl',
]

const uniqueCommands = new Set<string>()

for (const logFile of LOG_FILES) {
  const filePath = path.resolve(os.homedir(), logFile.replace('~/', ''))

  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`)
    continue
  }

  const fileContent = fs.readFileSync(filePath, 'utf-8')
  const lines = fileContent.split('\n').filter(line => line.trim())

  for (const line of lines) {
    try {
      const data: PatternMatch = JSON.parse(line)
      const command = data.extractedData?.command

      if (command) {
        const cleanedCommand = stripBoxChars(command).trim()
        if (cleanedCommand) {
          uniqueCommands.add(cleanedCommand)
        }
      }
    } catch {
      // Silently skip parsing errors
    }
  }
}

console.log(`Found ${uniqueCommands.size} unique commands:`)
console.log('-'.repeat(50))

const sortedCommands = Array.from(uniqueCommands).sort()
for (const command of sortedCommands) {
  console.log(command)
}
