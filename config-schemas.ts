import { z } from 'zod'

export const appConfigSchema = z
  .object({
    show_notifications: z.boolean().optional(),
    dangerously_dismiss_edit_file_prompts: z.boolean().optional(),
    dangerously_dismiss_create_file_prompts: z.boolean().optional(),
    dangerously_dismiss_bash_command_prompts: z.boolean().optional(),
    dangerously_allow_in_dirty_directory: z.boolean().optional(),
    dangerously_allow_without_version_control: z.boolean().optional(),
    log_all_prompts: z.boolean().optional(),
    log_latest_buffer: z.boolean().optional(),
  })
  .strict()

export type AppConfig = z.infer<typeof appConfigSchema>

export const toolsetConfigSchema = z
  .object({
    allowed: z.array(z.string()).optional(),
    disallowed: z.array(z.string()).optional(),
    mcp: z.record(z.string(), z.any()).optional(),
  })
  .strict()

export type ToolsetConfig = z.infer<typeof toolsetConfigSchema>

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
