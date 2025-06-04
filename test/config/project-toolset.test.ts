import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { loadToolsetFile } from '../../src/config/loader'
import type { ToolsetConfig } from '../../src/config/schemas'

// Mock fs module for internal toolset tests
vi.mock('fs', async () => {
  const actual = await vi.importActual<typeof fs>('fs')
  return {
    ...actual,
    existsSync: vi.fn(actual.existsSync),
    readFileSync: vi.fn(actual.readFileSync),
  }
})

describe('Project-level toolset loading', () => {
  let originalCwd: string
  let testProjectDir: string
  let projectToolsetsDir: string
  let testToolsetPath: string

  beforeEach(() => {
    // Save original cwd
    originalCwd = process.cwd()

    // Create temporary project directory
    testProjectDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'claude-composer-toolset-test-'),
    )

    // Create project structure
    projectToolsetsDir = path.join(
      testProjectDir,
      '.claude-composer',
      'toolsets',
    )
    fs.mkdirSync(projectToolsetsDir, { recursive: true })

    testToolsetPath = path.join(projectToolsetsDir, 'test-toolset.yaml')

    // Mock process.cwd to return our test directory
    vi.spyOn(process, 'cwd').mockReturnValue(testProjectDir)
  })

  afterEach(() => {
    // Restore original cwd mock
    vi.restoreAllMocks()

    // Clean up temporary directory
    try {
      if (fs.existsSync(testProjectDir)) {
        fs.rmSync(testProjectDir, { recursive: true, force: true })
      }
    } catch {}
  })

  it('should load toolset from project directory with project: prefix', async () => {
    const toolsetConfig: ToolsetConfig = {
      allowed: ['tool1', 'tool2'],
      disallowed: ['dangerous-tool'],
      mcp: {
        'test-server': {
          type: 'stdio',
          command: 'test-command',
          args: ['arg1'],
        },
      },
    }

    fs.writeFileSync(
      testToolsetPath,
      `
allowed:
  - tool1
  - tool2
disallowed:
  - dangerous-tool
mcp:
  test-server:
    type: stdio
    command: test-command
    args:
      - arg1
`,
    )

    const loaded = await loadToolsetFile('project:test-toolset')
    expect(loaded).toEqual(toolsetConfig)
  })

  it('should throw error if project toolset does not exist', async () => {
    await expect(loadToolsetFile('project:non-existent')).rejects.toThrow(
      'Toolset file not found:',
    )
  })

  it('should still support internal: prefix', async () => {
    // Mock the internal toolset files
    const originalExistsSync = vi.mocked(fs.existsSync).getMockImplementation()
    const originalReadFileSync = vi
      .mocked(fs.readFileSync)
      .getMockImplementation()

    vi.mocked(fs.existsSync).mockImplementation(filePath => {
      if (
        typeof filePath === 'string' &&
        filePath.includes('internal-toolsets/core.yaml')
      ) {
        return true
      }
      return originalExistsSync ? originalExistsSync(filePath) : false
    })

    vi.mocked(fs.readFileSync).mockImplementation((filePath, encoding) => {
      if (
        typeof filePath === 'string' &&
        filePath.includes('internal-toolsets/core.yaml')
      ) {
        return `mcp:
  filesystem:
    type: stdio
    command: node
    args: [/path/to/filesystem-server.js]`
      }
      return originalReadFileSync
        ? originalReadFileSync(filePath, encoding)
        : ''
    })

    // Test that internal toolsets still work
    const loaded = await loadToolsetFile('internal:core')
    expect(loaded).toBeDefined()
    expect(loaded.mcp).toBeDefined()

    // Restore mocks
    vi.mocked(fs.existsSync).mockImplementation(
      originalExistsSync || (() => false),
    )
    vi.mocked(fs.readFileSync).mockImplementation(
      originalReadFileSync || (() => ''),
    )
  })

  it('should validate project toolset configuration', async () => {
    // Write invalid toolset config
    fs.writeFileSync(
      testToolsetPath,
      `
invalid_field: true
allowed: "should be array"
`,
    )

    await expect(loadToolsetFile('project:test-toolset')).rejects.toThrow(
      'toolset configuration validation failed',
    )
  })

  it('should handle empty project toolset', async () => {
    fs.writeFileSync(testToolsetPath, '')

    const loaded = await loadToolsetFile('project:test-toolset')
    expect(loaded).toEqual({})
  })

  it('should handle project toolset with only allowed tools', async () => {
    fs.writeFileSync(
      testToolsetPath,
      `
allowed:
  - tool1
  - tool2
`,
    )

    const loaded = await loadToolsetFile('project:test-toolset')
    expect(loaded).toEqual({
      allowed: ['tool1', 'tool2'],
    })
  })
})
