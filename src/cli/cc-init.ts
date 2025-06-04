import * as fs from 'fs'
import * as yaml from 'js-yaml'
import { CONFIG_PATHS } from '../config/paths.js'
import { log, warn } from '../utils/logging.js'

export interface CcInitOptions {
  useYoloRuleset?: boolean
  useCautiousRuleset?: boolean
  useCoreToolset?: boolean
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
      '  --use-cautious-ruleset   Use cautious ruleset (default, requires confirmation for all prompts)',
    )
    console.log('  --use-core-toolset       Enable core toolset')
    console.log('  -h, --help               Show this help message')
    console.log(
      '\nNote: --use-yolo-ruleset and --use-cautious-ruleset are mutually exclusive',
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
      case '--use-core-toolset':
        options.useCoreToolset = true
        break
      default:
        if (arg.startsWith('-')) {
          console.error(`Unknown option: ${arg}`)
          process.exit(1)
        }
    }
  }

  // Validate mutually exclusive options
  if (options.useYoloRuleset && options.useCautiousRuleset) {
    console.error(
      'Error: --use-yolo-ruleset and --use-cautious-ruleset are mutually exclusive',
    )
    process.exit(1)
  }

  // Default to cautious if no ruleset specified
  if (!options.useYoloRuleset && !options.useCautiousRuleset) {
    options.useCautiousRuleset = true
  }

  // Check if config file already exists
  const configPath = CONFIG_PATHS.getConfigFilePath()
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
  }

  // Add toolsets if requested
  if (options.useCoreToolset) {
    config.toolsets = ['internal:core']
  }

  // Ensure config directory exists
  const configDir = CONFIG_PATHS.getConfigDirectory()
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
    } else {
      log('✓ Using cautious ruleset - all prompts will require confirmation')
    }

    if (options.useCoreToolset) {
      log('✓ Core toolset enabled')
    }
  } catch (error) {
    console.error('Error writing configuration file:', error)
    process.exit(1)
  }
}
