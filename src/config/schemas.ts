import { z } from 'zod'

export const appConfigSchema = z
  .object({
    // Master notification controls
    show_notifications: z.boolean().optional(),
    sticky_notifications: z.boolean().optional(),

    // Safety settings
    dangerously_allow_in_dirty_directory: z.boolean().optional(),
    dangerously_allow_without_version_control: z.boolean().optional(),
    dangerously_suppress_yolo_confirmation: z.boolean().optional(),
    dangerously_allow_in_untrusted_root: z.boolean().optional(),

    // Other settings
    toolsets: z.array(z.string()).optional(),
    yolo: z.boolean().optional(),
    log_all_pattern_matches: z.boolean().optional(),
    allow_buffer_snapshots: z.boolean().optional(),
    mode: z.enum(['plan', 'act']).optional(),
    output_formatter: z.string().optional(),

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

// Pattern configuration schema
export const patternConfigSchema = z.object({
  id: z.string().min(1, 'Pattern ID cannot be empty'),
  title: z.string().min(1, 'Pattern title cannot be empty'),
  pattern: z.array(z.string()).optional(),
  response: z.union([
    z.string(),
    z.array(z.union([z.string(), z.number()])),
    z
      .function()
      .returns(
        z.union([
          z.string(),
          z.array(z.union([z.string(), z.number()])),
          z.null(),
          z.undefined(),
        ]),
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
