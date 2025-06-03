import { z } from 'zod'

export const appConfigSchema = z
  .object({
    show_notifications: z.boolean().optional(),
    sticky_notifications: z.boolean().optional(),
    notify_work_started: z.boolean().optional(),
    notify_work_complete: z.boolean().optional(),
    dangerously_dismiss_edit_file_prompts: z.boolean().optional(),
    dangerously_dismiss_create_file_prompts: z.boolean().optional(),
    dangerously_dismiss_bash_command_prompts: z.boolean().optional(),
    dangerously_dismiss_read_files_prompts: z.boolean().optional(),
    dangerously_dismiss_fetch_content_prompts: z.boolean().optional(),
    dangerously_allow_in_dirty_directory: z.boolean().optional(),
    dangerously_allow_without_version_control: z.boolean().optional(),
    toolsets: z.array(z.string()).optional(),
    rulesets: z.array(z.string()).optional(),
    log_all_pattern_matches: z.boolean().optional(),
    allow_buffer_snapshots: z.boolean().optional(),
    allow_adding_project_tree: z.boolean().optional(),
    allow_adding_project_changes: z.boolean().optional(),
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

export const dismissPromptConfigSchema = z.union([
  z.boolean(),
  z
    .object({
      paths: z
        .array(z.string())
        .min(1, 'Paths array must have at least one pattern'),
    })
    .strict(),
])

export type DismissPromptConfig = z.infer<typeof dismissPromptConfigSchema>

export const rulesetConfigSchema = z
  .object({
    dismiss_project_edit_file_prompts: dismissPromptConfigSchema.optional(),
    dismiss_project_create_file_prompts: dismissPromptConfigSchema.optional(),
    dismiss_project_bash_command_prompts: dismissPromptConfigSchema.optional(),
    dismiss_project_read_files_prompts: dismissPromptConfigSchema.optional(),
    dismiss_global_edit_file_prompts: dismissPromptConfigSchema.optional(),
    dismiss_global_create_file_prompts: dismissPromptConfigSchema.optional(),
    dismiss_global_bash_command_prompts: dismissPromptConfigSchema.optional(),
    dismiss_global_read_files_prompts: dismissPromptConfigSchema.optional(),
    dismiss_fetch_content_prompts: z.boolean().optional(),
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
    type: z.enum(['completion', 'prompt']).optional(),
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
      // triggerText is only allowed on prompt type patterns
      if (data.triggerText && data.type !== 'prompt') {
        return false
      }
      return true
    },
    {
      message: 'triggerText is only allowed on patterns with type "prompt"',
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
