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
    sticky_notifications: z.boolean().optional(),
    sticky_work_started_notifications: z.boolean().optional(),
    sticky_work_complete_notifications: z.boolean().optional(),
    sticky_work_complete_record_notifications: z.boolean().optional(),
    sticky_prompted_confirm_notify: z.boolean().optional(),
    sticky_accepted_confirm_notify: z.boolean().optional(),
    sticky_terminal_snapshot_notifications: z.boolean().optional(),

    // Safety settings
    dangerously_allow_in_dirty_directory: z.boolean().optional(),
    dangerously_allow_without_version_control: z.boolean().optional(),
    dangerously_suppress_automatic_acceptance_confirmation: z
      .boolean()
      .optional(),

    // Other settings
    toolsets: z.array(z.string()).optional(),
    rulesets: z.array(z.string()).optional(),
    log_all_pattern_matches: z.boolean().optional(),
    allow_buffer_snapshots: z.boolean().optional(),

    // Trust roots - directories where trust prompts are auto-accepted
    roots: z.array(z.string()).optional(),
  })
  .strict()

export type AppConfig = z.infer<typeof appConfigSchema>

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
export const patternConfigSchema = z.object({
  id: z.string().min(1, 'Pattern ID cannot be empty'),
  title: z.string().min(1, 'Pattern title cannot be empty'),
  pattern: z.array(z.string()).optional(),
  response: z.union([
    z.string(),
    z.array(z.string()),
    z
      .function()
      .returns(
        z.union([z.string(), z.array(z.string()), z.null(), z.undefined()]),
      ),
    z.null(),
    z.undefined(),
  ]),
  notification: z.string().optional(),
  triggerText: z.string().optional(),
  transformExtractedData: z
    .function()
    .args(z.record(z.string(), z.any()))
    .returns(z.record(z.string(), z.string()))
    .optional(),
})

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
