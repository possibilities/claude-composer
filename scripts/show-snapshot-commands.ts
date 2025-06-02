#!/usr/bin/env tsx

import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { stripBoxChars } from '../src/utils/strip-box-chars'
import parse from 'bash-parser'

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

  try {
    const ast = parse(command)
    const commandNames: string[] = []

    // Recursive function to extract command names from AST
    const extractCommands = (node: any): void => {
      if (!node) return

      if (node.type === 'Command' && node.name?.text) {
        commandNames.push(node.name.text)
      }

      // Recursively check various node types that can contain commands
      if (node.commands) {
        node.commands.forEach(extractCommands)
      }
      if (node.clause) {
        extractCommands(node.clause)
      }
      if (node.then) {
        extractCommands(node.then)
      }
      if (node.else) {
        extractCommands(node.else)
      }
      if (node.do) {
        extractCommands(node.do)
      }
      if (node.list) {
        extractCommands(node.list)
      }
      if (node.body) {
        extractCommands(node.body)
      }
      if (node.cases) {
        node.cases.forEach((caseItem: any) => {
          if (caseItem.body) extractCommands(caseItem.body)
        })
      }
      if (node.left) {
        extractCommands(node.left)
      }
      if (node.right) {
        extractCommands(node.right)
      }
    }

    extractCommands(ast)

    if (commandNames.length > 0) {
      console.log(`Commands: ${commandNames.join(', ')}`)
    } else {
      console.log('Commands: (none found)')
    }
    console.log('-'.repeat(50))
  } catch (error) {
    console.log(`Parse error: ${error.message}`)
    console.log('-'.repeat(50))
  }
}
