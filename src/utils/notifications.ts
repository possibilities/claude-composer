import notifier from 'node-notifier'
import { MatchResult } from '../patterns/matcher'
import { replacePlaceholders } from './template-utils'
import { AppConfig, StickyNotificationsConfig } from '../config/schemas'

export interface NotificationOptions {
  title?: string
  message: string
  timeout?: number | false
  wait?: boolean
  sound?: boolean | string
}

export { notifier }

export type NotificationType =
  | 'work_started'
  | 'work_complete'
  | 'work_complete_record'
  | 'prompted_confirmation'
  | 'dismissed_confirmation'
  | 'terminal_snapshot'

export function getNotificationStickiness(
  type: NotificationType,
  appConfig?: AppConfig,
): boolean {
  if (!appConfig) return false

  const stickyConfig = appConfig.sticky_notifications

  // Handle legacy boolean format
  if (typeof stickyConfig === 'boolean') {
    return stickyConfig
  }

  // Check global override first
  if (stickyConfig?.global === true) {
    return true
  }

  // Check per-type stickiness with defaults
  switch (type) {
    case 'work_started':
      return stickyConfig?.work_started ?? false
    case 'work_complete':
      return stickyConfig?.work_complete ?? true
    case 'work_complete_record':
      return stickyConfig?.work_complete_record ?? true
    case 'prompted_confirmation':
      return stickyConfig?.prompted_confirmations ?? true
    case 'dismissed_confirmation':
      return stickyConfig?.dismissed_confirmations ?? false
    case 'terminal_snapshot':
      return stickyConfig?.terminal_snapshot ?? false
    default:
      return false
  }
}

export function showNotification(
  options: NotificationOptions,
  appConfig?: AppConfig,
  notificationType?: NotificationType,
): void {
  // Determine if notification should be sticky
  let isSticky = false
  if (options.timeout === false) {
    // Explicit sticky request (like undismissable dialog)
    isSticky = true
  } else if (notificationType) {
    isSticky = getNotificationStickiness(notificationType, appConfig)
  } else if (appConfig?.sticky_notifications) {
    // Fallback to legacy behavior
    isSticky =
      typeof appConfig.sticky_notifications === 'boolean'
        ? appConfig.sticky_notifications
        : (appConfig.sticky_notifications.global ?? false)
  }

  const defaults: NotificationOptions = {
    title: '🤖 Claude Composer',
    timeout: isSticky ? 86400 : undefined, // 24 hours for sticky
    wait: false,
    sound: false,
  }

  notifier.notify({
    ...defaults,
    ...options,
  })
}

export function getPatternType(
  patternId: string,
):
  | 'edit_file'
  | 'create_file'
  | 'bash_command'
  | 'read_file'
  | 'fetch_content'
  | undefined {
  switch (patternId) {
    case 'edit-file-prompt':
      return 'edit_file'
    case 'create-file-prompt':
      return 'create_file'
    case 'bash-command-prompt-format-1':
    case 'bash-command-prompt-format-2':
      return 'bash_command'
    case 'read-files-prompt':
      return 'read_file'
    case 'fetch-content-prompt':
      return 'fetch_content'
    default:
      return undefined
  }
}

export function showPatternNotification(
  match: MatchResult,
  appConfig?: AppConfig,
  actionResponse?: 'Dismissed' | 'Prompted',
  actionResponseIcon?: string,
): void {
  if (!match.notification || !appConfig) {
    return
  }

  // Check master switch
  if (!appConfig.show_notifications) return

  // Check confirmation notifications enabled
  if (appConfig.show_confirm_notify === false) return

  // Check dismissed vs prompted
  const isDismissed = actionResponse === 'Dismissed'
  const isPrompted = actionResponse === 'Prompted'

  if (isDismissed && !appConfig.show_dismissed_confirm_notify) return
  if (isPrompted && appConfig.show_prompted_confirm_notify === false) return

  // Check per-type control
  const patternType = getPatternType(match.patternId)
  if (patternType && appConfig.confirm_notify?.[patternType] === false) {
    return
  }

  // Determine notification type for stickiness
  const notificationType: NotificationType = isDismissed
    ? 'dismissed_confirmation'
    : 'prompted_confirmation'

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
    notificationType,
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
    'terminal_snapshot',
  )
}
