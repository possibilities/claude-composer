export interface SubcommandDetectionResult {
  isSubcommand: boolean
  subcommand?: string
}

/**
 * Detects if the given arguments represent a subcommand pattern.
 * A subcommand is identified when the first non-option argument is:
 * - A single word (no spaces)
 * - Not starting with a dash (not an option)
 *
 * @param args - Array of command line arguments (without the node and script path)
 * @returns Detection result with isSubcommand flag and the subcommand if detected
 */
export function detectSubcommand(args: string[]): SubcommandDetectionResult {
  // Find the first non-option argument
  const firstNonOption = args.find(arg => !arg.startsWith('-'))

  if (!firstNonOption) {
    return { isSubcommand: false }
  }

  // Empty string is not a valid subcommand
  if (firstNonOption === '') {
    return { isSubcommand: false }
  }

  // Check if it's a single word (no spaces)
  const isSubcommand = !firstNonOption.includes(' ')

  return {
    isSubcommand,
    subcommand: isSubcommand ? firstNonOption : undefined,
  }
}
