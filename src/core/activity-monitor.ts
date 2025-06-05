import { showNotification, NotificationType } from '../utils/notifications'
import type { AppConfig } from '../config/schemas'
import { CONFIG_PATHS } from '../config/paths'
import * as fs from 'fs'
import * as path from 'path'

interface ActivityRecord {
  longestDurationMs: number
  lastRecordDate: string
  projectName: string
}

// Activity monitoring thresholds (in milliseconds)
const PERSISTENCE_THRESHOLD_MS = 1000 // Time indicator must be present before considered "persistent"
const ABSENCE_THRESHOLD_MS = 2000 // Time indicator must be absent before triggering completion
const CONFIRMATION_PROMPT_TIMEOUT_MS = 10000 // Grace period for confirmation prompts
const MEANINGFUL_RECORD_THRESHOLD_MS = 10000 // Minimum duration to count as a meaningful record

export class ActivityMonitor {
  private targetText = 'to interrupt)'
  private isPersistentlyPresent = false
  private isCurrentlyPresent = false
  private confirmationPromptDetected = false
  private lastSeenTime: number | null = null
  private lastNotSeenTime: number | null = null
  private confirmationPromptDetectedAt: number | null = null
  private hasNotified = false
  private activityStartTime: number | null = null
  private recordsFilePath: string
  constructor(private appConfig: AppConfig) {
    this.recordsFilePath = path.join(
      CONFIG_PATHS.getConfigDirectory(),
      'activity-records.json',
    )
    this.ensureRecordsFile()
  }

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
        CONFIRMATION_PROMPT_TIMEOUT_MS

    this.isCurrentlyPresent =
      hasActivityIndicator ||
      hasConfirmationPrompt ||
      isWithinConfirmationTimeout

    if (this.isCurrentlyPresent) {
      if (!wasPresent) {
        this.lastSeenTime = currentTime
        this.lastNotSeenTime = null
        this.hasNotified = false
        // Start timing the activity
        if (!this.activityStartTime) {
          this.activityStartTime = currentTime

          // Send work started notification if enabled
          const showWorkStarted =
            this.appConfig.show_work_started_notifications ?? false
          if (showWorkStarted) {
            const projectName = process.cwd().split('/').pop() || 'Unknown'
            showNotification(
              {
                message: `Claude Composer is starting work 🚀\nProject: ${projectName}`,
              },
              this.appConfig,
              'work_started',
            ).catch(err => console.error('Failed to send notification:', err))
          }
        }
      }

      if (
        this.lastSeenTime &&
        currentTime - this.lastSeenTime >= PERSISTENCE_THRESHOLD_MS
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
        currentTime - this.lastNotSeenTime >= ABSENCE_THRESHOLD_MS
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
    const projectName = process.cwd().split('/').pop() || 'Unknown'

    // Check if work complete notifications are enabled
    const showWorkComplete =
      this.appConfig.show_work_complete_notifications ?? true

    if (!showWorkComplete) {
      return
    }

    // Calculate activity duration
    if (this.activityStartTime) {
      const duration = Date.now() - this.activityStartTime
      const recordBroken = this.checkAndUpdateRecord(duration, projectName)

      if (recordBroken) {
        // Check if record-breaking notifications are enabled
        const showRecordNotifications =
          this.appConfig.show_work_complete_record_notifications ?? true
        if (showRecordNotifications) {
          this.showRecordBrokenNotification(duration, projectName)
        }
      } else {
        const formattedDuration = this.formatDuration(duration)
        showNotification(
          {
            message: `Claude Composer is done working 🏁\nProject: ${projectName}\nDuration: ${formattedDuration}`,
          },
          this.appConfig,
          'work_complete',
        ).catch(err => console.error('Failed to send notification:', err))
      }

      // Reset activity start time
      this.activityStartTime = null
    } else {
      showNotification(
        {
          message: `Claude Composer is done working 🏁\nProject: ${projectName}`,
        },
        this.appConfig,
        'work_complete',
      ).catch(err => console.error('Failed to send notification:', err))
    }
  }

  reset(): void {
    this.isPersistentlyPresent = false
    this.isCurrentlyPresent = false
    this.confirmationPromptDetected = false
    this.confirmationPromptDetectedAt = null
    this.lastSeenTime = null
    this.lastNotSeenTime = null
    this.hasNotified = false
    this.activityStartTime = null
  }

  private ensureRecordsFile(): void {
    const configDirectory = CONFIG_PATHS.getConfigDirectory()
    if (!fs.existsSync(configDirectory)) {
      fs.mkdirSync(configDirectory, { recursive: true })
    }

    if (!fs.existsSync(this.recordsFilePath)) {
      const initialRecord: ActivityRecord = {
        longestDurationMs: 0,
        lastRecordDate: new Date().toISOString(),
        projectName: 'None',
      }
      fs.writeFileSync(
        this.recordsFilePath,
        JSON.stringify(initialRecord, null, 2),
      )
    }
  }

  private getRecord(): ActivityRecord {
    try {
      const data = fs.readFileSync(this.recordsFilePath, 'utf-8')
      return JSON.parse(data)
    } catch {
      const defaultRecord: ActivityRecord = {
        longestDurationMs: 0,
        lastRecordDate: new Date().toISOString(),
        projectName: 'None',
      }
      return defaultRecord
    }
  }

  private saveRecord(record: ActivityRecord): void {
    fs.writeFileSync(this.recordsFilePath, JSON.stringify(record, null, 2))
  }

  private checkAndUpdateRecord(
    durationMs: number,
    projectName: string,
  ): boolean {
    const currentRecord = this.getRecord()

    // Only count as a meaningful record if it's > 10 seconds and beats the previous record
    if (
      durationMs > currentRecord.longestDurationMs &&
      durationMs > MEANINGFUL_RECORD_THRESHOLD_MS
    ) {
      const newRecord: ActivityRecord = {
        longestDurationMs: durationMs,
        lastRecordDate: new Date().toISOString(),
        projectName,
      }
      this.saveRecord(newRecord)
      return true
    }

    // Still update the record if it's the new longest, but don't count as "record-breaking" for notification
    if (durationMs > currentRecord.longestDurationMs) {
      const newRecord: ActivityRecord = {
        longestDurationMs: durationMs,
        lastRecordDate: new Date().toISOString(),
        projectName,
      }
      this.saveRecord(newRecord)
    }

    return false
  }

  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000)
    const minutes = Math.floor(seconds / 60)
    const hours = Math.floor(minutes / 60)

    if (hours > 0) {
      const remainingMinutes = minutes % 60
      return `${hours}h ${remainingMinutes}m`
    } else if (minutes > 0) {
      const remainingSeconds = seconds % 60
      return `${minutes}m ${remainingSeconds}s`
    } else {
      return `${seconds}s`
    }
  }

  private showRecordBrokenNotification(
    durationMs: number,
    projectName: string,
  ): void {
    const duration = this.formatDuration(durationMs)
    const emojis = ['🎉', '🚀', '⚡', '🌟', '🏆', '🎊', '💫', '✨']
    const emoji = emojis[Math.floor(Math.random() * emojis.length)]
    const messages = [
      `${emoji} New record! ${emoji}\n${emoji} Longest work session: ${duration} ${emoji}`,
      `${emoji} Achievement unlocked!\n${emoji} ${duration} of focused work! ${emoji}`,
      `${emoji} Personal best!\n${emoji} ${duration} session completed! ${emoji}`,
      `${emoji} Record smashed!\n${emoji} ${duration} of productivity! ${emoji}`,
    ]
    const message = messages[Math.floor(Math.random() * messages.length)]

    showNotification(
      {
        message: `${message}\n${emoji} Project: ${projectName} ${emoji} `,
        sound: true,
      },
      this.appConfig,
      'work_complete_record',
    ).catch(err => console.error('Failed to send notification:', err))
  }
}
