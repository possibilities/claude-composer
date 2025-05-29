import { test, expect, describe, afterEach, beforeEach } from 'vitest'
import { spawn } from 'child_process'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'

describe('Default toolsets configuration', () => {
  const CLI_PATH = path.join(__dirname, '..', 'cli.ts')
  const MOCK_APP_PATH = path.join(__dirname, 'mock-child-app.ts')
  let testConfigDir: string

  beforeEach(() => {
    testConfigDir = fs.mkdtempSync(
      path.join(os.tmpdir(), 'claude-composer-default-toolsets-test-'),
    )
  })

  afterEach(() => {
    if (fs.existsSync(testConfigDir)) {
      fs.rmSync(testConfigDir, { recursive: true, force: true })
    }
  })

  test('loads default toolsets from config when no --toolset flag is provided', async () => {
    const toolsetsDir = path.join(testConfigDir, 'toolsets')
    fs.mkdirSync(toolsetsDir, { recursive: true })

    // Create toolset files
    fs.writeFileSync(
      path.join(toolsetsDir, 'core.yaml'),
      `allowed:
  - tool1
  - tool2
`,
    )

    fs.writeFileSync(
      path.join(toolsetsDir, 'extra.yaml'),
      `allowed:
  - tool3
disallowed:
  - dangerous-tool
`,
    )

    // Create config with default toolsets
    fs.writeFileSync(
      path.join(testConfigDir, 'config.yaml'),
      `toolsets:
  - core
  - extra
`,
    )

    const result = await new Promise<string>((resolve, reject) => {
      let output = ''

      const child = spawn(
        'tsx',
        [
          CLI_PATH,
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--echo-args',
        ],
        {
          env: {
            ...process.env,
            CLAUDE_APP_PATH: MOCK_APP_PATH,
            CLAUDE_COMPOSER_CONFIG_DIR: testConfigDir,
            CLAUDE_PATTERNS_PATH: './test/test-patterns',
          },
        },
      )

      child.stdout.on('data', data => {
        output += data.toString()
      })

      child.stderr.on('data', data => {
        output += data.toString()
      })

      child.on('exit', code => {
        if (code === 0) {
          resolve(output)
        } else {
          reject(new Error(`Process exited with code ${code}: ${output}`))
        }
      })
    })

    expect(result).toContain('※ Loaded toolset: core')
    expect(result).toContain('※ Loaded toolset: extra')
    expect(result).toContain('※ Toolset core allowed 2 tools')
    expect(result).toContain('※ Toolset extra allowed 1 tool')
    expect(result).toContain('※ Toolset extra disallowed 1 tool')
    expect(result).toContain('ARGS:')
    expect(result).toContain('--allowedTools tool1')
    expect(result).toContain('--allowedTools tool2')
    expect(result).toContain('--allowedTools tool3')
    expect(result).toContain('--disallowedTools dangerous-tool')
  })

  test('--toolset flag overrides default toolsets from config', async () => {
    const toolsetsDir = path.join(testConfigDir, 'toolsets')
    fs.mkdirSync(toolsetsDir, { recursive: true })

    // Create toolset files
    fs.writeFileSync(
      path.join(toolsetsDir, 'core.yaml'),
      `allowed:
  - tool1
  - tool2
`,
    )

    fs.writeFileSync(
      path.join(toolsetsDir, 'override.yaml'),
      `allowed:
  - override-tool
`,
    )

    // Create config with default toolsets
    fs.writeFileSync(
      path.join(testConfigDir, 'config.yaml'),
      `toolsets:
  - core
`,
    )

    const result = await new Promise<string>((resolve, reject) => {
      let output = ''

      const child = spawn(
        'tsx',
        [
          CLI_PATH,
          '--toolset',
          'override',
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--echo-args',
        ],
        {
          env: {
            ...process.env,
            CLAUDE_APP_PATH: MOCK_APP_PATH,
            CLAUDE_COMPOSER_CONFIG_DIR: testConfigDir,
            CLAUDE_PATTERNS_PATH: './test/test-patterns',
          },
        },
      )

      child.stdout.on('data', data => {
        output += data.toString()
      })

      child.stderr.on('data', data => {
        output += data.toString()
      })

      child.on('exit', code => {
        if (code === 0) {
          resolve(output)
        } else {
          reject(new Error(`Process exited with code ${code}: ${output}`))
        }
      })
    })

    // Should only load override toolset, not core
    expect(result).toContain('※ Loaded toolset: override')
    expect(result).not.toContain('※ Loaded toolset: core')
    expect(result).toContain('ARGS:')
    expect(result).toContain('--allowedTools override-tool')
    expect(result).not.toContain('tool1')
    expect(result).not.toContain('tool2')
  })

  test('errors if default toolset does not exist', async () => {
    // Create config with non-existent toolset
    fs.writeFileSync(
      path.join(testConfigDir, 'config.yaml'),
      `toolsets:
  - nonexistent
`,
    )

    const result = await new Promise<string>((resolve, reject) => {
      let output = ''

      const child = spawn(
        'tsx',
        [
          CLI_PATH,
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--echo-args',
        ],
        {
          env: {
            ...process.env,
            CLAUDE_APP_PATH: MOCK_APP_PATH,
            CLAUDE_COMPOSER_CONFIG_DIR: testConfigDir,
            CLAUDE_PATTERNS_PATH: './test/test-patterns',
          },
        },
      )

      child.stdout.on('data', data => {
        output += data.toString()
      })

      child.stderr.on('data', data => {
        output += data.toString()
      })

      child.on('exit', code => {
        if (code !== 0) {
          resolve(output)
        } else {
          reject(new Error(`Expected non-zero exit code but got ${code}`))
        }
      })
    })

    expect(result).toContain('※ Error:')
    expect(result).toContain('Toolset file not found')
    expect(result).toContain('nonexistent.yaml')
  })

  test('merges multiple default toolsets', async () => {
    const toolsetsDir = path.join(testConfigDir, 'toolsets')
    fs.mkdirSync(toolsetsDir, { recursive: true })

    // Create toolset files with MCP configs
    fs.writeFileSync(
      path.join(toolsetsDir, 'toolset1.yaml'),
      `allowed:
  - tool1
mcp:
  server1:
    command: server1-cmd
`,
    )

    fs.writeFileSync(
      path.join(toolsetsDir, 'toolset2.yaml'),
      `allowed:
  - tool2
disallowed:
  - bad-tool
mcp:
  server2:
    command: server2-cmd
`,
    )

    // Create config with multiple default toolsets
    fs.writeFileSync(
      path.join(testConfigDir, 'config.yaml'),
      `toolsets:
  - toolset1
  - toolset2
`,
    )

    const result = await new Promise<string>((resolve, reject) => {
      let output = ''

      const child = spawn(
        'tsx',
        [
          CLI_PATH,
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--echo-args',
        ],
        {
          env: {
            ...process.env,
            CLAUDE_APP_PATH: MOCK_APP_PATH,
            CLAUDE_COMPOSER_CONFIG_DIR: testConfigDir,
            CLAUDE_PATTERNS_PATH: './test/test-patterns',
          },
        },
      )

      child.stdout.on('data', data => {
        output += data.toString()
      })

      child.stderr.on('data', data => {
        output += data.toString()
      })

      child.on('exit', code => {
        if (code === 0) {
          resolve(output)
        } else {
          reject(new Error(`Process exited with code ${code}: ${output}`))
        }
      })
    })

    // Check that both toolsets are loaded
    expect(result).toContain('※ Loaded toolset: toolset1')
    expect(result).toContain('※ Loaded toolset: toolset2')
    expect(result).toContain('※ Toolset toolset1 configured 1 MCP server')
    expect(result).toContain('※ Toolset toolset2 configured 1 MCP server')

    // Check that tools are merged
    expect(result).toContain('ARGS:')
    expect(result).toContain('--allowedTools tool1')
    expect(result).toContain('--allowedTools tool2')
    expect(result).toContain('--disallowedTools bad-tool')

    // Check that MCP config is created
    expect(result).toContain('--mcp-config')
  })

  test('works with empty toolsets array in config', async () => {
    // Create config with empty toolsets array
    fs.writeFileSync(
      path.join(testConfigDir, 'config.yaml'),
      `toolsets: []
`,
    )

    const result = await new Promise<string>((resolve, reject) => {
      let output = ''

      const child = spawn(
        'tsx',
        [
          CLI_PATH,
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--echo-args',
        ],
        {
          env: {
            ...process.env,
            CLAUDE_APP_PATH: MOCK_APP_PATH,
            CLAUDE_COMPOSER_CONFIG_DIR: testConfigDir,
            CLAUDE_PATTERNS_PATH: './test/test-patterns',
          },
        },
      )

      child.stdout.on('data', data => {
        output += data.toString()
      })

      child.stderr.on('data', data => {
        output += data.toString()
      })

      child.on('exit', code => {
        if (code === 0) {
          resolve(output)
        } else {
          reject(new Error(`Process exited with code ${code}: ${output}`))
        }
      })
    })

    // Should not load any toolsets
    expect(result).not.toContain('※ Loaded toolset:')
    expect(result).toContain('ARGS:')
    expect(result).not.toContain('--allowedTools')
    expect(result).not.toContain('--disallowedTools')
  })

  test('works when no config file exists', async () => {
    const result = await new Promise<string>((resolve, reject) => {
      let output = ''

      const child = spawn(
        'tsx',
        [
          CLI_PATH,
          '--dangerously-allow-without-version-control',
          '--dangerously-allow-in-dirty-directory',
          '--echo-args',
        ],
        {
          env: {
            ...process.env,
            CLAUDE_APP_PATH: MOCK_APP_PATH,
            CLAUDE_COMPOSER_CONFIG_DIR: testConfigDir,
            CLAUDE_PATTERNS_PATH: './test/test-patterns',
          },
        },
      )

      child.stdout.on('data', data => {
        output += data.toString()
      })

      child.stderr.on('data', data => {
        output += data.toString()
      })

      child.on('exit', code => {
        if (code === 0) {
          resolve(output)
        } else {
          reject(new Error(`Process exited with code ${code}: ${output}`))
        }
      })
    })

    // Should work normally without loading any toolsets
    expect(result).not.toContain('※ Loaded toolset:')
    expect(result).toContain('ARGS:')
    expect(result).not.toContain('--allowedTools')
    expect(result).not.toContain('--disallowedTools')
  })
})
