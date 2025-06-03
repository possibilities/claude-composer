import type {
  RulesetConfig,
  DismissPromptConfig,
  DismissFetchContentConfig,
} from './schemas'

export function mergeRulesets(rulesets: RulesetConfig[]): RulesetConfig {
  const merged: RulesetConfig = {}

  for (const ruleset of rulesets) {
    for (const [key, value] of Object.entries(ruleset)) {
      const currentValue = merged[key as keyof RulesetConfig]

      if (key === 'dismiss_fetch_content_prompts') {
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
