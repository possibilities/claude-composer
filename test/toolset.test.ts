import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'
import os from 'os'

const CLI_PATH = path.join(__dirname, '..', 'cli.ts')
const CONFIG_DIR = path.join(__dirname, 'tmp-home', '.claude-composer')
const TOOLSETS_DIR = path.join(CONFIG_DIR, 'toolsets')

describe('Toolset functionality', () => {
  beforeEach(async () => {
    await fs.promises.mkdir(TOOLSETS_DIR, { recursive: true })
  })

  afterEach(async () => {
    await fs.promises.rm(CONFIG_DIR, { recursive: true, force: true })
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
})
