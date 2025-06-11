import { Command } from 'commander'
import type { ParsedOptions } from '../types/preflight.js'

export function createClaudeComposerCommand(): Command {
  const program = new Command()
  program
    .name('claude-composer')
    .description(
      'A wrapper that enhances the Claude Code CLI\n\nSubcommands:\n  cc-init                  Initialize a new configuration file',
    )
    .option(
      '--toolset <name...>',
      'Use predefined toolsets from ~/.claude-composer/toolsets/ directory or specify an absolute path (can be specified multiple times)',
    )
    .option('--yolo', 'Accept all prompts automatically (use with caution)')
    .option(
      '--ignore-global-config',
      'Ignore configuration from ~/.claude-composer/config.yaml',
    )
    .option('--quiet', 'Suppress preflight messages')
    .option('--mode <mode>', 'Start mode (act or plan)')
    .option(
      '--allow-buffer-snapshots',
      'Enable Ctrl+Shift+S to save terminal buffer snapshots to ~/.claude-composer/logs/',
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
    .option(
      '--dangerously-suppress-yolo-confirmation',
      'Suppress the confirmation prompt when yolo mode is enabled',
    )
    .option(
      '--no-dangerously-suppress-yolo-confirmation',
      'Show the confirmation prompt when yolo mode is enabled',
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
  const hasPrintOption = argv.some(
    arg => arg === '--print' || arg.startsWith('--print='),
  )

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

  return knownOptions
}
