import { z } from 'zod'

// Schema for per-confirmation type settings
export const confirmNotifySchema = z
  .object({
    edit_file: z.boolean().optional(),
    create_file: z.boolean().optional(),
    bash_command: z.boolean().optional(),
    read_file: z.boolean().optional(),
    fetch_content: z.boolean().optional(),
  })
  .strict()

// Schema for sticky notifications settings (can be boolean or object)
export const stickyNotificationsSchema = z.union([
  z.boolean(),
  z
    .object({
      global: z.boolean().optional(),
      work_started: z.boolean().optional(),
      work_complete: z.boolean().optional(),
      work_complete_record: z.boolean().optional(),
      prompted_confirmations: z.boolean().optional(),
      accepted_confirmations: z.boolean().optional(),
      terminal_snapshot: z.boolean().optional(),
    })
    .strict(),
])

export const appConfigSchema = z
  .object({
    // Master notification controls
    show_notifications: z.boolean().optional(),

    // Confirmation notification settings
    show_confirm_notify: z.boolean().optional(),
    show_accepted_confirm_notify: z.boolean().optional(),
    show_prompted_confirm_notify: z.boolean().optional(),
    confirm_notify: confirmNotifySchema.optional(),

    // Work notification settings
    show_work_started_notifications: z.boolean().optional(),
    show_work_complete_notifications: z.boolean().optional(),
    show_work_complete_record_notifications: z.boolean().optional(),

    // Stickiness settings
    sticky_notifications: stickyNotificationsSchema.optional(),

    // Legacy notification settings (kept for backward compatibility)
    notify_work_started: z.boolean().optional(),
    notify_work_complete: z.boolean().optional(),

    // Remote notification settings
    send_remote_notifications: z.boolean().optional(),

    // Safety settings
    safe: z.boolean().optional(),
    dangerously_allow_in_dirty_directory: z.boolean().optional(),
    dangerously_allow_without_version_control: z.boolean().optional(),

    // Other settings
    toolsets: z.array(z.string()).optional(),
    rulesets: z.array(z.string()).optional(),
    log_all_pattern_matches: z.boolean().optional(),
    allow_buffer_snapshots: z.boolean().optional(),
    allow_adding_project_tree: z.boolean().optional(),
    allow_adding_project_changes: z.boolean().optional(),
  })
  .strict()

export type AppConfig = z.infer<typeof appConfigSchema>
export type ConfirmNotifyConfig = z.infer<typeof confirmNotifySchema>
export type StickyNotificationsConfig = z.infer<
  typeof stickyNotificationsSchema
>

export const toolsetConfigSchema = z
  .object({
    allowed: z.array(z.string()).optional(),
    disallowed: z.array(z.string()).optional(),
    mcp: z.record(z.string(), z.unknown()).optional(),
  })
  .strict()

export type ToolsetConfig = z.infer<typeof toolsetConfigSchema>

export const acceptPromptConfigSchema = z.union([
  z.boolean(),
  z
    .object({
      paths: z
        .array(z.string())
        .min(1, 'Paths array must have at least one pattern'),
    })
    .strict(),
])

export type AcceptPromptConfig = z.infer<typeof acceptPromptConfigSchema>

export const acceptFetchContentConfigSchema = z.union([
  z.boolean(),
  z
    .object({
      domains: z
        .array(z.string())
        .min(1, 'Domains array must have at least one domain'),
    })
    .strict(),
])

export type AcceptFetchContentConfig = z.infer<
  typeof acceptFetchContentConfigSchema
>

export const rulesetConfigSchema = z
  .object({
    accept_project_edit_file_prompts: acceptPromptConfigSchema.optional(),
    accept_project_create_file_prompts: acceptPromptConfigSchema.optional(),
    accept_project_bash_command_prompts: acceptPromptConfigSchema.optional(),
    accept_project_read_files_prompts: acceptPromptConfigSchema.optional(),
    accept_global_edit_file_prompts: acceptPromptConfigSchema.optional(),
    accept_global_create_file_prompts: acceptPromptConfigSchema.optional(),
    accept_global_bash_command_prompts: acceptPromptConfigSchema.optional(),
    accept_global_read_files_prompts: acceptPromptConfigSchema.optional(),
    accept_fetch_content_prompts: acceptFetchContentConfigSchema.optional(),
  })
  .strict()

export type RulesetConfig = z.infer<typeof rulesetConfigSchema>

export function parseAppConfig(data: unknown): AppConfig {
  return appConfigSchema.parse(data)
}

export function parseToolsetConfig(data: unknown): ToolsetConfig {
  return toolsetConfigSchema.parse(data)
}

export function validateAppConfig(
  data: unknown,
): z.SafeParseReturnType<unknown, AppConfig> {
  return appConfigSchema.safeParse(data)
}

export function validateToolsetConfig(
  data: unknown,
): z.SafeParseReturnType<unknown, ToolsetConfig> {
  return toolsetConfigSchema.safeParse(data)
}

export function parseRulesetConfig(data: unknown): RulesetConfig {
  return rulesetConfigSchema.parse(data)
}

export function validateRulesetConfig(
  data: unknown,
): z.SafeParseReturnType<unknown, RulesetConfig> {
  return rulesetConfigSchema.safeParse(data)
}

// Pattern configuration schema
export const patternConfigSchema = z
  .object({
    id: z.string().min(1, 'Pattern ID cannot be empty'),
    title: z.string().min(1, 'Pattern title cannot be empty'),
    pattern: z
      .array(z.string())
      .min(1, 'Pattern must have at least one string'),
    response: z.union([
      z.string(),
      z.array(z.string()),
      z.function().returns(z.union([z.string(), z.array(z.string())])),
    ]),
    type: z.enum(['expansion', 'confirmation']).optional(),
    notification: z.string().optional(),
    triggerText: z.string().optional(),
    transformExtractedData: z
      .function()
      .args(z.record(z.string(), z.any()))
      .returns(z.record(z.string(), z.string()))
      .optional(),
  })
  .refine(
    data => {
      // triggerText is only allowed on confirmation type patterns
      if (data.triggerText && data.type !== 'confirmation') {
        return false
      }
      return true
    },
    {
      message:
        'triggerText is only allowed on patterns with type "confirmation"',
    },
  )

export type PatternConfig = z.infer<typeof patternConfigSchema>

export function parsePatternConfig(data: unknown): PatternConfig {
  return patternConfigSchema.parse(data)
}

export function validatePatternConfig(
  data: unknown,
): z.SafeParseReturnType<unknown, PatternConfig> {
  return patternConfigSchema.safeParse(data)
}

export function parsePatternConfigs(data: unknown): PatternConfig[] {
  return z.array(patternConfigSchema).parse(data)
}

export function validatePatternConfigs(
  data: unknown,
): z.SafeParseReturnType<unknown, PatternConfig[]> {
  return z.array(patternConfigSchema).safeParse(data)
}

// Remote notification configuration schema
export const remoteNotificationConfigSchema = z
  .object({
    discord: z
      .object({
        webhook_url: z.string().url(),
      })
      .optional(),
    whatsapp: z
      .object({
        access_token: z.string(),
        sender_number: z.string(),
        recipient_number: z.string(),
      })
      .optional(),
    subscriber_id: z.string(),
  })
  .strict()

export type RemoteNotificationConfig = z.infer<
  typeof remoteNotificationConfigSchema
>

export function parseRemoteNotificationConfig(
  data: unknown,
): RemoteNotificationConfig {
  return remoteNotificationConfigSchema.parse(data)
}

export function validateRemoteNotificationConfig(
  data: unknown,
): z.SafeParseReturnType<unknown, RemoteNotificationConfig> {
  return remoteNotificationConfigSchema.safeParse(data)
}
