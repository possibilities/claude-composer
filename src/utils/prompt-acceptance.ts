import type { MatchResult } from '../patterns/matcher'
import type { AppConfig } from '../config/schemas'

export function shouldAcceptPrompt(
  match: MatchResult,
  appConfig: AppConfig | undefined,
  yolo: boolean | undefined,
): boolean {
  // If yolo mode is enabled, accept all prompts
  if (yolo) {
    return true
  }

  // Special case: always accept pipe-on-app-ready
  if (match.patternId === 'pipe-on-app-ready') {
    return true
  }

  // Otherwise, don't accept any prompts
  return false
}

// Legacy exports for backward compatibility (will be removed in tests)
export function checkAcceptConfig(): boolean {
  return false
}
