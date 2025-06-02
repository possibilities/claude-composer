import type { RulesetConfig } from './schemas'

export function mergeRulesets(rulesets: RulesetConfig[]): RulesetConfig {
  const merged: RulesetConfig = {}

  for (const ruleset of rulesets) {
    for (const [key, value] of Object.entries(ruleset)) {
      // Use the least restrictive setting - if any ruleset has true, use true
      if (value === true) {
        merged[key as keyof RulesetConfig] = true
      } else if (
        merged[key as keyof RulesetConfig] === undefined &&
        value === false
      ) {
        merged[key as keyof RulesetConfig] = false
      }
    }
  }

  return merged
}

export function buildRulesetArgs(ruleset: RulesetConfig): string[] {
  // Rulesets are handled entirely in the parent process (claude-composer)
  // No flags need to be passed to the child process
  return []
}
