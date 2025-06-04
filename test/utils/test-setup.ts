import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

/**
 * Creates a temp config directory for tests and returns the path.
 * This ensures tests don't use the user's actual config.
 */
export function createTempConfigDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'claude-composer-test-'))
}

/**
 * Creates a temp config directory with an optional config file.
 * Returns the directory path and a cleanup function.
 */
export function setupTestConfig(configContent?: string): {
  configDirectory: string
  cleanup: () => void
} {
  const configDirectory = createTempConfigDir()

  if (configContent) {
    const configPath = path.join(configDirectory, 'config.yaml')
    fs.writeFileSync(configPath, configContent)
  }

  const cleanup = () => {
    fs.rmSync(configDirectory, { recursive: true, force: true })
  }

  return { configDirectory, cleanup }
}

/**
 * Default test environment variables that include a temp config directory
 */
export function getTestEnv(configDirectory?: string): Record<string, string> {
  const dir = configDirectory || createTempConfigDir()
  return {
    CLAUDE_COMPOSER_CONFIG_DIR: dir,
  }
}
