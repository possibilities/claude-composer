import notifier from 'node-notifier'
import { MatchResult } from '../patterns/matcher'
import { replacePlaceholders } from './template-utils'
import { AppConfig } from '../config/schemas'

export interface NotificationOptions {
  title?: string
  message: string
  timeout?: number | false
  wait?: boolean
  sound?: boolean | string
}

export { notifier }

export function showNotification(
  options: NotificationOptions,
  appConfig?: AppConfig,
): void {
  const defaults: NotificationOptions = {
    title: '🤖 Claude Composer',
    timeout: appConfig?.sticky_notifications ? 86400 : undefined, // 24 hours for sticky
    wait: false,
    sound: false,
  }

  notifier.notify({
    ...defaults,
    ...options,
  })
}

export function showPatternNotification(
  match: MatchResult,
  appConfig?: AppConfig,
  actionResponse?: 'Dismissed' | 'Prompted',
  actionResponseIcon?: string,
): void {
  if (!match.notification) {
    return
  }

  const message = replacePlaceholders(
    match.notification,
    match,
    actionResponse,
    actionResponseIcon,
  )

  showNotification(
    {
      message,
    },
    appConfig,
  )
}

export function showSnapshotNotification(
  projectName: string,
  appConfig?: AppConfig,
): void {
  showNotification(
    {
      title: '📸 Claude Composer',
      message: `Terminal snapshot saved\nProject: ${projectName}\nPath to snapshot copied to clipboard`,
    },
    appConfig,
  )
}
