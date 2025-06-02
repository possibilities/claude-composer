import { showNotification } from '../utils/notifications'
import type { AppConfig } from '../config/schemas'

export class ActivityMonitor {
  private targetText = 'to interrupt)'
  private isPersistentlyPresent = false
  private isCurrentlyPresent = false
  private confirmationPromptDetected = false
  private lastSeenTime: number | null = null
  private lastNotSeenTime: number | null = null
  private persistenceThreshold = 1000
  private absenceThreshold = 2000
  private confirmationPromptTimeout = 10000
  private confirmationPromptDetectedAt: number | null = null
  private hasNotified = false
  constructor(private appConfig: AppConfig) {}

  checkSnapshot(snapshot: string): void {
    const currentTime = Date.now()
    const wasPresent = this.isCurrentlyPresent

    const hasActivityIndicator = snapshot.includes(this.targetText)
    const hasConfirmationPrompt = /1\.[\s\S]*?Yes/.test(snapshot)

    if (hasConfirmationPrompt && !this.confirmationPromptDetected) {
      this.confirmationPromptDetected = true
      this.confirmationPromptDetectedAt = currentTime
    }

    const isWithinConfirmationTimeout =
      this.confirmationPromptDetected &&
      this.confirmationPromptDetectedAt &&
      currentTime - this.confirmationPromptDetectedAt <
        this.confirmationPromptTimeout

    this.isCurrentlyPresent =
      hasActivityIndicator ||
      hasConfirmationPrompt ||
      isWithinConfirmationTimeout

    if (this.isCurrentlyPresent) {
      if (!wasPresent) {
        this.lastSeenTime = currentTime
        this.lastNotSeenTime = null
        this.hasNotified = false
      }

      if (
        this.lastSeenTime &&
        currentTime - this.lastSeenTime >= this.persistenceThreshold
      ) {
        this.isPersistentlyPresent = true
      }
    } else {
      if (wasPresent) {
        this.lastNotSeenTime = currentTime
      }

      if (
        this.isPersistentlyPresent &&
        !this.hasNotified &&
        this.lastNotSeenTime &&
        currentTime - this.lastNotSeenTime >= this.absenceThreshold
      ) {
        this.triggerNotification()
        this.hasNotified = true
        this.isPersistentlyPresent = false
        this.confirmationPromptDetected = false
        this.confirmationPromptDetectedAt = null
        this.lastSeenTime = null
      }
    }
  }

  private triggerNotification(): void {
    showNotification(
      { message: 'Claude Composer is done working' },
      this.appConfig,
    )
  }

  reset(): void {
    this.isPersistentlyPresent = false
    this.isCurrentlyPresent = false
    this.confirmationPromptDetected = false
    this.confirmationPromptDetectedAt = null
    this.lastSeenTime = null
    this.lastNotSeenTime = null
    this.hasNotified = false
  }
}
