import type {
  RulesetConfig,
  AcceptPromptConfig,
  AcceptFetchContentConfig,
} from './schemas'

export function mergeRulesets(rulesets: RulesetConfig[]): RulesetConfig {
  const merged: RulesetConfig = {}

  for (const ruleset of rulesets) {
    for (const [key, value] of Object.entries(ruleset)) {
      const currentValue = merged[key as keyof RulesetConfig]

      if (key === 'accept_fetch_content_prompts') {
        if (value === true) {
          merged[key] = true
        } else if (
          typeof value === 'object' &&
          value !== null &&
          'domains' in value
        ) {
          if (currentValue === true) {
            continue
          } else if (
            typeof currentValue === 'object' &&
            currentValue !== null &&
            'domains' in currentValue
          ) {
            const mergedDomains = [
              ...new Set([...currentValue.domains, ...value.domains]),
            ]
            merged[key] = { domains: mergedDomains }
          } else {
            merged[key] = value
          }
        } else if (value === false) {
          if (currentValue === undefined) {
            merged[key] = false
          }
        }
        continue
      }

      if (value === true) {
        merged[key as keyof RulesetConfig] = true as any
      } else if (
        typeof value === 'object' &&
        value !== null &&
        'paths' in value
      ) {
        if (currentValue === true) {
          continue
        } else if (
          typeof currentValue === 'object' &&
          currentValue !== null &&
          'paths' in currentValue
        ) {
          const mergedPaths = [
            ...new Set([...currentValue.paths, ...value.paths]),
          ]
          merged[key as keyof RulesetConfig] = { paths: mergedPaths } as any
        } else {
          merged[key as keyof RulesetConfig] = value as any
        }
      } else if (value === false) {
        if (currentValue === undefined) {
          merged[key as keyof RulesetConfig] = false as any
        }
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

export function hasActiveAcceptanceRules(
  ruleset: RulesetConfig | undefined,
): boolean {
  if (!ruleset) return false

  return (
    ruleset.accept_project_edit_file_prompts === true ||
    ruleset.accept_global_edit_file_prompts === true ||
    ruleset.accept_project_create_file_prompts === true ||
    ruleset.accept_global_create_file_prompts === true ||
    ruleset.accept_project_bash_command_prompts === true ||
    ruleset.accept_global_bash_command_prompts === true ||
    ruleset.accept_project_read_files_prompts === true ||
    ruleset.accept_global_read_files_prompts === true ||
    ruleset.accept_fetch_content_prompts === true ||
    (typeof ruleset.accept_project_edit_file_prompts === 'object' &&
      ruleset.accept_project_edit_file_prompts.paths.length > 0) ||
    (typeof ruleset.accept_global_edit_file_prompts === 'object' &&
      ruleset.accept_global_edit_file_prompts.paths.length > 0) ||
    (typeof ruleset.accept_project_create_file_prompts === 'object' &&
      ruleset.accept_project_create_file_prompts.paths.length > 0) ||
    (typeof ruleset.accept_global_create_file_prompts === 'object' &&
      ruleset.accept_global_create_file_prompts.paths.length > 0) ||
    (typeof ruleset.accept_project_bash_command_prompts === 'object' &&
      ruleset.accept_project_bash_command_prompts.paths.length > 0) ||
    (typeof ruleset.accept_global_bash_command_prompts === 'object' &&
      ruleset.accept_global_bash_command_prompts.paths.length > 0) ||
    (typeof ruleset.accept_project_read_files_prompts === 'object' &&
      ruleset.accept_project_read_files_prompts.paths.length > 0) ||
    (typeof ruleset.accept_global_read_files_prompts === 'object' &&
      ruleset.accept_global_read_files_prompts.paths.length > 0) ||
    (typeof ruleset.accept_fetch_content_prompts === 'object' &&
      ruleset.accept_fetch_content_prompts.domains.length > 0)
  )
}
