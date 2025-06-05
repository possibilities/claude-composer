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

export type NotificationType =
  | 'work_started'
  | 'work_complete'
  | 'work_complete_record'
  | 'prompted_confirmation'
  | 'accepted_confirmation'
  | 'terminal_snapshot'

export function getNotificationStickiness(
  type: NotificationType,
  appConfig?: AppConfig,
): boolean {
  if (!appConfig) return false

  // Check per-type stickiness fields first
  switch (type) {
    case 'work_started':
      return appConfig.sticky_work_started_notifications ?? false
    case 'work_complete':
      return appConfig.sticky_work_complete_notifications ?? true
    case 'work_complete_record':
      return appConfig.sticky_work_complete_record_notifications ?? true
    case 'prompted_confirmation':
      return appConfig.sticky_prompted_confirm_notify ?? true
    case 'accepted_confirmation':
      return appConfig.sticky_accepted_confirm_notify ?? false
    case 'terminal_snapshot':
      return appConfig.sticky_terminal_snapshot_notifications ?? false
    default:
      // Fallback to global sticky_notifications setting if available
      return appConfig.sticky_notifications ?? false
  }
}

export async function showNotification(
  options: NotificationOptions,
  appConfig?: AppConfig,
  notificationType?: NotificationType,
): Promise<void> {
  // Determine if notification should be sticky
  let isSticky = false
  if (options.timeout === false) {
    // Explicit sticky request (like unacceptable dialog)
    isSticky = true
  } else if (notificationType) {
    isSticky = getNotificationStickiness(notificationType, appConfig)
  } else if (appConfig?.sticky_notifications) {
    // Fallback to global sticky_notifications setting
    isSticky = appConfig.sticky_notifications
  }

  const defaults: NotificationOptions = {
    title: '🤖 Claude Composer',
    timeout: isSticky ? 86400 : undefined, // 24 hours for sticky
    wait: false,
    sound: false,
  }

  // Show local notification
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

export async function showPatternNotification(
  match: MatchResult,
  appConfig?: AppConfig,
  actionResponse?: 'Accepted' | 'Prompted',
  actionResponseIcon?: string,
): Promise<void> {
  if (!match.notification || !appConfig) {
    return
  }

  // Check master switch
  if (!appConfig.show_notifications) return

  // Check confirmation notifications enabled
  if (appConfig.show_confirm_notify === false) return

  // Check accepted vs prompted
  const isAccepted = actionResponse === 'Accepted'
  const isPrompted = actionResponse === 'Prompted'

  if (isAccepted && !appConfig.show_accepted_confirm_notify) return
  if (isPrompted && appConfig.show_prompted_confirm_notify === false) return

  // Check per-type control
  const patternType = getPatternType(match.patternId)
  if (patternType && appConfig.confirm_notify?.[patternType] === false) {
    return
  }

  // Determine notification type for stickiness
  const notificationType: NotificationType = isAccepted
    ? 'accepted_confirmation'
    : 'prompted_confirmation'

  const message = replacePlaceholders(
    match.notification,
    match,
    actionResponse,
    actionResponseIcon,
  )

  await showNotification(
    {
      message,
    },
    appConfig,
    notificationType,
  )
}

export async function showSnapshotNotification(
  projectName: string,
  appConfig?: AppConfig,
): Promise<void> {
  await showNotification(
    {
      title: '📸 Claude Composer',
      message: `Terminal snapshot saved\nProject: ${projectName}\nPath to snapshot copied to clipboard`,
    },
    appConfig,
    'terminal_snapshot',
  )
}
