import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { spawn } from 'child_process'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'

const CLI_PATH = path.join(process.cwd(), 'cli.ts')
const MOCK_APP_PATH = path.join(process.cwd(), 'test', 'mock-child-app.ts')

describe('Version Control Check', () => {
  let testDir: string

  beforeEach(() => {
    // Create a temporary directory for testing
    testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-composer-test-'))
  })

  afterEach(() => {
    // Clean up the temporary directory
    fs.rmSync(testDir, { recursive: true, force: true })
  })

  it('should exit when no git directory exists and user responds no', done => {
    const child = spawn('tsx', [CLI_PATH], {
      cwd: testDir,
      env: {
        ...process.env,
        CLAUDE_APP_PATH: MOCK_APP_PATH,
      },
    })

    let output = ''
    child.stderr.on('data', data => {
      output += data.toString()
    })

    child.stdout.on('data', data => {
      output += data.toString()
      // When we see the prompt, respond with 'n'
      if (output.includes('Do you want to continue? (y/N):')) {
        child.stdin.write('n\n')
      }
    })

    child.on('exit', code => {
      expect(code).toBe(1)
      expect(output).toContain('Running in project without version control')
      expect(output).toContain('Exiting: Version control is required')
      done()
    })
  })

  it('should continue when no git directory exists and user responds yes', done => {
    const child = spawn('tsx', [CLI_PATH], {
      cwd: testDir,
      env: {
        ...process.env,
        CLAUDE_APP_PATH: MOCK_APP_PATH,
      },
    })

    let output = ''
    child.stderr.on('data', data => {
      output += data.toString()
    })

    child.stdout.on('data', data => {
      output += data.toString()
      // When we see the prompt, respond with 'y'
      if (output.includes('Do you want to continue? (y/N):')) {
        child.stdin.write('y\n')
      }
    })

    child.on('exit', code => {
      expect(code).toBe(0)
      expect(output).toContain('Running in project without version control')
      expect(output).toContain(
        'Dangerously running in project without version control',
      )
      expect(output).toContain('Ready, Passing off control to Claude CLI')
      done()
    })

    // Kill the process after a short delay to simulate normal exit
    setTimeout(() => {
      child.kill()
    }, 100)
  })

  it('should skip prompt when --dangerously-allow-without-version-control flag is used', done => {
    const child = spawn(
      'tsx',
      [CLI_PATH, '--dangerously-allow-without-version-control'],
      {
        cwd: testDir,
        env: {
          ...process.env,
          CLAUDE_APP_PATH: MOCK_APP_PATH,
        },
      },
    )

    let output = ''
    child.stderr.on('data', data => {
      output += data.toString()
    })

    child.stdout.on('data', data => {
      output += data.toString()
    })

    child.on('exit', code => {
      expect(code).toBe(0)
      expect(output).not.toContain('Do you want to continue?')
      expect(output).toContain(
        'Dangerously running in project without version control',
      )
      expect(output).toContain('Ready, Passing off control to Claude CLI')
      done()
    })

    // Kill the process after a short delay to simulate normal exit
    setTimeout(() => {
      child.kill()
    }, 100)
  })

  it('should proceed normally when git directory exists', done => {
    // Create a .git directory in the test directory
    fs.mkdirSync(path.join(testDir, '.git'))

    const child = spawn('tsx', [CLI_PATH], {
      cwd: testDir,
      env: {
        ...process.env,
        CLAUDE_APP_PATH: MOCK_APP_PATH,
      },
    })

    let output = ''
    child.stderr.on('data', data => {
      output += data.toString()
    })

    child.stdout.on('data', data => {
      output += data.toString()
    })

    child.on('exit', code => {
      expect(code).toBe(0)
      expect(output).not.toContain('Running in project without version control')
      expect(output).not.toContain(
        'Dangerously running in project without version control',
      )
      expect(output).toContain('Ready, Passing off control to Claude CLI')
      done()
    })

    // Kill the process after a short delay to simulate normal exit
    setTimeout(() => {
      child.kill()
    }, 100)
  })

  it('should skip prompt when dangerously_allow_without_version_control is set in config', done => {
    // Create config directory and file
    const configDir = path.join(os.homedir(), '.claude-composer')
    const configPath = path.join(configDir, 'config.yaml')

    // Save original config if it exists
    let originalConfig: string | null = null
    if (fs.existsSync(configPath)) {
      originalConfig = fs.readFileSync(configPath, 'utf8')
    }

    // Create test config
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true })
    }
    fs.writeFileSync(
      configPath,
      'dangerously_allow_without_version_control: true\n',
    )

    const child = spawn('tsx', [CLI_PATH], {
      cwd: testDir,
      env: {
        ...process.env,
        CLAUDE_APP_PATH: MOCK_APP_PATH,
      },
    })

    let output = ''
    child.stderr.on('data', data => {
      output += data.toString()
    })

    child.stdout.on('data', data => {
      output += data.toString()
    })

    child.on('exit', code => {
      // Restore original config
      if (originalConfig !== null) {
        fs.writeFileSync(configPath, originalConfig)
      } else {
        fs.unlinkSync(configPath)
      }

      expect(code).toBe(0)
      expect(output).not.toContain('Do you want to continue?')
      expect(output).toContain(
        'Dangerously running in project without version control',
      )
      expect(output).toContain('Ready, Passing off control to Claude CLI')
      done()
    })

    // Kill the process after a short delay to simulate normal exit
    setTimeout(() => {
      child.kill()
    }, 100)
  })
})
