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
  const args: string[] = []

  if (
    ruleset.dismiss_edit_file_prompt_inside_project ||
    ruleset.dismiss_edit_file_prompt_outside_project
  ) {
    args.push('--dangerously-dismiss-edit-file-prompts')
  }

  if (
    ruleset.dismiss_create_file_prompts_inside_project ||
    ruleset.dismiss_create_file_prompts_outside_project
  ) {
    args.push('--dangerously-dismiss-create-file-prompts')
  }

  if (
    ruleset.dismiss_bash_command_prompts_inside_project ||
    ruleset.dismiss_bash_command_prompts_outside_project
  ) {
    args.push('--dangerously-dismiss-bash-command-prompts')
  }

  return args
}
