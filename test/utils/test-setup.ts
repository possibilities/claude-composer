import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

/**
 * Creates a temporary config directory for tests and returns the path.
 * This ensures tests don't use the user's actual config.
 */
export function createTempConfigDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), 'claude-composer-test-'))
}

/**
 * Creates a temporary config directory with an optional config file.
 * Returns the directory path and a cleanup function.
 */
export function setupTestConfig(configContent?: string): {
  configDir: string
  cleanup: () => void
} {
  const configDir = createTempConfigDir()

  if (configContent) {
    const configPath = path.join(configDir, 'config.yaml')
    fs.writeFileSync(configPath, configContent)
  }

  const cleanup = () => {
    fs.rmSync(configDir, { recursive: true, force: true })
  }

  return { configDir, cleanup }
}

/**
 * Default test environment variables that include a temporary config directory
 */
export function getTestEnv(configDir?: string): Record<string, string> {
  const dir = configDir || createTempConfigDir()
  return {
    CLAUDE_COMPOSER_CONFIG_DIR: dir,
  }
}
