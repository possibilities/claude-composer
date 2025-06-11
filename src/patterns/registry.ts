import {
  type PatternConfig,
  type AppConfig,
  validatePatternConfigs,
} from '../config/schemas'
import { execSync } from 'child_process'
import { stripBoxChars } from '../utils/strip-box-chars'
import dedent from 'dedent'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { expandPath } from '../utils/file-utils'

type ExtractedData = {
  body?: string
  [key: string]: any
}

function extractCommandAndReasonFromPromptBody(
  data: ExtractedData,
): ExtractedData {
  if (data.body) {
    const stripped = stripBoxChars(data.body)
    const lines = stripped
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(line => line.length > 0)

    const contentLines = lines
      .map(line => {
        return line.replace(/[│║]/g, '').trim()
      })
      .filter(line => line.length > 0)

    if (contentLines.length >= 2) {
      let commandLines: string[] = []
      let reasonIndex = -1

      for (let i = 0; i < contentLines.length; i++) {
        const line = contentLines[i]
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
        commandLines = contentLines.slice(0, reasonIndex)
        const reasonLines = contentLines.slice(reasonIndex)

        const command = commandLines.join(' ').replace(/\s+/g, ' ').trim()
        const reason = reasonLines.join(' ').replace(/\s+/g, ' ').trim()

        return { ...data, command, reason }
      } else {
        if (contentLines.length > 1) {
          commandLines = contentLines.slice(0, -1)
          const command = commandLines.join(' ').replace(/\s+/g, ' ').trim()
          const reason = contentLines[contentLines.length - 1]
          return { ...data, command, reason }
        } else {
          const command = contentLines[0]
          return { ...data, command, reason: '' }
        }
      }
    } else if (contentLines.length === 1) {
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

export function createAppReadyPattern(
  getAppConfig: () => { positionalArgContentPath?: string; mode?: string },
): PatternConfig {
  const getAppReadyResponse = (): string[] | undefined => {
    const config = getAppConfig()
    const positionalArgContentPath = config.positionalArgContentPath

    // If plan mode is enabled, send SHIFT+TAB twice first
    if (config.mode === 'plan') {
      if (positionalArgContentPath && fs.existsSync(positionalArgContentPath)) {
        try {
          const content = fs
            .readFileSync(positionalArgContentPath, 'utf8')
            .trimEnd()
          return content
            ? ['\x1b[Z', 100, '\x1b[Z', 100, content, 500, '\r']
            : ['\x1b[Z', 100, '\x1b[Z']
        } catch (error) {}
      }
      // Even without positional arg content, send SHIFT+TAB in plan mode
      return ['\x1b[Z', 100, '\x1b[Z']
    }

    // Normal positional arg injection mode (no plan mode)
    if (!positionalArgContentPath || !fs.existsSync(positionalArgContentPath)) {
      return
    }

    try {
      const content = fs
        .readFileSync(positionalArgContentPath, 'utf8')
        .trimEnd()
      return content ? [content, 500, '\r'] : undefined
    } catch (error) {}
  }

  return {
    id: 'app-ready-handler',
    title: 'App ready handler',
    response: getAppReadyResponse,
    pattern: ['? for shortcuts'],
    triggerText: '? for shortcuts',
  }
}

export function createTrustPromptPattern(
  getAppConfig: () => AppConfig | undefined,
): PatternConfig {
  const trustPromptIfPwdParentInRoots = (): string[] | undefined => {
    try {
      const appConfig = getAppConfig()

      // If dangerously_allow_in_untrusted_root is set, always accept
      if (appConfig?.dangerously_allow_in_untrusted_root) {
        return ['1']
      }

      const roots = appConfig?.roots || []

      if (roots.length === 0) {
        return
      }

      const cwd = process.cwd()
      const parentDir = path.dirname(cwd)

      for (const root of roots) {
        const expandedRoot = expandPath(root)
        if (parentDir === expandedRoot) {
          return ['1']
        }
      }
    } catch (error) {}
  }

  return {
    id: 'allow-trusted-root',
    title: 'Allow trusted root',
    response: trustPromptIfPwdParentInRoots,
    pattern: ['Do you trust the files in this folder?'],
    triggerText: 'Do you trust the files in this folder?',
  }
}

const allPatterns: PatternConfig[] = [...confirmationPatterns]

const validationResult = validatePatternConfigs(allPatterns)
if (!validationResult.success) {
  throw new Error(
    `Invalid pattern configuration: ${JSON.stringify(validationResult.error.errors, null, 2)}`,
  )
}

export const patterns: PatternConfig[] = validationResult.data

export { confirmationPatterns }
