import type { ToolsetConfig } from './schemas.js'
import { loadToolsetFile } from './loader.js'
import { log } from '../utils/logging.js'

export function buildToolsetArgs(toolsetConfig: ToolsetConfig): string[] {
  const args: string[] = []

  if (toolsetConfig.allowed) {
    for (const tool of toolsetConfig.allowed) {
      args.push('--allowedTools', tool)
    }
  }

  if (toolsetConfig.disallowed) {
    for (const tool of toolsetConfig.disallowed) {
      args.push('--disallowedTools', tool)
    }
  }

  return args
}

export async function mergeToolsets(
  toolsetsToLoad: string[],
): Promise<ToolsetConfig> {
  let mergedConfig: ToolsetConfig = {
    allowed: [],
    disallowed: [],
    mcp: {},
  }

  for (const toolsetName of toolsetsToLoad) {
    const toolsetConfig = await loadToolsetFile(toolsetName)

    if (toolsetConfig.allowed) {
      mergedConfig.allowed = mergedConfig.allowed || []
      mergedConfig.allowed.push(...toolsetConfig.allowed)
    }

    if (toolsetConfig.disallowed) {
      mergedConfig.disallowed = mergedConfig.disallowed || []
      mergedConfig.disallowed.push(...toolsetConfig.disallowed)
    }

    if (toolsetConfig.mcp) {
      mergedConfig.mcp = {
        ...mergedConfig.mcp,
        ...toolsetConfig.mcp,
      }
    }

    log(`※ Loaded toolset: ${toolsetName}`)

    if (toolsetConfig.allowed && toolsetConfig.allowed.length > 0) {
      log(
        `※ Toolset ${toolsetName} allowed ${toolsetConfig.allowed.length} tool${toolsetConfig.allowed.length === 1 ? '' : 's'}`,
      )
    }

    if (toolsetConfig.disallowed && toolsetConfig.disallowed.length > 0) {
      log(
        `※ Toolset ${toolsetName} disallowed ${toolsetConfig.disallowed.length} tool${toolsetConfig.disallowed.length === 1 ? '' : 's'}`,
      )
    }

    if (toolsetConfig.mcp) {
      const mcpCount = Object.keys(toolsetConfig.mcp).length
      log(
        `※ Toolset ${toolsetName} configured ${mcpCount} MCP server${mcpCount === 1 ? '' : 's'}`,
      )
    }
  }

  if (mergedConfig.allowed) {
    mergedConfig.allowed = [...new Set(mergedConfig.allowed)]
  }

  if (mergedConfig.disallowed) {
    mergedConfig.disallowed = [...new Set(mergedConfig.disallowed)]
  }

  return mergedConfig
}
