import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import { ConfigManager } from '../../src/config/manager'
import { loadToolsetFile } from '../../src/config/loader'

vi.mock('fs')

describe('Internal Toolset Loading', () => {
  let configManager: ConfigManager

  beforeEach(() => {
    vi.clearAllMocks()
    ConfigManager.resetInstance()
    configManager = ConfigManager.getInstance()

    // Mock process.cwd()
    vi.spyOn(process, 'cwd').mockReturnValue('/test/project')

    // Mock environment variable
    vi.stubEnv('CLAUDE_COMPOSER_CONFIG_DIR', '/home/test/.claude-composer')

    // Mock fs.existsSync to return false by default
    vi.mocked(fs.existsSync).mockReturnValue(false)
  })

  afterEach(() => {
    vi.unstubAllEnvs()
  })

  describe('loadToolsetFile', () => {
    it('should load internal toolset when prefixed with internal:', async () => {
      const internalToolsetPath = path.join(
        __dirname,
        '..',
        '..',
        'src',
        'internal-toolsets',
        'core.yaml',
      )

      vi.mocked(fs.existsSync).mockImplementation(filePath => {
        return filePath === internalToolsetPath
      })

      vi.mocked(fs.readFileSync).mockImplementation(filePath => {
        if (filePath === internalToolsetPath) {
          return `
allowed:
  - mcp__context7__resolve-library-id
  - mcp__context7__get-library-docs

mcp:
  context7:
    type: stdio
    command: npx
    args:
      - -y
      - "@upstash/context7-mcp"
`
        }
        throw new Error('File not found')
      })

      const toolset = await loadToolsetFile('internal:core')

      expect(toolset).toEqual({
        allowed: [
          'mcp__context7__resolve-library-id',
          'mcp__context7__get-library-docs',
        ],
        mcp: {
          context7: {
            type: 'stdio',
            command: 'npx',
            args: ['-y', '@upstash/context7-mcp'],
          },
        },
      })
    })

    it('should load regular toolset when not prefixed with internal:', async () => {
      vi.mocked(fs.existsSync).mockImplementation(filePath => {
        return (
          filePath === '/home/test/.claude-composer/toolsets/mytoolset.yaml'
        )
      })

      vi.mocked(fs.readFileSync).mockImplementation(filePath => {
        if (
          filePath === '/home/test/.claude-composer/toolsets/mytoolset.yaml'
        ) {
          return `
allowed:
  - tool1
  - tool2
`
        }
        throw new Error('File not found')
      })

      const toolset = await loadToolsetFile('mytoolset')

      expect(toolset).toEqual({
        allowed: ['tool1', 'tool2'],
      })
    })

    it('should throw error when internal toolset not found', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false)

      await expect(loadToolsetFile('internal:nonexistent')).rejects.toThrow(
        'Toolset file not found',
      )
    })
  })

  describe('ConfigManager toolset loading', () => {
    it('should load internal toolsets through config', async () => {
      // Mock config file with internal toolset
      vi.mocked(fs.existsSync).mockImplementation(filePath => {
        return (
          filePath === '/test/project/.claude-composer/config.yaml' ||
          filePath.includes('internal-toolsets/core.yaml')
        )
      })

      vi.mocked(fs.readFileSync).mockImplementation(filePath => {
        if (filePath === '/test/project/.claude-composer/config.yaml') {
          return `
toolsets:
  - internal:core
`
        }
        if (filePath.includes('internal-toolsets/core.yaml')) {
          return `
allowed:
  - mcp__context7__resolve-library-id
  - mcp__context7__get-library-docs

mcp:
  context7:
    type: stdio
    command: npx
    args:
      - -y
      - "@upstash/context7-mcp"
`
        }
        throw new Error('File not found')
      })

      await configManager.loadConfig()
      const config = configManager.getAppConfig()

      expect(config.toolsets).toEqual(['internal:core'])

      // The toolset loading happens internally, so we just verify the config
    })

    it('should load mix of internal and regular toolsets', async () => {
      vi.mocked(fs.existsSync).mockImplementation(filePath => {
        return (
          filePath === '/test/project/.claude-composer/config.yaml' ||
          filePath.includes('internal-toolsets/core.yaml') ||
          filePath === '/home/test/.claude-composer/toolsets/custom.yaml'
        )
      })

      vi.mocked(fs.readFileSync).mockImplementation(filePath => {
        if (filePath === '/test/project/.claude-composer/config.yaml') {
          return `
toolsets:
  - internal:core
  - custom
`
        }
        if (filePath.includes('internal-toolsets/core.yaml')) {
          return `
allowed:
  - mcp__context7__resolve-library-id
`
        }
        if (filePath === '/home/test/.claude-composer/toolsets/custom.yaml') {
          return `
allowed:
  - custom-tool
`
        }
        throw new Error('File not found')
      })

      await configManager.loadConfig()
      const config = configManager.getAppConfig()

      expect(config.toolsets).toEqual(['internal:core', 'custom'])
    })
  })
})
