import * as path from 'path'
import picomatch from 'picomatch'
import type { MatchResult } from '../patterns/matcher'
import type { AppConfig, RulesetConfig } from '../config/schemas'
import { isFileInProjectRoot } from './file-utils'

function matchDomain(domain: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    if (pattern === domain) {
      return true
    }

    if (pattern.includes('*')) {
      const regexPattern = pattern
        .split('*')
        .map(part => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*')
      const regex = new RegExp(`^${regexPattern}$`)
      if (regex.test(domain)) {
        return true
      }
    }
  }
  return false
}

export function checkAcceptConfig(
  config: boolean | { paths: string[] } | undefined,
  filePath: string,
  isProjectContext: boolean,
): boolean {
  if (config === true) return true
  if (config === false || config === undefined) return false

  if (typeof config === 'object' && 'paths' in config) {
    const normalizedPath = path.normalize(filePath)
    const pathToCheck = isProjectContext
      ? path.relative(process.cwd(), normalizedPath) || '.'
      : normalizedPath

    const isMatch = picomatch(config.paths)
    return isMatch(pathToCheck)
  }

  return false
}

export function shouldAcceptPrompt(
  match: MatchResult,
  appConfig: AppConfig | undefined,
  mergedRuleset: RulesetConfig | undefined,
): boolean {
  const fileName = match.extractedData?.fileName
  const directory = match.extractedData?.directory

  let checkPath = fileName || directory || process.cwd()
  if (!checkPath) return false

  const isInProjectRoot = isFileInProjectRoot(checkPath)

  switch (match.patternId) {
    case 'edit-file-prompt':
      if (!mergedRuleset) return false
      return isInProjectRoot
        ? checkAcceptConfig(
            mergedRuleset.accept_project_edit_file_prompts,
            checkPath,
            true,
          )
        : checkAcceptConfig(
            mergedRuleset.accept_global_edit_file_prompts,
            checkPath,
            false,
          )
    case 'create-file-prompt':
      if (!mergedRuleset) return false
      return isInProjectRoot
        ? checkAcceptConfig(
            mergedRuleset.accept_project_create_file_prompts,
            checkPath,
            true,
          )
        : checkAcceptConfig(
            mergedRuleset.accept_global_create_file_prompts,
            checkPath,
            false,
          )
    case 'bash-command-prompt-format-1':
    case 'bash-command-prompt-format-2':
      if (!mergedRuleset) return false

      const bashConfig = isInProjectRoot
        ? mergedRuleset.accept_project_bash_command_prompts
        : mergedRuleset.accept_global_bash_command_prompts

      // If config is path-based but no directory is available, don't accept
      if (
        bashConfig &&
        typeof bashConfig === 'object' &&
        'paths' in bashConfig
      ) {
        if (!directory) {
          return false
        }
      }

      return isInProjectRoot
        ? checkAcceptConfig(
            mergedRuleset.accept_project_bash_command_prompts,
            checkPath,
            true,
          )
        : checkAcceptConfig(
            mergedRuleset.accept_global_bash_command_prompts,
            checkPath,
            false,
          )
    case 'read-files-prompt':
      if (!mergedRuleset) return false
      return isInProjectRoot
        ? checkAcceptConfig(
            mergedRuleset.accept_project_read_files_prompts,
            checkPath,
            true,
          )
        : checkAcceptConfig(
            mergedRuleset.accept_global_read_files_prompts,
            checkPath,
            false,
          )
    case 'fetch-content-prompt':
      if (!mergedRuleset) return false
      const fetchConfig = mergedRuleset.accept_fetch_content_prompts
      if (fetchConfig === true) return true
      if (fetchConfig === false || !fetchConfig) return false
      if (typeof fetchConfig === 'object' && 'domains' in fetchConfig) {
        const domain = (match as any).data?.domain
        if (!domain) return false
        return matchDomain(domain, fetchConfig.domains)
      }
      return false
    case 'app-started':
      return true
    default:
      // Unknown prompt types are not auto-accepted
      return false
  }
}
