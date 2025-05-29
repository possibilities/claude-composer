import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'

const CLI_PATH = path.join(__dirname, '..', 'cli.ts')
const TEST_ID = `test-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
const CONFIG_DIR = path.join(os.tmpdir(), TEST_ID, '.claude-composer')
const TOOLSETS_DIR = path.join(CONFIG_DIR, 'toolsets')

describe('Toolset functionality', () => {
  beforeEach(async () => {
    await fs.promises.mkdir(TOOLSETS_DIR, { recursive: true })
  })

  afterEach(async () => {
    await fs.promises.rm(path.join(os.tmpdir(), TEST_ID), {
      recursive: true,
      force: true,
    })
  })

  it('should load toolset and pass allowed tools to child app', async () => {
    const toolsetContent = `allowed:
  - foo
  - bar
`
    await fs.promises.writeFile(
      path.join(TOOLSETS_DIR, 'test-allowed.yaml'),
      toolsetContent,
    )

    const child = spawn(
      'tsx',
      [
        CLI_PATH,
        '--dangerously-allow-without-version-control',
        '--dangerously-allow-in-dirty-directory',
        '--toolset',
        'test-allowed',
        '--echo-args',
      ],
      {
        cwd: path.join(__dirname, '..'),
        env: {
          ...process.env,
          CLAUDE_COMPOSER_CONFIG_DIR: CONFIG_DIR,
          CLAUDE_APP_PATH: path.join(__dirname, 'mock-child-app.ts'),
          CLAUDE_PATTERNS_PATH: './test/test-patterns',
        },
      },
    )

    const output = await new Promise<string>(resolve => {
      let data = ''
      child.stdout.on('data', chunk => {
        data += chunk.toString()
      })
      child.stderr.on('data', chunk => {
        data += chunk.toString()
      })
      child.on('close', () => {
        resolve(data)
      })
    })

    expect(output).toContain('※ Loaded toolset: test-allowed')
    expect(output).toContain('※ Toolset test-allowed allowed 2 tools')
    expect(output).toContain('ARGS:')
    expect(output).toContain('--echo-args')
    expect(output).toContain('--allowedTools foo')
    expect(output).toContain('--allowedTools bar')
  })

  it('should load toolset and pass disallowed tools to child app', async () => {
    const toolsetContent = `disallowed:
  - baz
  - buz
`
    await fs.promises.writeFile(
      path.join(TOOLSETS_DIR, 'test-disallowed.yaml'),
      toolsetContent,
    )

    const child = spawn(
      'tsx',
      [
        CLI_PATH,
        '--dangerously-allow-without-version-control',
        '--dangerously-allow-in-dirty-directory',
        '--toolset',
        'test-disallowed',
        '--echo-args',
      ],
      {
        cwd: path.join(__dirname, '..'),
        env: {
          ...process.env,
          CLAUDE_COMPOSER_CONFIG_DIR: CONFIG_DIR,
          CLAUDE_APP_PATH: path.join(__dirname, 'mock-child-app.ts'),
          CLAUDE_PATTERNS_PATH: './test/test-patterns',
        },
      },
    )

    const output = await new Promise<string>(resolve => {
      let data = ''
      child.stdout.on('data', chunk => {
        data += chunk.toString()
      })
      child.stderr.on('data', chunk => {
        data += chunk.toString()
      })
      child.on('close', () => {
        resolve(data)
      })
    })

    expect(output).toContain('※ Loaded toolset: test-disallowed')
    expect(output).toContain('※ Toolset test-disallowed disallowed 2 tools')
    expect(output).toContain('ARGS:')
    expect(output).toContain('--echo-args')
    expect(output).toContain('--disallowedTools baz')
    expect(output).toContain('--disallowedTools buz')
  })

  it('should load toolset with both allowed and disallowed tools', async () => {
    const toolsetContent = `allowed:
  - foo
  - bar
disallowed:
  - baz
  - buz
`
    await fs.promises.writeFile(
      path.join(TOOLSETS_DIR, 'test-both.yaml'),
      toolsetContent,
    )

    const child = spawn(
      'tsx',
      [
        CLI_PATH,
        '--dangerously-allow-without-version-control',
        '--dangerously-allow-in-dirty-directory',
        '--toolset',
        'test-both',
        '--echo-args',
      ],
      {
        cwd: path.join(__dirname, '..'),
        env: {
          ...process.env,
          CLAUDE_COMPOSER_CONFIG_DIR: CONFIG_DIR,
          CLAUDE_APP_PATH: path.join(__dirname, 'mock-child-app.ts'),
          CLAUDE_PATTERNS_PATH: './test/test-patterns',
        },
      },
    )

    const output = await new Promise<string>(resolve => {
      let data = ''
      child.stdout.on('data', chunk => {
        data += chunk.toString()
      })
      child.stderr.on('data', chunk => {
        data += chunk.toString()
      })
      child.on('close', () => {
        resolve(data)
      })
    })

    expect(output).toContain('※ Loaded toolset: test-both')
    expect(output).toContain('※ Toolset test-both allowed 2 tools')
    expect(output).toContain('※ Toolset test-both disallowed 2 tools')
    expect(output).toContain('ARGS:')
    expect(output).toContain('--echo-args')
    expect(output).toContain('--allowedTools foo')
    expect(output).toContain('--allowedTools bar')
    expect(output).toContain('--disallowedTools baz')
    expect(output).toContain('--disallowedTools buz')
  })

  it('should handle tools with spaces correctly', async () => {
    const toolsetContent = `allowed:
  - "tool with spaces"
  - regular-tool
`
    await fs.promises.writeFile(
      path.join(TOOLSETS_DIR, 'test-spaces.yaml'),
      toolsetContent,
    )

    const child = spawn(
      'tsx',
      [
        CLI_PATH,
        '--dangerously-allow-without-version-control',
        '--dangerously-allow-in-dirty-directory',
        '--toolset',
        'test-spaces',
        '--echo-args',
      ],
      {
        cwd: path.join(__dirname, '..'),
        env: {
          ...process.env,
          CLAUDE_COMPOSER_CONFIG_DIR: CONFIG_DIR,
          CLAUDE_APP_PATH: path.join(__dirname, 'mock-child-app.ts'),
          CLAUDE_PATTERNS_PATH: './test/test-patterns',
        },
      },
    )

    const output = await new Promise<string>(resolve => {
      let data = ''
      child.stdout.on('data', chunk => {
        data += chunk.toString()
      })
      child.stderr.on('data', chunk => {
        data += chunk.toString()
      })
      child.on('close', () => {
        resolve(data)
      })
    })

    expect(output).toContain('※ Loaded toolset: test-spaces')
    expect(output).toContain('※ Toolset test-spaces allowed 2 tools')
    expect(output).toContain('ARGS:')
    expect(output).toContain('--echo-args')
    expect(output).toContain('--allowedTools tool with spaces')
    expect(output).toContain('--allowedTools regular-tool')
  })

  it('should error when toolset file does not exist', async () => {
    const child = spawn(
      'tsx',
      [
        CLI_PATH,
        '--dangerously-allow-without-version-control',
        '--dangerously-allow-in-dirty-directory',
        '--toolset',
        'non-existent',
        '--echo-args',
      ],
      {
        cwd: path.join(__dirname, '..'),
        env: {
          ...process.env,
          CLAUDE_COMPOSER_CONFIG_DIR: CONFIG_DIR,
          CLAUDE_APP_PATH: path.join(__dirname, 'mock-child-app.ts'),
          CLAUDE_PATTERNS_PATH: './test/test-patterns',
        },
      },
    )

    const output = await new Promise<string>(resolve => {
      let data = ''
      let stderr = ''
      child.stdout.on('data', chunk => {
        data += chunk.toString()
      })
      child.stderr.on('data', chunk => {
        stderr += chunk.toString()
      })
      child.on('close', () => {
        resolve(data + stderr)
      })
    })

    expect(output).toContain('Error: Toolset file not found')
    expect(output).toContain('non-existent.yaml')
  })

  it('should error when toolset file has invalid YAML', async () => {
    const toolsetContent = `invalid yaml content
  - this is not valid
    yaml:
`
    await fs.promises.writeFile(
      path.join(TOOLSETS_DIR, 'invalid.yaml'),
      toolsetContent,
    )

    const child = spawn(
      'tsx',
      [
        CLI_PATH,
        '--dangerously-allow-without-version-control',
        '--dangerously-allow-in-dirty-directory',
        '--toolset',
        'invalid',
        '--echo-args',
      ],
      {
        cwd: path.join(__dirname, '..'),
        env: {
          ...process.env,
          CLAUDE_COMPOSER_CONFIG_DIR: CONFIG_DIR,
          CLAUDE_APP_PATH: path.join(__dirname, 'mock-child-app.ts'),
          CLAUDE_PATTERNS_PATH: './test/test-patterns',
        },
      },
    )

    const output = await new Promise<string>(resolve => {
      let data = ''
      let stderr = ''
      child.stdout.on('data', chunk => {
        data += chunk.toString()
      })
      child.stderr.on('data', chunk => {
        stderr += chunk.toString()
      })
      child.on('close', () => {
        resolve(data + stderr)
      })
    })

    expect(output).toContain('Error: Error loading toolset file')
  })

  it('should create MCP config file and pass --mcp-config to child app', async () => {
    const toolsetContent = `mcp:
  commit-composer:
    type: stdio
    command: commit-composer-mcp
  another-server:
    type: http
    url: http://localhost:3000
`
    await fs.promises.writeFile(
      path.join(TOOLSETS_DIR, 'test-mcp.yaml'),
      toolsetContent,
    )

    const child = spawn(
      'tsx',
      [
        CLI_PATH,
        '--dangerously-allow-without-version-control',
        '--dangerously-allow-in-dirty-directory',
        '--toolset',
        'test-mcp',
        '--echo-args',
      ],
      {
        cwd: path.join(__dirname, '..'),
        env: {
          ...process.env,
          CLAUDE_COMPOSER_CONFIG_DIR: CONFIG_DIR,
          CLAUDE_APP_PATH: path.join(__dirname, 'mock-child-app.ts'),
          CLAUDE_PATTERNS_PATH: './test/test-patterns',
        },
      },
    )

    const output = await new Promise<string>(resolve => {
      let data = ''
      child.stdout.on('data', chunk => {
        data += chunk.toString()
      })
      child.stderr.on('data', chunk => {
        data += chunk.toString()
      })
      child.on('close', () => {
        resolve(data)
      })
    })

    expect(output).toContain('※ Loaded toolset: test-mcp')
    expect(output).toContain('※ Toolset test-mcp configured 2 MCP servers')
    expect(output).toContain('ARGS:')
    expect(output).toContain('--echo-args')

    // Check that the output contains the MCP config argument
    const argsMatch = output.match(/ARGS: (.+)/)
    expect(argsMatch).toBeTruthy()

    if (argsMatch) {
      const args = argsMatch[1]
      expect(args).toContain('--mcp-config')
      expect(args).toContain('/tmp/claude-composer-mcp-')

      // Extract the MCP config path
      const mcpConfigMatch = args.match(
        /--mcp-config (\/tmp\/claude-composer-mcp-[^\s]+\.json)/,
      )
      expect(mcpConfigMatch).toBeTruthy()

      if (mcpConfigMatch) {
        const mcpConfigPath = mcpConfigMatch[1]
        // The file might have been cleaned up already, so we just verify the path format
        expect(mcpConfigPath).toMatch(
          /^\/tmp\/claude-composer-mcp-\d+-\w+\.json$/,
        )
      }
    }
  })

  it('should handle toolset with all features combined', async () => {
    const toolsetContent = `allowed:
  - tool1
  - tool2
disallowed:
  - badtool
mcp:
  my-mcp:
    type: stdio
    command: my-mcp-server
`
    await fs.promises.writeFile(
      path.join(TOOLSETS_DIR, 'test-combined.yaml'),
      toolsetContent,
    )

    const child = spawn(
      'tsx',
      [
        CLI_PATH,
        '--dangerously-allow-without-version-control',
        '--dangerously-allow-in-dirty-directory',
        '--toolset',
        'test-combined',
        '--echo-args',
      ],
      {
        cwd: path.join(__dirname, '..'),
        env: {
          ...process.env,
          CLAUDE_COMPOSER_CONFIG_DIR: CONFIG_DIR,
          CLAUDE_APP_PATH: path.join(__dirname, 'mock-child-app.ts'),
          CLAUDE_PATTERNS_PATH: './test/test-patterns',
        },
      },
    )

    const output = await new Promise<string>(resolve => {
      let data = ''
      child.stdout.on('data', chunk => {
        data += chunk.toString()
      })
      child.stderr.on('data', chunk => {
        data += chunk.toString()
      })
      child.on('close', () => {
        resolve(data)
      })
    })

    expect(output).toContain('※ Loaded toolset: test-combined')
    expect(output).toContain('※ Toolset test-combined allowed 2 tools')
    expect(output).toContain('※ Toolset test-combined disallowed 1 tool')
    expect(output).toContain('※ Toolset test-combined configured 1 MCP server')
    expect(output).toContain('ARGS:')
    expect(output).toContain('--allowedTools tool1')
    expect(output).toContain('--allowedTools tool2')
    expect(output).toContain('--disallowedTools badtool')
    expect(output).toContain('--mcp-config /tmp/claude-composer-mcp-')
  })

  it('should not pass --toolset option to child app', async () => {
    const toolsetContent = `allowed:
  - sometool
`
    await fs.promises.writeFile(
      path.join(TOOLSETS_DIR, 'test-not-passed.yaml'),
      toolsetContent,
    )

    const child = spawn(
      'tsx',
      [
        CLI_PATH,
        '--dangerously-allow-without-version-control',
        '--dangerously-allow-in-dirty-directory',
        '--toolset',
        'test-not-passed',
        '--echo-args',
      ],
      {
        cwd: path.join(__dirname, '..'),
        env: {
          ...process.env,
          CLAUDE_COMPOSER_CONFIG_DIR: CONFIG_DIR,
          CLAUDE_APP_PATH: path.join(__dirname, 'mock-child-app.ts'),
          CLAUDE_PATTERNS_PATH: './test/test-patterns',
        },
      },
    )

    const output = await new Promise<string>(resolve => {
      let data = ''
      child.stdout.on('data', chunk => {
        data += chunk.toString()
      })
      child.stderr.on('data', chunk => {
        data += chunk.toString()
      })
      child.on('close', () => {
        resolve(data)
      })
    })

    expect(output).toContain('※ Loaded toolset: test-not-passed')
    expect(output).toContain('ARGS:')
    // Should not contain --toolset in the arguments passed to child
    expect(output).not.toMatch(/ARGS:.*--toolset/s)
    // Should still contain the expanded toolset args
    expect(output).toContain('--allowedTools sometool')
  })
})
