import * as fs from 'fs'
import * as yaml from 'js-yaml'
import prompts from 'prompts'
import { CONFIG_PATHS } from '../config/paths.js'
import { log, warn } from '../utils/logging.js'

export interface CcInitOptions {
  useYoloRuleset?: boolean
  useCautiousRuleset?: boolean
  useSafeRuleset?: boolean
  useCoreToolset?: boolean
  noUseCoreToolset?: boolean
  project?: boolean
}

export async function handleCcInit(args: string[]): Promise<void> {
  const options: CcInitOptions = {}

  // Check for help flag
  if (args.includes('--help') || args.includes('-h')) {
    console.log('Usage: claude-composer cc-init [options]')
    console.log('\nInitialize a new Claude Composer configuration file')
    console.log('\nOptions:')
    console.log(
      '  --use-yolo-ruleset       Use YOLO ruleset (accepts all prompts automatically)',
    )
    console.log(
      '  --use-cautious-ruleset   Use cautious ruleset (recommended, accepts project-level prompts)',
    )
    console.log(
      '  --use-safe-ruleset       Use safe ruleset (requires confirmation for all prompts)',
    )
    console.log('  --use-core-toolset       Enable core toolset')
    console.log('  --no-use-core-toolset    Disable core toolset')
    console.log(
      '  --project                Create config in current directory (.claude-composer/config.yaml)',
    )
    console.log('  -h, --help               Show this help message')
    console.log('\nNotes:')
    console.log(
      '  - Ruleset options (--use-yolo-ruleset, --use-cautious-ruleset, --use-safe-ruleset) are mutually exclusive',
    )
    console.log(
      '  - --use-core-toolset and --no-use-core-toolset are mutually exclusive',
    )
    process.exit(0)
  }

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case '--use-yolo-ruleset':
        options.useYoloRuleset = true
        break
      case '--use-cautious-ruleset':
        options.useCautiousRuleset = true
        break
      case '--use-safe-ruleset':
        options.useSafeRuleset = true
        break
      case '--use-core-toolset':
        options.useCoreToolset = true
        break
      case '--no-use-core-toolset':
        options.noUseCoreToolset = true
        break
      case '--project':
        options.project = true
        break
      default:
        if (arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`)
          process.exit(1)
        }
    }
  }

  // Validate mutually exclusive options
  const rulesetCount = [
    options.useYoloRuleset,
    options.useCautiousRuleset,
    options.useSafeRuleset,
  ].filter(Boolean).length
  if (rulesetCount > 1) {
    console.error(
      'Error: Ruleset options (--use-yolo-ruleset, --use-cautious-ruleset, --use-safe-ruleset) are mutually exclusive',
    )
    process.exit(1)
  }

  if (options.useCoreToolset && options.noUseCoreToolset) {
    console.error(
      'Error: --use-core-toolset and --no-use-core-toolset are mutually exclusive',
    )
    process.exit(1)
  }

  // Prompt for ruleset if none specified
  if (
    !options.useYoloRuleset &&
    !options.useCautiousRuleset &&
    !options.useSafeRuleset
  ) {
    const rulesetResponse = await prompts(
      {
        type: 'select',
        name: 'ruleset',
        message: 'Which ruleset would you like to use?',
        choices: [
          {
            title: 'Cautious (recommended)',
            description: 'Accepts project-level prompts automatically',
            value: 'cautious',
          },
          {
            title: 'Safe',
            description: 'Requires confirmation for all prompts',
            value: 'safe',
          },
          {
            title: 'YOLO',
            description: 'Accepts all prompts automatically',
            value: 'yolo',
          },
        ],
        initial: 0,
      },
      {
        onCancel: () => {
          process.exit(130)
        },
      },
    )

    if (rulesetResponse.ruleset === 'yolo') {
      options.useYoloRuleset = true
    } else if (rulesetResponse.ruleset === 'safe') {
      options.useSafeRuleset = true
    } else {
      options.useCautiousRuleset = true
    }
  }

  // Prompt for toolset if none specified
  if (!options.useCoreToolset && !options.noUseCoreToolset) {
    const toolsetResponse = await prompts(
      {
        type: 'confirm',
        name: 'useCoreToolset',
        message: 'Would you like to enable the core toolset?',
        initial: true,
        hint: 'Includes MCP context7 tools for library documentation',
      },
      {
        onCancel: () => {
          process.exit(130)
        },
      },
    )

    options.useCoreToolset = toolsetResponse.useCoreToolset
  }

  // Check if config file already exists
  const configPath = options.project
    ? '.claude-composer/config.yaml'
    : CONFIG_PATHS.getConfigFilePath()

  if (fs.existsSync(configPath)) {
    console.error('Error: Configuration file already exists at ' + configPath)
    process.exit(1)
  }

  // Build config object
  const config: any = {}

  // Add rulesets
  config.rulesets = []
  if (options.useYoloRuleset) {
    config.rulesets.push('internal:yolo')
  } else if (options.useCautiousRuleset) {
    config.rulesets.push('internal:cautious')
  } else if (options.useSafeRuleset) {
    config.rulesets.push('internal:safe')
  }

  // Add toolsets if requested
  if (options.useCoreToolset && !options.noUseCoreToolset) {
    config.toolsets = ['internal:core']
  }

  // Add empty roots list
  config.roots = []

  // Ensure config directory exists
  const configDir = options.project
    ? '.claude-composer'
    : CONFIG_PATHS.getConfigDirectory()

  if (!fs.existsSync(configDir)) {
    fs.mkdirSync(configDir, { recursive: true })
  }

  // Write config file
  try {
    const yamlStr = yaml.dump(config, { noRefs: true, lineWidth: -1 })
    fs.writeFileSync(configPath, yamlStr, 'utf8')
    log(`✅ Created configuration file at ${configPath}`)

    if (options.useYoloRuleset) {
      warn(
        '⚠️  Using YOLO ruleset - all prompts will be automatically accepted',
      )
    } else if (options.useCautiousRuleset) {
      log(
        '✓ Using cautious ruleset - project-level prompts will be automatically accepted',
      )
    } else if (options.useSafeRuleset) {
      log('✓ Using safe ruleset - all prompts will require confirmation')
    }

    if (options.useCoreToolset) {
      log('✓ Core toolset enabled')
    }
  } catch (error) {
    console.error('Error writing configuration file:', error)
    process.exit(1)
  }
}
