import { type PatternConfig, validatePatternConfigs } from '../config/schemas'
import { execSync } from 'child_process'
import { stripBoxChars } from '../utils/strip-box-chars'
import dedent from 'dedent'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { ConfigManager } from '../config/manager'

type ExtractedData = {
  body?: string
  [key: string]: any
}

function extractCommandAndReasonFromPromptBody(
  data: ExtractedData,
): ExtractedData {
  if (data.body) {
    // Strip box characters and split into lines
    const stripped = stripBoxChars(data.body)
    const lines = stripped
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0)

    // The body format is typically:
    // │                                                      │  (empty line)
    // │   command here                                       │
    // │   (potentially more command lines)                   │
    // │   reason here                                        │
    // │                                                      │  (empty line)

    // Find the actual content lines (non-empty after removing box chars)
    const contentLines = lines
      .map(line => {
        // Remove any remaining box characters and trim
        return line.replace(/[│║]/g, '').trim()
      })
      .filter(line => line.length > 0)

    if (contentLines.length >= 2) {
      // Find where the reason starts (usually after a line break in the original format)
      // The reason typically starts with a lowercase letter or specific phrases
      let commandLines: string[] = []
      let reasonIndex = -1

      for (let i = 0; i < contentLines.length; i++) {
        const line = contentLines[i]
        // Common reason starters
        if (
          line.match(
            /^(to |for |because |this will |this is |checking |running |executing |creating |updating |installing |removing |deleting |building |testing |fixing |adding |modifying )/i,
          )
        ) {
          reasonIndex = i
          break
        }
      }

      if (reasonIndex > 0) {
        // Everything before the reason is the command
        commandLines = contentLines.slice(0, reasonIndex)
        const reasonLines = contentLines.slice(reasonIndex)

        // Join command lines with spaces, clean up extra spaces
        const command = commandLines.join(' ').replace(/\s+/g, ' ').trim()
        // Join reason lines similarly
        const reason = reasonLines.join(' ').replace(/\s+/g, ' ').trim()

        return { ...data, command, reason }
      } else {
        // If we can't identify the reason, treat all but the last line as command
        if (contentLines.length > 1) {
          commandLines = contentLines.slice(0, -1)
          const command = commandLines.join(' ').replace(/\s+/g, ' ').trim()
          const reason = contentLines[contentLines.length - 1]
          return { ...data, command, reason }
        } else {
          // Single line - it's all command
          const command = contentLines[0]
          return { ...data, command, reason: '' }
        }
      }
    } else if (contentLines.length === 1) {
      // Only command, no reason
      const command = contentLines[0]
      return { ...data, command, reason: '' }
    }
  }
  return data
}

const confirmationPatterns: PatternConfig[] = [
  {
    id: 'edit-file-prompt',
    title: 'Edit file',
    type: 'confirmation' as const,
    response: '1',
    pattern: [
      'Edit file',
      '{{ editDiff | multiline }}',
      'Do you want to make this edit to {{ fileName }}?',
    ],
    triggerText: 'Edit file',
    notification: dedent(
      `
      {{ title }}: {{ actionResponse }} {{ actionResponseIcon }}
      Project: {{ project }}
      File: {{ fileName }}
      `,
    ),
  },
  {
    id: 'create-file-prompt',
    title: 'Create file',
    type: 'confirmation' as const,
    response: '1',
    pattern: ['Create file', 'Do you want to create {{ fileName }}?'],
    triggerText: 'Create file',
    notification: dedent(
      `
      {{ title }}: {{ actionResponse }} {{ actionResponseIcon }}
      Project: {{ project }}
      File: {{ fileName }}
      `,
    ),
  },
  {
    id: 'bash-command-prompt-format-1',
    title: 'Bash command',
    type: 'confirmation' as const,
    response: '1',
    pattern: [
      'Bash command',
      '{{ body | multiline }}',
      'Do you want to proceed',
      '1. Yes',
      "2. Yes, and don't ask again for {{ commandBase }} in {{ directory }}",
      '3. No',
    ],
    triggerText: 'Bash command',
    notification: dedent(
      `
      {{ title }}: {{ actionResponse }} {{ actionResponseIcon }}
      Project: {{ project }}
      Command: {{ command }}
      Reason: {{ reason }}
      Directory: {{ directory }}
      `,
    ),
    transformExtractedData: extractCommandAndReasonFromPromptBody,
  },
  {
    id: 'bash-command-prompt-format-2',
    title: 'Bash command',
    type: 'confirmation' as const,
    response: '1',
    pattern: [
      'Bash command',
      '{{ body | multiline }}',
      'Do you want to proceed',
      '1. Yes',
      '2. No',
    ],
    triggerText: 'Bash command',
    notification: dedent(
      `
      {{ title }} [2]: {{ actionResponse }} {{ actionResponseIcon }}
      Project: {{ project }}
      Command: {{ command }}
      Reason: {{ reason }}
      Directory: {{ directory }}
      `,
    ),
    transformExtractedData: extractCommandAndReasonFromPromptBody,
  },
  {
    id: 'read-files-prompt',
    title: 'Read file',
    type: 'confirmation' as const,
    response: '1',
    pattern: ['Read files', 'Read({{ fileName }})', '1. Yes'],
    triggerText: 'Read files',
    notification: dedent(
      `
      {{ title }}: {{ actionResponse }} {{ actionResponseIcon }}
      Project: {{ project }}
      File: {{ fileName }}
      `,
    ),
  },
  {
    id: 'fetch-content-prompt',
    title: 'Fetch content',
    type: 'confirmation' as const,
    response: '1',
    pattern: [
      'Fetch',
      '{{ emptyLine }}',
      '{{ url }}',
      'Claude wants to fetch content from {{ domain }}',
      'No, and tell Claude what to do differently',
    ],
    triggerText: 'Fetch',
    notification: dedent(
      `
      {{ title }}: {{ actionResponse }} {{ actionResponseIcon }}
      Project: {{ project }}
      Domain: {{ domain }}
      URL: {{ url }}
      `,
    ),
  },
]

export function getPipedInputPath(): string | undefined {
  // For tests, check if appConfig is available on global
  if (typeof (global as any).__testAppConfig !== 'undefined') {
    return (global as any).__testPipedInputPath
  }

  try {
    // Try to import from TypeScript first (for tests)
    const module = require('../index')
    return module.pipedInputPath
  } catch {
    try {
      // Fall back to compiled JavaScript (for runtime)
      const { pipedInputPath } = require('../index.js')
      return pipedInputPath
    } catch {
      return undefined
    }
  }
}

function getPipedInputResponse(): string[] {
  const pipedInputPath = getPipedInputPath()

  if (!pipedInputPath || !fs.existsSync(pipedInputPath)) {
    return ['# No piped input available', '\r']
  }

  try {
    const content = fs.readFileSync(pipedInputPath, 'utf8').trimEnd()
    return [content || '# Piped input file is empty', '\r']
  } catch (error) {
    return [`# Error reading piped input: ${error}`, '\r']
  }
}

function expandPath(p: string): string {
  // Replace ~ with home directory
  if (p.startsWith('~')) {
    p = path.join(os.homedir(), p.slice(1))
  }
  // Expand environment variables
  p = p.replace(/\$([A-Z_][A-Z0-9_]*)/gi, (match, envVar) => {
    return process.env[envVar] || match
  })
  return path.resolve(p)
}

function checkIfPwdParentInRoots(): string[] {
  try {
    let appConfig

    // For tests, check if appConfig is available on global
    if (typeof (global as any).__testAppConfig !== 'undefined') {
      appConfig = (global as any).__testAppConfig
    } else {
      try {
        // Try to import from TypeScript first (for tests)
        const module = require('../index')
        appConfig = module.appConfig
      } catch (e) {
        try {
          // Fall back to compiled JavaScript (for runtime)
          const module = require('../index.js')
          appConfig = module.appConfig
        } catch (e2) {
          console.error('Failed to import appConfig:', e.message, e2.message)
          return ['3']
        }
      }
    }
    const roots = appConfig?.roots || []

    if (roots.length === 0) {
      return ['3'] // No for "Do you trust the files in this folder?"
    }

    const cwd = process.cwd()
    const parentDir = path.dirname(cwd)

    for (const root of roots) {
      const expandedRoot = expandPath(root)
      if (parentDir === expandedRoot) {
        // Display ASCII box warning
        console.log('')
        console.log(
          '\x1b[33m╔═════════════════════════════════════════════════════════════════╗\x1b[0m',
        )
        console.log(
          '\x1b[33m║                    🔓 TRUSTED ROOT DIRECTORY                    ║\x1b[0m',
        )
        console.log(
          '\x1b[33m╠═════════════════════════════════════════════════════════════════╣\x1b[0m',
        )
        console.log(
          '\x1b[33m║ Parent directory is in configured roots.                        ║\x1b[0m',
        )
        console.log(
          '\x1b[33m║                                                                 ║\x1b[0m',
        )
        console.log(
          '\x1b[33m║ This means:                                                     ║\x1b[0m',
        )
        console.log(
          '\x1b[33m║ • App trust prompt automatically accepted                       ║\x1b[0m',
        )
        console.log(
          '\x1b[33m║ • All confirmation prompts and warnings are skipped             ║\x1b[0m',
        )
        console.log(
          '\x1b[33m║                                                                 ║\x1b[0m',
        )
        const rootLine = `║ Root: ${expandedRoot.length > 49 ? '...' + expandedRoot.slice(-49) : expandedRoot}`
        console.log(`\x1b[33m${rootLine.padEnd(66)}║\x1b[0m`)
        const dirLine = `║ Directory: ${cwd.length > 49 ? '...' + cwd.slice(-49) : cwd}`
        console.log(`\x1b[33m${dirLine.padEnd(66)}║\x1b[0m`)
        console.log(
          '\x1b[33m╚═════════════════════════════════════════════════════════════════╝\x1b[0m',
        )
        console.log('')

        return ['1']
      }
    }

    return ['3']
  } catch (error) {
    return ['3']
  }
}

const trustPromptPattern: PatternConfig = {
  id: 'trust-folder-prompt',
  title: 'Trust folder',
  type: 'confirmation' as const,
  response: checkIfPwdParentInRoots,
  pattern: ['Claude Code may read files in this folder'],
  triggerText: 'Claude Code may read files in this folder',
}

const appStartedPattern: PatternConfig = {
  id: 'app-started',
  title: 'App started',
  type: 'confirmation' as const,
  response: getPipedInputResponse,
  pattern: ['? for shortcuts'],
  triggerText: '? for shortcuts',
}

const allPatterns: PatternConfig[] = [...confirmationPatterns]

const validationResult = validatePatternConfigs(allPatterns)
if (!validationResult.success) {
  throw new Error(
    `Invalid pattern configuration: ${JSON.stringify(validationResult.error.errors, null, 2)}`,
  )
}

export const patterns: PatternConfig[] = validationResult.data

export { confirmationPatterns, appStartedPattern, trustPromptPattern }
