import { type PatternConfig, validatePatternConfigs } from '../config/schemas'
import { execSync } from 'child_process'
import dedent from 'dedent'

function followedByCursor(str: string): string {
  return `${str}\x1b[7m \x1b[0m`
}

const backspaceKey = '\x7f'
const metaBackspaceKey = '\x1b\x7f'

function pressKeyNTimes(key: string, n: number): string[] {
  return Array(n).fill(key).flat()
}

function buildTriggerPattern(
  tag: string,
  trigger: string,
  command: string,
): PatternConfig {
  return {
    response: () => [
      metaBackspaceKey,
      backspaceKey,
      `<${tag}>\n▶ ${command}${execSync(command, {
        encoding: 'utf8',
      }).trim()}\n<\/${tag}>\n`,
    ],
    pattern: [followedByCursor(trigger.slice(0, -1))],
    type: 'completion' as const,
  }
}

const patternsArray: PatternConfig[] = [
  {
    id: 'add-tree-trigger',
    title: 'Add tree',
    ...buildTriggerPattern('ProjectTree', '~tree ', 'tree --gitignore'),
  },
  {
    id: 'add-changes-trigger',
    title: 'Add changes',
    ...buildTriggerPattern('ProjectChanges', '~changes ', 'git diff HEAD'),
  },
  {
    id: 'edit-file-prompt',
    title: 'Edit file',
    type: 'prompt' as const,
    response: '1',
    pattern: [
      'Edit file',
      '{{ editDiff | multiline }}',
      'Do you want to make this edit to {{ fileName }}?',
    ],
    triggerText: 'Edit file',
    notification: dedent(
      `
      Action: {{ title }}
      Response: {{ actionResponse }} {{ actionResponseIcon }}
      Project: {{ project }}
      File: {{ fileName }}
      `,
    ),
  },
  {
    id: 'create-file-prompt',
    title: 'Create file',
    type: 'prompt' as const,
    response: '1',
    pattern: ['Create file', 'Do you want to create {{ fileName }}?'],
    triggerText: 'Create file',
    notification: dedent(
      `
      Action: {{ title }}
      Response: {{ actionResponse }} {{ actionResponseIcon }}
      Project: {{ project }}
      File: {{ fileName }}
      `,
    ),
  },
  {
    id: 'bash-command-prompt-format-1',
    title: 'Bash command',
    type: 'prompt' as const,
    response: '1',
    pattern: [
      'Bash command',
      '{{ body | multiline }}',
      'Do you want to proceed',
      '1. Yes',
      '{{ footer | multiline }}',
      '3. No',
    ],
    triggerText: 'Bash command',
    notification: dedent(
      `
      TEMP
      Action: {{ title }} (a)
      Response: {{ actionResponse }} {{ actionResponseIcon }}
      Project: {{ project }}
      Test: {{ test }}
      `,
      // `
      // Action: {{ title }} (a)
      // Response: {{ actionResponse }} {{ actionResponseIcon }}
      // Project: {{ project }}
      // Command: {{ command }}
      // Reason: {{ reason }}
      // Directory: {{ directory }}
      // `,
    ),
    transformExtractedData: data => ({ ...data, test: 'TEST' }),
    // transformExtractedData: data => data,
  },
  {
    id: 'bash-command-prompt-format-2',
    title: 'Bash command',
    type: 'prompt' as const,
    response: '1',
    pattern: [
      'Bash command',
      '{{ body | multiline }}',
      'Do you want to proceed',
      '2. No',
    ],
    triggerText: 'Bash command',
    notification: dedent(
      `
      TEMP
      Action: {{ title }} (b)
      Response: {{ actionResponse }} {{ actionResponseIcon }}
      Project: {{ project }}
      Test: {{ test }}
      `,
      // `
      // Action: {{ title }} (b)
      // Response: {{ actionResponse }} {{ actionResponseIcon }}
      // Project: {{ project }}
      // Command: {{ command }}
      // `,
    ),
    transformExtractedData: data => ({ ...data, test: 'TEST' }),
    // transformExtractedData: data => data,
  },
  {
    id: 'read-files-prompt',
    title: 'Read file',
    type: 'prompt' as const,
    response: '1',
    pattern: ['Read files', 'Read({{ fileName }})', '1. Yes'],
    triggerText: 'Read files',
    notification: dedent(
      `
      Action: {{ title }}
      Response: {{ actionResponse }} {{ actionResponseIcon }}
      Project: {{ project }}
      File: {{ fileName }}
      `,
    ),
  },
  {
    id: 'fetch-content-prompt',
    title: 'Fetch content',
    type: 'prompt' as const,
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
      Action: {{ title }}
      Response: {{ actionResponse }} {{ actionResponseIcon }}
      Project: {{ project }}
      Domain: {{ domain }}
      URL: {{ url }}
      `,
    ),
  },
]

const validationResult = validatePatternConfigs(patternsArray)
if (!validationResult.success) {
  throw new Error(
    `Invalid pattern configuration: ${JSON.stringify(validationResult.error.errors, null, 2)}`,
  )
}

export const patterns: PatternConfig[] = validationResult.data
