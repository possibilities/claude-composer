import { type PatternConfig, validatePatternConfigs } from '../config/schemas'
import { execSync } from 'child_process'
import { stripBoxChars } from '../utils/strip-box-chars'
import dedent from 'dedent'

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

const allPatterns: PatternConfig[] = [...confirmationPatterns]

const validationResult = validatePatternConfigs(allPatterns)
if (!validationResult.success) {
  throw new Error(
    `Invalid pattern configuration: ${JSON.stringify(validationResult.error.errors, null, 2)}`,
  )
}

export const patterns: PatternConfig[] = validationResult.data

export { confirmationPatterns }
