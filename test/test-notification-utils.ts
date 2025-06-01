import { MatchResult } from '../src/patterns/matcher'
import { showPatternNotification } from '../src/utils/notifications'

// Helper function to create a MatchResult with notification
export function createMatchWithNotification(
  base: Omit<MatchResult, 'notification'>,
  notificationTemplate: string,
): MatchResult {
  return {
    ...base,
    notification: notificationTemplate,
  }
}

// Test helper to show notifications
export function testShowNotification(match: MatchResult): void {
  showPatternNotification(match)
}
