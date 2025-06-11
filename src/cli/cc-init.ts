import * as fs from 'fs'
import * as yaml from 'js-yaml'
import prompts from 'prompts'
import { CONFIG_PATHS } from '../config/paths.js'
import { log, warn } from '../utils/logging.js'

export interface CcInitOptions {
  useYolo?: boolean
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
      '  --use-yolo               Accept all prompts automatically (use with caution)',
    )
    console.log('  --use-core-toolset       Enable core toolset')
    console.log('  --no-use-core-toolset    Disable core toolset')
    console.log(
      '  --project                Create config in current directory (.claude-composer/config.yaml)',
    )
    console.log('  -h, --help               Show this help message')
    console.log('\nNotes:')
    console.log(
      '  - --use-core-toolset and --no-use-core-toolset are mutually exclusive',
    )
    process.exit(0)
  }

  // Parse command line arguments
  for (let i = 0; i < args.length; i++) {
    const arg = args[i]
    switch (arg) {
      case '--use-yolo':
        options.useYolo = true
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

  if (options.useCoreToolset && options.noUseCoreToolset) {
    console.error(
      'Error: --use-core-toolset and --no-use-core-toolset are mutually exclusive',
    )
    process.exit(1)
  }

  // Prompt for yolo mode if not specified
  if (options.useYolo === undefined) {
    const yoloResponse = await prompts(
      {
        type: 'confirm',
        name: 'useYolo',
        message:
          'Would you like to enable YOLO mode? (accepts all prompts automatically)',
        initial: false,
        hint: 'Use with caution - Claude will perform actions without confirmation',
      },
      {
        onCancel: () => {
          process.exit(130)
        },
      },
    )

    options.useYolo = yoloResponse.useYolo
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

  // Check if using --project without a global config
  if (options.project) {
    const globalConfigPath = CONFIG_PATHS.getConfigFilePath()
    if (!fs.existsSync(globalConfigPath)) {
      console.error(
        'Error: Cannot create project config without a global config.',
      )
      console.error(
        'Please run "claude-composer cc-init" first to create a global configuration.',
      )
      process.exit(1)
    }
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

  // Add yolo mode if requested
  if (options.useYolo) {
    config.yolo = true
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

    if (options.useYolo) {
      warn('⚠️  YOLO mode enabled - all prompts will be automatically accepted')
    } else {
      log('✓ YOLO mode disabled - all prompts will require confirmation')
    }

    if (options.useCoreToolset) {
      log('✓ Core toolset enabled')
    }
  } catch (error) {
    console.error('Error writing configuration file:', error)
    process.exit(1)
  }
}
