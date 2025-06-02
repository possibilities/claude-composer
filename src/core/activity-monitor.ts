import { showNotification } from '../utils/notifications'
import type { AppConfig } from '../config/schemas'

export class ActivityMonitor {
  private targetText = 'to interrupt)'
  private isPersistentlyPresent = false
  private isCurrentlyPresent = false
  private lastSeenTime: number | null = null
  private lastNotSeenTime: number | null = null
  private persistenceThreshold = 2000 // 2 seconds in milliseconds
  private absenceThreshold = 2000 // 2 seconds in milliseconds
  private hasNotified = false
  constructor(private appConfig: AppConfig) {}

  checkSnapshot(snapshot: string): void {
    const currentTime = Date.now()
    const wasPresent = this.isCurrentlyPresent
    this.isCurrentlyPresent = snapshot.includes(this.targetText)

    if (this.isCurrentlyPresent) {
      // Text is present
      if (!wasPresent) {
        // Text just appeared
        this.lastSeenTime = currentTime
        this.lastNotSeenTime = null
        this.hasNotified = false
      }

      // Check if it's been persistently present
      if (
        this.lastSeenTime &&
        currentTime - this.lastSeenTime >= this.persistenceThreshold
      ) {
        this.isPersistentlyPresent = true
      }
    } else {
      // Text is not present
      if (wasPresent) {
        // Text just disappeared
        this.lastNotSeenTime = currentTime
      }

      // Check if we should trigger notification
      if (
        this.isPersistentlyPresent &&
        !this.hasNotified &&
        this.lastNotSeenTime &&
        currentTime - this.lastNotSeenTime >= this.absenceThreshold
      ) {
        // Text has been absent for long enough after being persistently present
        this.triggerNotification()
        this.hasNotified = true
        this.isPersistentlyPresent = false
        this.lastSeenTime = null
      }
    }
  }

  private triggerNotification(): void {
    showNotification(
      { message: 'Claude Composer is done working.' },
      this.appConfig,
    )
  }

  reset(): void {
    this.isPersistentlyPresent = false
    this.isCurrentlyPresent = false
    this.lastSeenTime = null
    this.lastNotSeenTime = null
    this.hasNotified = false
  }
}
