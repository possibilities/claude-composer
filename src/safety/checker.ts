import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import type {
  AppConfig,
  PreflightOptions,
  ParsedOptions,
} from '../types/preflight.js'
import type { RulesetConfig } from '../config/schemas.js'
import { hasActiveAcceptanceRules } from '../config/rulesets.js'
import { askYesNo } from '../cli/prompts.js'
import { log, warn } from '../utils/logging.js'

export function checkGitInstalled(): void {
  try {
    execSync('git --version', { stdio: 'ignore' })
  } catch (error) {
    throw new Error(
      'Git is not installed or not in PATH. Please install git to use this tool',
    )
  }
}

export function checkChildAppPath(childAppPath: string): void {
  if (!fs.existsSync(childAppPath)) {
    throw new Error(
      `Claude CLI not found at: ${childAppPath}\n` +
        'Please install Claude CLI or set CLAUDE_APP_PATH environment variable',
    )
  }

  try {
    fs.accessSync(childAppPath, fs.constants.X_OK)
  } catch (error) {
    throw new Error(
      `Claude CLI is not executable: ${childAppPath}\n` +
        'Please check file permissions',
    )
  }
}

export async function checkVersionControl(
  cwd: string,
  allowWithoutVersionControl: boolean,
  options?: PreflightOptions,
): Promise<boolean> {
  const gitDir = path.join(cwd, '.git')

  if (!fs.existsSync(gitDir)) {
    if (!allowWithoutVersionControl) {
      warn('※ Running in project without version control')
      const proceed = await askYesNo(
        '※ Do you want to continue?',
        true,
        options?.stdin,
        options?.stdout,
      )
      if (!proceed) {
        throw new Error('Version control is required')
      }
    }
    return false
  }

  return true
}

export async function checkDirtyDirectory(
  cwd: string,
  allowInDirtyDirectory: boolean,
  options?: PreflightOptions,
): Promise<boolean> {
  try {
    const gitStatus = execSync('git status --porcelain', {
      encoding: 'utf8',
      cwd,
    }).trim()

    if (gitStatus !== '') {
      if (!allowInDirtyDirectory) {
        warn('※ Running in directory with uncommitted changes')
        const proceed = await askYesNo(
          '※ Do you want to continue?',
          true,
          options?.stdin,
          options?.stdout,
        )
        if (!proceed) {
          throw new Error('Clean working directory required')
        }
      }
      return true
    }

    return false
  } catch (error) {
    warn('※ Could not check git status')
    return false
  }
}

export async function handleAutomaticAcceptanceWarning(
  appConfig: AppConfig,
  mergedRuleset: RulesetConfig | undefined,
  preflightOptions?: PreflightOptions,
): Promise<boolean> {
  // If --safe flag is used, skip warning
  if (appConfig.safe) {
    return true
  }

  // Only show warning if there are active acceptance rules
  if (!hasActiveAcceptanceRules(mergedRuleset)) {
    return true
  }

  if (process.env.NODE_ENV?.includes('test')) {
    console.log(
      '\x1b[33m╔════════════════════════════════════════════════════════════════╗\x1b[0m',
    )
    console.log(
      '\x1b[33m║             ⚠️  AUTOMATIC ACCEPTANCE ENABLED ⚠️                ║\x1b[0m',
    )
    console.log(
      '\x1b[33m║ (Skipping interactive prompt in test mode)                     ║\x1b[0m',
    )
    console.log(
      '\x1b[33m╚════════════════════════════════════════════════════════════════╝\x1b[0m',
    )
    return true
  }

  console.log(
    '\x1b[33m╔═════════════════════════════════════════════════════════════════╗\x1b[0m',
  )
  console.log(
    '\x1b[33m║             ⚠️  AUTOMATIC ACCEPTANCE ENABLED ⚠️                 ║\x1b[0m',
  )
  console.log(
    '\x1b[33m╠═════════════════════════════════════════════════════════════════╣\x1b[0m',
  )
  console.log(
    '\x1b[33m║ Rulesets are configured to automatically accept prompts for:    ║\x1b[0m',
  )
  console.log(
    '\x1b[33m║                                                                 ║\x1b[0m',
  )
  console.log(
    '\x1b[33m║ • File edits and creation                                       ║\x1b[0m',
  )
  console.log(
    '\x1b[33m║ • Bash command execution                                        ║\x1b[0m',
  )
  console.log(
    '\x1b[33m║ • File reading operations                                       ║\x1b[0m',
  )
  console.log(
    '\x1b[33m║ • Content fetching from URLs                                    ║\x1b[0m',
  )
  console.log(
    '\x1b[33m║                                                                 ║\x1b[0m',
  )
  console.log(
    '\x1b[33m║ Claude will perform actions based on your ruleset configuration ║\x1b[0m',
  )
  console.log(
    '\x1b[33m║ WITHOUT asking for confirmation!                                ║\x1b[0m',
  )
  console.log(
    '\x1b[33m║                                                                 ║\x1b[0m',
  )
  console.log(
    '\x1b[33m║ Use --safe to disable all automatic acceptance                  ║\x1b[0m',
  )
  console.log(
    '\x1b[33m╚═════════════════════════════════════════════════════════════════╝\x1b[0m',
  )

  const proceed = await askYesNo(
    'Do you want to continue with automatic acceptance enabled?',
    true,
    preflightOptions?.stdin,
    preflightOptions?.stdout,
  )

  if (!proceed) {
    log('※ Wise choice. Exiting safely.')
    return false
  }

  warn('※ Continuing with automatic acceptance enabled!')
  return true
}
