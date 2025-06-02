import * as fs from 'fs'
import * as path from 'path'
import { execSync } from 'child_process'
import type {
  AppConfig,
  PreflightOptions,
  ParsedOptions,
} from '../types/preflight.js'
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

export async function handleGoOffMode(
  options: ParsedOptions,
  preflightOptions?: PreflightOptions,
): Promise<boolean> {
  if (!options.goOff) {
    return false
  }

  if (
    options.dangerouslyDismissEditFilePrompts !== undefined ||
    options.dangerouslyDismissCreateFilePrompts !== undefined ||
    options.dangerouslyDismissBashCommandPrompts !== undefined
  ) {
    throw new Error(
      'Cannot use --go-off with individual dangerous prompt flags\n' +
        'The go-off flag already sets all dangerous prompt dismissals',
    )
  }

  console.log(
    '\x1b[31m╔════════════════════════════════════════════════════════════════╗\x1b[0m',
  )
  console.log(
    '\x1b[31m║                       🚨 DANGER ZONE 🚨                        ║\x1b[0m',
  )
  console.log(
    '\x1b[31m╠════════════════════════════════════════════════════════════════╣\x1b[0m',
  )
  console.log(
    '\x1b[31m║ You have enabled --go-off                                      ║\x1b[0m',
  )
  console.log(
    '\x1b[31m║                                                                ║\x1b[0m',
  )
  console.log(
    '\x1b[31m║ This will:                                                     ║\x1b[0m',
  )
  console.log(
    '\x1b[31m║ • Automatically dismiss ALL file edit prompts                  ║\x1b[0m',
  )
  console.log(
    '\x1b[31m║ • Automatically dismiss ALL file creation prompts              ║\x1b[0m',
  )
  console.log(
    '\x1b[31m║ • Automatically dismiss ALL bash command prompts               ║\x1b[0m',
  )
  console.log(
    '\x1b[31m║                                                                ║\x1b[0m',
  )
  console.log(
    '\x1b[31m║ Claude will have FULL CONTROL to modify files and run commands ║\x1b[0m',
  )
  console.log(
    '\x1b[31m║ without ANY confirmation!                                      ║\x1b[0m',
  )
  console.log(
    '\x1b[31m║                                                                ║\x1b[0m',
  )
  console.log(
    '\x1b[31m║    This is EXTREMELY DANGEROUS and should only be used when    ║\x1b[0m',
  )
  console.log(
    '\x1b[31m║    you fully trust the AI and understand the risks!            ║\x1b[0m',
  )
  console.log(
    '\x1b[31m╚════════════════════════════════════════════════════════════════╝\x1b[0m',
  )

  const proceed = await askYesNo(
    'Are you ABSOLUTELY SURE you want to continue?',
    true,
    preflightOptions?.stdin,
    preflightOptions?.stdout,
  )

  if (!proceed) {
    log('※ Good choice. Exiting safely.')
    return false
  }

  warn('※ Go-off mode activated - All safety prompts disabled!')
  return true
}

export async function handleDangerFlagsWarning(
  appConfig: AppConfig,
  preflightOptions?: PreflightOptions,
): Promise<boolean> {
  const hasDangerFlags =
    appConfig.dangerously_dismiss_edit_file_prompts ||
    appConfig.dangerously_dismiss_create_file_prompts ||
    appConfig.dangerously_dismiss_bash_command_prompts

  if (!hasDangerFlags) {
    return true
  }

  if (process.env.NODE_ENV?.includes('test')) {
    console.log(
      '\x1b[33m╔════════════════════════════════════════════════════════════════╗\x1b[0m',
    )
    console.log(
      '\x1b[33m║                      ⚠️  DANGER FLAGS SET ⚠️                   ║\x1b[0m',
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
    '\x1b[33m║                   ⚠️  DANGER FLAGS SET ⚠️                         ║\x1b[0m',
  )
  console.log(
    '\x1b[33m╠═════════════════════════════════════════════════════════════════╣\x1b[0m',
  )
  console.log(
    '\x1b[33m║ You have enabled dangerous flags that will dismiss prompts:     ║\x1b[0m',
  )
  console.log(
    '\x1b[33m║                                                                 ║\x1b[0m',
  )

  if (appConfig.dangerously_dismiss_edit_file_prompts) {
    console.log(
      '\x1b[33m║ • File edit prompts will be AUTO-DISMISSED                      ║\x1b[0m',
    )
  }
  if (appConfig.dangerously_dismiss_create_file_prompts) {
    console.log(
      '\x1b[33m║ • File creation prompts will be AUTO-DISMISSED                  ║\x1b[0m',
    )
  }
  if (appConfig.dangerously_dismiss_bash_command_prompts) {
    console.log(
      '\x1b[33m║ • Bash command prompts will be AUTO-DISMISSED                   ║\x1b[0m',
    )
  }

  console.log(
    '\x1b[33m║                                                                 ║\x1b[0m',
  )
  console.log(
    '\x1b[33m║ Claude will modify files and run commands WITHOUT confirmation! ║\x1b[0m',
  )
  console.log(
    '\x1b[33m║                                                                 ║\x1b[0m',
  )
  console.log(
    '\x1b[33m║ Consider using --go-off instead for the full go-off experience  ║\x1b[0m',
  )
  console.log(
    '\x1b[33m║ if you want to dismiss ALL safety prompts at once.              ║\x1b[0m',
  )
  console.log(
    '\x1b[33m╚═════════════════════════════════════════════════════════════════╝\x1b[0m',
  )

  const proceed = await askYesNo(
    'Do you want to continue with these dangerous settings?',
    true,
    preflightOptions?.stdin,
    preflightOptions?.stdout,
  )

  if (!proceed) {
    log('※ Wise choice. Exiting safely.')
    return false
  }

  warn('※ Continuing with dangerous flag settings active!')
  return true
}

export function displayDangerousWarnings(appConfig: AppConfig): void {
  if (appConfig.dangerously_dismiss_edit_file_prompts) {
    warn('⚠️  WARNING: --dangerously-dismiss-edit-file-prompts is enabled')
    warn('   All file edit prompts will be automatically dismissed!')
  }
  if (appConfig.dangerously_dismiss_create_file_prompts) {
    warn('⚠️  WARNING: --dangerously-dismiss-create-file-prompts is enabled')
    warn('   All file creation prompts will be automatically dismissed!')
  }
  if (appConfig.dangerously_dismiss_bash_command_prompts) {
    warn('⚠️  WARNING: --dangerously-dismiss-bash-command-prompts is enabled')
    warn('   All bash command prompts will be automatically dismissed!')
  }
}
