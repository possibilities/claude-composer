import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { runPreflight } from '../../src/core/preflight'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

describe('Preflight - Mode handling', () => {
  let tempDir: string
  let configPath: string
  let originalCwd: string

  beforeEach(() => {
    // Save original cwd
    originalCwd = process.cwd()

    // Create temp directory and change to it
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'preflight-mode-test-'))
    process.chdir(tempDir)

    // Create .git directory to simulate git repo
    fs.mkdirSync(path.join(tempDir, '.git'))

    configPath = path.join(tempDir, 'config.yaml')
  })

  afterEach(() => {
    // Restore original cwd
    process.chdir(originalCwd)

    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true })
    }
  })

  describe('CLI mode flag', () => {
    it('should use CLI --mode flag when provided', async () => {
      fs.writeFileSync(configPath, 'mode: act\n')

      const result = await runPreflight(
        ['node', 'claude-composer', '--mode', 'plan', 'chat'],
        {
          configPath,
        },
      )

      expect(result.appConfig.mode).toBe('plan')
    })

    it('should use config file mode when no CLI flag provided', async () => {
      fs.writeFileSync(configPath, 'mode: plan\n')

      const result = await runPreflight(['node', 'claude-composer', 'chat'], {
        configPath,
      })

      expect(result.appConfig.mode).toBe('plan')
    })

    it('should leave mode undefined when neither CLI nor config provide it', async () => {
      fs.writeFileSync(configPath, 'show_notifications: true\n')

      const result = await runPreflight(['node', 'claude-composer', 'chat'], {
        configPath,
      })

      expect(result.appConfig.mode).toBeUndefined()
    })

    it('should handle mode with equals syntax', async () => {
      fs.writeFileSync(configPath, 'show_notifications: true\n')

      const result = await runPreflight(
        ['node', 'claude-composer', '--mode=plan', 'chat'],
        {
          configPath,
        },
      )

      expect(result.appConfig.mode).toBe('plan')
    })
  })

  describe('childArgs handling', () => {
    it('should skip --mode flag in childArgs', async () => {
      fs.writeFileSync(configPath, 'show_notifications: true\n')

      const result = await runPreflight(
        [
          'node',
          'claude-composer',
          '--mode',
          'plan',
          '--quiet',
          'chat',
          'arg1',
        ],
        {
          configPath,
        },
      )

      // The --mode flag itself is included but the value 'plan' is skipped
      expect(result.childArgs).toEqual([
        '--mode',
        'plan',
        '--quiet',
        'chat',
        'arg1',
      ])
      expect(result.childArgs).toContain('--mode')
      expect(result.childArgs).toContain('plan')
    })

    it('should skip --mode with equals in childArgs', async () => {
      fs.writeFileSync(configPath, 'show_notifications: true\n')

      const result = await runPreflight(
        [
          'node',
          'claude-composer',
          '--mode=act',
          '--show-notifications',
          'chat',
        ],
        {
          configPath,
        },
      )

      expect(result.childArgs).toEqual([
        '--mode=act',
        '--show-notifications',
        'chat',
      ])
      expect(result.childArgs).toContain('--mode=act')
    })

    it('should handle mode flag at end of arguments', async () => {
      fs.writeFileSync(configPath, 'show_notifications: true\n')

      const result = await runPreflight(
        ['node', 'claude-composer', 'chat', '--mode', 'plan'],
        {
          configPath,
        },
      )

      expect(result.childArgs).toEqual(['chat', '--mode', 'plan'])
      expect(result.appConfig.mode).toBe('plan')
    })
  })

  describe('Mode value validation', () => {
    it('should accept mode act', async () => {
      fs.writeFileSync(configPath, 'yolo: false\n')

      const result = await runPreflight(
        ['node', 'claude-composer', '--mode', 'act'],
        {
          configPath,
        },
      )

      expect(result.appConfig.mode).toBe('act')
    })

    it('should accept mode plan', async () => {
      fs.writeFileSync(configPath, 'yolo: false\n')

      const result = await runPreflight(
        ['node', 'claude-composer', '--mode', 'plan'],
        {
          configPath,
        },
      )

      expect(result.appConfig.mode).toBe('plan')
    })
  })
})
