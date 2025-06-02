import { MatchResult } from '../../src/patterns/matcher'
import { showPatternNotification } from '../../src/utils/notifications'

export function createMatchWithNotification(
  base: Omit<MatchResult, 'notification'>,
  notificationTemplate: string,
): MatchResult {
  return {
    ...base,
    notification: notificationTemplate,
  }
}

export function testShowNotification(match: MatchResult): void {
  showPatternNotification(match)
}
