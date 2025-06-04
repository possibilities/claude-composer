export function isPipedInput(): boolean {
  return !process.stdin.isTTY
}

export function exitWithPipedInputError(context: string): never {
  console.error(
    '\x1b[31m╔═════════════════════════════════════════════════════════════════╗\x1b[0m',
  )
  console.error(
    '\x1b[31m║                    PIPED INPUT NOT SUPPORTED                    ║\x1b[0m',
  )
  console.error(
    '\x1b[31m╠═════════════════════════════════════════════════════════════════╣\x1b[0m',
  )
  console.error(
    '\x1b[31m║ Claude Composer detected piped input but needs to show a        ║\x1b[0m',
  )
  console.error(
    '\x1b[31m║ confirmation prompt. This combination is not supported.         ║\x1b[0m',
  )
  console.error(
    '\x1b[31m║                                                                 ║\x1b[0m',
  )
  console.error(`\x1b[31m║ Context: ${context.padEnd(55)}║\x1b[0m`)
  console.error(
    '\x1b[31m║                                                                 ║\x1b[0m',
  )
  console.error(
    '\x1b[31m║ To bypass this prompt, you can:                                 ║\x1b[0m',
  )
  console.error(
    '\x1b[31m║                                                                 ║\x1b[0m',
  )

  if (context.includes('version control')) {
    console.error(
      '\x1b[31m║ • Use --dangerously-allow-without-version-control flag          ║\x1b[0m',
    )
    console.error(
      '\x1b[31m║ • Set dangerously_allow_without_version_control: true in        ║\x1b[0m',
    )
    console.error(
      '\x1b[31m║   your configuration file                                       ║\x1b[0m',
    )
  } else if (
    context.includes('dirty directory') ||
    context.includes('uncommitted changes')
  ) {
    console.error(
      '\x1b[31m║ • Use --dangerously-allow-in-dirty-directory flag               ║\x1b[0m',
    )
    console.error(
      '\x1b[31m║ • Set dangerously_allow_in_dirty_directory: true in             ║\x1b[0m',
    )
    console.error(
      '\x1b[31m║   your configuration file                                       ║\x1b[0m',
    )
  } else if (context.includes('automatic acceptance')) {
    console.error(
      '\x1b[31m║ • Use --dangerously-suppress-automatic-acceptance-confirmation  ║\x1b[0m',
    )
    console.error(
      '\x1b[31m║   flag                                                          ║\x1b[0m',
    )
    console.error(
      '\x1b[31m║ • Set dangerously_suppress_automatic_acceptance_confirmation:   ║\x1b[0m',
    )
    console.error(
      '\x1b[31m║   true in your configuration file                               ║\x1b[0m',
    )
  }

  console.error(
    '\x1b[31m║                                                                 ║\x1b[0m',
  )
  console.error(
    '\x1b[31m║ Alternative: Run Claude Composer interactively without piping   ║\x1b[0m',
  )
  console.error(
    '\x1b[31m║ input to avoid this issue.                                      ║\x1b[0m',
  )
  console.error(
    '\x1b[31m╠═════════════════════════════════════════════════════════════════╣\x1b[0m',
  )
  console.error(
    '\x1b[31m║ Developer Note: If you can fix the interaction between piped    ║\x1b[0m',
  )
  console.error(
    '\x1b[31m║ input and confirmation prompts, you will earn my infinite       ║\x1b[0m',
  )
  console.error(
    '\x1b[31m║ praise and respect! This is a challenging problem that has      ║\x1b[0m',
  )
  console.error(
    '\x1b[31m║ resisted multiple attempts at a solution.                       ║\x1b[0m',
  )
  console.error(
    '\x1b[31m╚═════════════════════════════════════════════════════════════════╝\x1b[0m',
  )

  process.exit(1)
}
