import { Command } from 'commander'
import type { ParsedOptions } from '../types/preflight.js'

export function createClaudeComposerCommand(): Command {
  const program = new Command()
  program
    .name('claude-composer')
    .description('A wrapper that enhances the Claude Code CLI')
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
      '--dangerously-dismiss-edit-file-prompts',
      'Automatically dismiss edit file prompts',
    )
    .option(
      '--no-dangerously-dismiss-edit-file-prompts',
      'Do not automatically dismiss edit file prompts',
    )
    .option(
      '--dangerously-dismiss-create-file-prompts',
      'Automatically dismiss create file prompts',
    )
    .option(
      '--no-dangerously-dismiss-create-file-prompts',
      'Do not automatically dismiss create file prompts',
    )
    .option(
      '--dangerously-dismiss-bash-command-prompts',
      'Automatically dismiss bash command prompts',
    )
    .option(
      '--no-dangerously-dismiss-bash-command-prompts',
      'Do not automatically dismiss bash command prompts',
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
      '--toolset <name...>',
      'Use predefined toolsets from ~/.claude-composer/toolsets/ directory (can be specified multiple times)',
    )
    .option(
      '--ignore-global-config',
      'Ignore configuration from ~/.claude-composer/config.yaml',
    )
    .option(
      '--no-default-toolsets',
      'Ignore default toolsets from the main config file',
    )
    .option('--go-off', 'Go off. YOLO. What could go wrong?')
    .option(
      '--log-all-pattern-matches',
      'Log all pattern matches to ~/.claude-composer/logs/pattern-matches-<pattern.id>.jsonl',
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
    .option('--quiet', 'Suppress preflight messages')
    .option(
      '--safe',
      'Bypass all claude-composer functionality and shell out directly to claude',
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
    } catch (err: any) {
      if (err.exitCode === 0) {
        // Help was displayed, we'll handle this in the caller
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
  knownOptions.add('--no-dangerously-dismiss-edit-file-prompts')
  knownOptions.add('--no-dangerously-dismiss-create-file-prompts')
  knownOptions.add('--no-dangerously-dismiss-bash-command-prompts')
  knownOptions.add('--no-dangerously-allow-in-dirty-directory')
  knownOptions.add('--no-dangerously-allow-without-version-control')
  knownOptions.add('--toolset')
  knownOptions.add('--no-default-toolsets')
  knownOptions.add('--log-all-pattern-matches')
  knownOptions.add('--allow-buffer-snapshots')
  knownOptions.add('--allow-adding-project-tree')
  knownOptions.add('--allow-adding-project-changes')
  knownOptions.add('--quiet')
  knownOptions.add('--safe')

  return knownOptions
}
