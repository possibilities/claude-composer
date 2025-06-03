import { Novu } from '@novu/node'
import { DiscordProvider } from '@novu/discord'
import * as fs from 'fs'
import * as path from 'path'
import * as yaml from 'js-yaml'
import { CONFIG_PATHS } from '../config/paths'
import {
  validateRemoteNotificationConfig,
  type RemoteNotificationConfig,
} from '../config/schemas'
import type {
  NotificationOptions,
  NotificationType,
} from '../utils/notifications'

export class RemoteNotificationService {
  private static instance: RemoteNotificationService | null = null
  private novu: Novu | null = null
  private config: RemoteNotificationConfig | null = null
  private initialized = false

  private constructor() {}

  static getInstance(): RemoteNotificationService {
    if (!RemoteNotificationService.instance) {
      RemoteNotificationService.instance = new RemoteNotificationService()
    }
    return RemoteNotificationService.instance
  }

  static resetInstance(): void {
    RemoteNotificationService.instance = null
  }

  private getConfigPath(): string {
    return path.join(
      CONFIG_PATHS.getConfigDirectory(),
      'remote-notifications.yaml',
    )
  }

  async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true
    }

    const configPath = this.getConfigPath()
    if (!fs.existsSync(configPath)) {
      return false
    }

    try {
      const configData = fs.readFileSync(configPath, 'utf8')
      const parsed = yaml.load(configData)
      const result = validateRemoteNotificationConfig(parsed)

      if (!result.success) {
        console.error(`Invalid remote notification configuration:`)
        result.error.issues.forEach(issue => {
          const fieldPath =
            issue.path.length > 0 ? issue.path.join('.') : 'root'
          console.error(`  • ${fieldPath}: ${issue.message}`)
        })
        return false
      }

      this.config = result.data

      // Initialize Novu with providers
      const providers: any[] = []

      if (this.config.discord?.webhook_url) {
        providers.push(
          new DiscordProvider({
            webhookUrl: this.config.discord.webhook_url,
          }),
        )
      }

      // Note: WhatsApp provider would need different initialization
      // For now, we'll focus on Discord since WhatsApp requires more setup

      if (providers.length === 0) {
        console.warn('No remote notification providers configured')
        return false
      }

      // Novu v2 doesn't use providers in constructor
      // We'll need to use the API differently
      this.novu = new Novu(process.env.NOVU_API_KEY || 'dummy-key')

      this.initialized = true
      return true
    } catch (error) {
      console.error('Failed to initialize remote notifications:', error)
      return false
    }
  }

  async sendNotification(
    options: NotificationOptions,
    notificationType?: NotificationType,
    isSticky?: boolean,
  ): Promise<void> {
    if (!this.initialized || !this.config) {
      return
    }

    // Only send sticky notifications remotely
    if (!isSticky && options.timeout !== false) {
      return
    }

    try {
      const title = options.title || '🤖 Claude Composer'
      const message = options.message

      // For Discord, we can send directly via webhook
      if (this.config.discord?.webhook_url) {
        await this.sendDiscordNotification(title, message, notificationType)
      }

      // WhatsApp would be handled here if properly configured
    } catch (error) {
      console.error('Failed to send remote notification:', error)
    }
  }

  private async sendDiscordNotification(
    title: string,
    message: string,
    notificationType?: NotificationType,
  ): Promise<void> {
    if (!this.config?.discord?.webhook_url) {
      return
    }

    // Format message for Discord
    const timestamp = new Date().toISOString()
    const color = this.getColorForNotificationType(notificationType)

    const embed = {
      title,
      description: message,
      color,
      timestamp,
      footer: {
        text: `Claude Composer | ${notificationType || 'notification'}`,
      },
    }

    // Send to Discord webhook
    try {
      const response = await fetch(this.config.discord.webhook_url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          embeds: [embed],
        }),
      })

      if (!response.ok) {
        console.error(
          `Discord webhook failed: ${response.status} ${response.statusText}`,
        )
      }
    } catch (error) {
      console.error('Failed to send Discord notification:', error)
    }
  }

  private getColorForNotificationType(type?: NotificationType): number {
    // Discord colors (in decimal)
    switch (type) {
      case 'work_started':
        return 3447003 // Blue
      case 'work_complete':
        return 5763719 // Green
      case 'work_complete_record':
        return 16776960 // Gold
      case 'prompted_confirmation':
        return 16753920 // Orange
      case 'dismissed_confirmation':
        return 10181046 // Purple
      case 'terminal_snapshot':
        return 3426654 // Navy
      default:
        return 7506394 // Default gray
    }
  }
}
