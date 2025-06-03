import { Command } from 'commander'
import type { ParsedOptions } from '../types/preflight.js'

export function createClaudeComposerCommand(): Command {
  const program = new Command()
  program
    .name('claude-composer')
    .description('A wrapper that enhances the Claude Code CLI')
    .option(
      '--toolset <name...>',
      'Use predefined toolsets from ~/.claude-composer/toolsets/ directory (can be specified multiple times)',
    )
    .option(
      '--ruleset <name...>',
      'Use predefined rulesets from ~/.claude-composer/rulesets/ directory (can be specified multiple times)',
    )
    .option(
      '--ignore-global-config',
      'Ignore configuration from ~/.claude-composer/config.yaml',
    )
    .option(
      '--no-default-toolsets',
      'Ignore default toolsets from the main config file',
    )
    .option(
      '--no-default-rulesets',
      'Ignore default rulesets from the main config file',
    )
    .option('--quiet', 'Suppress preflight messages')
    .option(
      '--safe',
      'Bypass all claude-composer functionality and shell out directly to claude',
    )
    .option(
      '--allow-buffer-snapshots',
      'Enable Ctrl+Shift+S to save terminal buffer snapshots to ~/.claude-composer/logs/',
    )
    .option(
      '--allow-adding-project-tree',
      'Enable the add-tree-trigger pattern for project tree display',
    )
    .option(
      '--allow-adding-project-changes',
      'Enable the add-changes-trigger pattern for git diff display',
    )
    .option(
      '--log-all-pattern-matches',
      'Log all pattern matches to ~/.claude-composer/logs/pattern-matches-<pattern.id>.jsonl',
    )
    .option(
      '--dangerously-allow-in-dirty-directory',
      'Allow running in a directory with uncommitted git changes',
    )
    .option(
      '--no-dangerously-allow-in-dirty-directory',
      'Do not allow running in a directory with uncommitted git changes',
    )
    .option(
      '--dangerously-allow-without-version-control',
      'Allow running in a directory not under version control',
    )
    .option(
      '--no-dangerously-allow-without-version-control',
      'Do not allow running in a directory not under version control',
    )
    // Notification options (moved to end)
    .option(
      '--show-notifications',
      'Show desktop notifications for file edits, creates, and prompts',
    )
    .option('--no-show-notifications', 'Disable notifications')
    .option(
      '--sticky-notifications',
      'Enable notifications that stay on screen until manually dismissed (also enables --show-notifications)',
    )
    .option(
      '--no-sticky-notifications',
      'Make notifications auto-dismiss after timeout (default)',
    )
    .option(
      '--notify-work-started',
      'Show notification when Claude Composer starts working',
    )
    .option(
      '--no-notify-work-started',
      'Disable work started notifications (default)',
    )
    .option(
      '--notify-work-complete',
      'Show notification when Claude Composer is done working (default)',
    )
    .option('--no-notify-work-complete', 'Disable work complete notifications')
    // New notification settings
    .option(
      '--show-confirm-notify',
      'Show notifications for file operations (default)',
    )
    .option('--no-show-confirm-notify', 'Hide all file operation notifications')
    .option(
      '--show-accepted-confirm-notify',
      'Show notifications for auto-accepted actions',
    )
    .option(
      '--no-show-accepted-confirm-notify',
      'Hide auto-accepted notifications (default)',
    )
    .option(
      '--show-prompted-confirm-notify',
      'Show notifications when prompted (default)',
    )
    .option('--no-show-prompted-confirm-notify', 'Hide prompted notifications')
    // New work notification settings
    .option(
      '--show-work-started-notifications',
      'Show work started notification',
    )
    .option(
      '--no-show-work-started-notifications',
      'Hide work started notification (default)',
    )
    .option(
      '--show-work-complete-notifications',
      'Show work complete notification (default)',
    )
    .option(
      '--no-show-work-complete-notifications',
      'Hide work complete notification',
    )
    .option(
      '--show-work-complete-record-notifications',
      'Show record-breaking notification (default)',
    )
    .option(
      '--no-show-work-complete-record-notifications',
      'Hide record-breaking notification',
    )
    // Per-confirmation type flags
    .option(
      '--show-edit-file-confirm-notify',
      'Show notifications for file edits',
    )
    .option(
      '--no-show-edit-file-confirm-notify',
      'Hide notifications for file edits',
    )
    .option(
      '--show-create-file-confirm-notify',
      'Show notifications for file creates',
    )
    .option(
      '--no-show-create-file-confirm-notify',
      'Hide notifications for file creates',
    )
    .option(
      '--show-bash-command-confirm-notify',
      'Show notifications for bash commands',
    )
    .option(
      '--no-show-bash-command-confirm-notify',
      'Hide notifications for bash commands',
    )
    .option(
      '--show-read-file-confirm-notify',
      'Show notifications for file reads',
    )
    .option(
      '--no-show-read-file-confirm-notify',
      'Hide notifications for file reads',
    )
    .option(
      '--show-fetch-content-confirm-notify',
      'Show notifications for content fetches',
    )
    .option(
      '--no-show-fetch-content-confirm-notify',
      'Hide notifications for content fetches',
    )
    // Remote notification settings
    .option(
      '--send-remote-notifications',
      'Send notifications to Discord/WhatsApp (requires ~/.claude-composer/remote-notifications.yaml)',
    )
    .option(
      '--no-send-remote-notifications',
      'Disable remote notifications (default)',
    )
    // Per-type stickiness flags
    .option(
      '--sticky-work-started-notifications',
      'Make work started notifications sticky',
    )
    .option(
      '--no-sticky-work-started-notifications',
      'Make work started notifications auto-dismiss',
    )
    .option(
      '--sticky-work-complete-notifications',
      'Make work complete notifications sticky',
    )
    .option(
      '--no-sticky-work-complete-notifications',
      'Make work complete notifications auto-dismiss',
    )
    .option(
      '--sticky-work-complete-record-notifications',
      'Make record-breaking notifications sticky',
    )
    .option(
      '--no-sticky-work-complete-record-notifications',
      'Make record-breaking notifications auto-dismiss',
    )
    .option(
      '--sticky-prompted-confirm-notify',
      'Make prompted confirmation notifications sticky',
    )
    .option(
      '--no-sticky-prompted-confirm-notify',
      'Make prompted confirmation notifications auto-dismiss',
    )
    .option(
      '--sticky-accepted-confirm-notify',
      'Make accepted confirmation notifications sticky',
    )
    .option(
      '--no-sticky-accepted-confirm-notify',
      'Make accepted confirmation notifications auto-dismiss',
    )
    .option(
      '--sticky-terminal-snapshot-notifications',
      'Make terminal snapshot notifications sticky',
    )
    .option(
      '--no-sticky-terminal-snapshot-notifications',
      'Make terminal snapshot notifications auto-dismiss',
    )
    .allowUnknownOption()
    .argument('[args...]', 'Arguments to pass to `claude`')

  return program
}

export function parseCommandLineArgs(argv: string[]): {
  program: Command
  options: ParsedOptions
  args: string[]
  helpRequested: boolean
  versionRequested: boolean
  hasPrintOption: boolean
} {
  const helpRequested = argv.includes('--help') || argv.includes('-h')
  const versionRequested = argv.includes('--version') || argv.includes('-v')
  const hasPrintOption = argv.includes('--print')

  const program = createClaudeComposerCommand()

  if (helpRequested || versionRequested) {
    program.exitOverride()
    try {
      program.parse(argv)
    } catch (err) {
      if (err.exitCode === 0) {
        return {
          program,
          options: {},
          args: [],
          helpRequested: true,
          versionRequested: false,
          hasPrintOption,
        }
      }
      throw err
    }
  } else {
    program.parse(argv)
  }

  const options = program.opts() as ParsedOptions
  const args = program.args

  return {
    program,
    options,
    args,
    helpRequested,
    versionRequested,
    hasPrintOption,
  }
}

export function buildKnownOptionsSet(program: Command): Set<string> {
  const knownOptions = new Set<string>()

  program.options.forEach(option => {
    if (option.long) knownOptions.add(option.long)
  })

  knownOptions.add('--no-show-notifications')
  knownOptions.add('--sticky-notifications')
  knownOptions.add('--no-sticky-notifications')
  knownOptions.add('--notify-work-started')
  knownOptions.add('--no-notify-work-started')
  knownOptions.add('--notify-work-complete')
  knownOptions.add('--no-notify-work-complete')
  // New notification settings
  knownOptions.add('--show-confirm-notify')
  knownOptions.add('--no-show-confirm-notify')
  knownOptions.add('--show-accepted-confirm-notify')
  knownOptions.add('--no-show-accepted-confirm-notify')
  knownOptions.add('--show-prompted-confirm-notify')
  knownOptions.add('--no-show-prompted-confirm-notify')
  // New work notification settings
  knownOptions.add('--show-work-started-notifications')
  knownOptions.add('--no-show-work-started-notifications')
  knownOptions.add('--show-work-complete-notifications')
  knownOptions.add('--no-show-work-complete-notifications')
  knownOptions.add('--show-work-complete-record-notifications')
  knownOptions.add('--no-show-work-complete-record-notifications')
  // Per-confirmation type flags
  knownOptions.add('--show-edit-file-confirm-notify')
  knownOptions.add('--no-show-edit-file-confirm-notify')
  knownOptions.add('--show-create-file-confirm-notify')
  knownOptions.add('--no-show-create-file-confirm-notify')
  knownOptions.add('--show-bash-command-confirm-notify')
  knownOptions.add('--no-show-bash-command-confirm-notify')
  knownOptions.add('--show-read-file-confirm-notify')
  knownOptions.add('--no-show-read-file-confirm-notify')
  knownOptions.add('--show-fetch-content-confirm-notify')
  knownOptions.add('--no-show-fetch-content-confirm-notify')
  // Remote notification settings
  knownOptions.add('--send-remote-notifications')
  knownOptions.add('--no-send-remote-notifications')
  // Per-type stickiness flags
  knownOptions.add('--sticky-work-started-notifications')
  knownOptions.add('--no-sticky-work-started-notifications')
  knownOptions.add('--sticky-work-complete-notifications')
  knownOptions.add('--no-sticky-work-complete-notifications')
  knownOptions.add('--sticky-work-complete-record-notifications')
  knownOptions.add('--no-sticky-work-complete-record-notifications')
  knownOptions.add('--sticky-prompted-confirm-notify')
  knownOptions.add('--no-sticky-prompted-confirm-notify')
  knownOptions.add('--sticky-accepted-confirm-notify')
  knownOptions.add('--no-sticky-accepted-confirm-notify')
  knownOptions.add('--sticky-terminal-snapshot-notifications')
  knownOptions.add('--no-sticky-terminal-snapshot-notifications')
  knownOptions.add('--dangerously-allow-in-dirty-directory')
  knownOptions.add('--no-dangerously-allow-in-dirty-directory')
  knownOptions.add('--dangerously-allow-without-version-control')
  knownOptions.add('--no-dangerously-allow-without-version-control')
  knownOptions.add('--toolset')
  knownOptions.add('--no-default-toolsets')
  knownOptions.add('--ruleset')
  knownOptions.add('--no-default-rulesets')
  knownOptions.add('--log-all-pattern-matches')
  knownOptions.add('--allow-buffer-snapshots')
  knownOptions.add('--allow-adding-project-tree')
  knownOptions.add('--allow-adding-project-changes')
  knownOptions.add('--quiet')
  knownOptions.add('--safe')

  return knownOptions
}
