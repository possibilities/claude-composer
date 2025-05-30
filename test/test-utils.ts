import { spawn, ChildProcess } from 'child_process'
import * as path from 'path'

export interface CliResult {
  stdout: string
  stderr: string
  output: string // Combined stdout and stderr
  exitCode: number
}

export interface RunCliOptions {
  args?: string[]
  cwd?: string
  env?: Record<string, string>
  timeout?: number // Default: 3000ms
  mockAppPath?: string
}

export interface InteractiveRunOptions extends RunCliOptions {
  interactions?: Array<{
    waitFor: string | RegExp
    respond: string
  }>
}

const CLI_PATH = path.join(process.cwd(), 'cli.ts')
const DEFAULT_MOCK_APP_PATH = path.join(
  process.cwd(),
  'test',
  'mock-child-app.ts',
)

/**
 * Run the CLI with given arguments and wait for it to exit naturally.
 * Uses a safety timeout to prevent hanging tests.
 */
export function runCli(options: RunCliOptions = {}): Promise<CliResult> {
  const {
    args = [],
    cwd = process.cwd(),
    env = {},
    timeout = 3000,
    mockAppPath = DEFAULT_MOCK_APP_PATH,
  } = options

  return new Promise((resolve, reject) => {
    const child = spawn('tsx', [CLI_PATH, ...args], {
      cwd,
      env: {
        ...process.env,
        CLAUDE_APP_PATH: mockAppPath,
        ...env,
      },
    })

    let stdout = ''
    let stderr = ''

    child.stdout.on('data', data => {
      stdout += data.toString()
    })

    child.stderr.on('data', data => {
      stderr += data.toString()
    })

    child.on('error', err => {
      reject(err)
    })

    // Safety timeout for hanging processes
    const timeoutHandle = setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGTERM')
        reject(
          new Error(`Test timeout: process did not exit within ${timeout}ms`),
        )
      }
    }, timeout)

    child.on('exit', code => {
      clearTimeout(timeoutHandle)
      resolve({
        stdout,
        stderr,
        output: stdout + stderr,
        exitCode: code || 0,
      })
    })
  })
}

/**
 * Run the CLI with interactive input support
 */
export function runCliInteractive(
  options: InteractiveRunOptions = {},
): Promise<CliResult> {
  const {
    args = [],
    cwd = process.cwd(),
    env = {},
    timeout = 3000,
    mockAppPath = DEFAULT_MOCK_APP_PATH,
    interactions = [],
  } = options

  return new Promise((resolve, reject) => {
    const child = spawn('tsx', [CLI_PATH, ...args], {
      cwd,
      env: {
        ...process.env,
        CLAUDE_APP_PATH: mockAppPath,
        ...env,
      },
    })

    let stdout = ''
    let stderr = ''
    let allOutput = ''
    let interactionIndex = 0

    const checkInteractions = () => {
      if (interactionIndex >= interactions.length) return

      const interaction = interactions[interactionIndex]
      const pattern = interaction.waitFor
      const shouldRespond =
        typeof pattern === 'string'
          ? allOutput.includes(pattern)
          : pattern.test(allOutput)

      if (shouldRespond) {
        child.stdin.write(interaction.respond)
        interactionIndex++
      }
    }

    child.stdout.on('data', data => {
      const text = data.toString()
      stdout += text
      allOutput += text
      checkInteractions()
    })

    child.stderr.on('data', data => {
      const text = data.toString()
      stderr += text
      allOutput += text
      checkInteractions()
    })

    child.on('error', err => {
      reject(err)
    })

    // Safety timeout for hanging processes
    const timeoutHandle = setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGTERM')
        reject(
          new Error(`Test timeout: process did not exit within ${timeout}ms`),
        )
      }
    }, timeout)

    child.on('exit', code => {
      clearTimeout(timeoutHandle)
      resolve({
        stdout,
        stderr,
        output: stdout + stderr,
        exitCode: code || 0,
      })
    })
  })
}

/**
 * Run the CLI using pnpm (for tests that need pnpm specifically)
 */
export function runCliWithPnpm(
  options: RunCliOptions = {},
): Promise<CliResult & { process: ChildProcess }> {
  const {
    args = [],
    cwd = process.cwd(),
    env = {},
    timeout = 3000,
    mockAppPath = DEFAULT_MOCK_APP_PATH,
  } = options

  return new Promise((resolve, reject) => {
    const child = spawn('pnpm', ['tsx', CLI_PATH, ...args], {
      cwd,
      env: {
        ...process.env,
        CLAUDE_APP_PATH: mockAppPath,
        ...env,
      },
    })

    let stdout = ''
    let stderr = ''

    child.stdout?.on('data', data => {
      stdout += data.toString()
    })

    child.stderr?.on('data', data => {
      stderr += data.toString()
    })

    child.on('error', err => {
      reject(err)
    })

    // Safety timeout for hanging processes
    const timeoutHandle = setTimeout(() => {
      if (!child.killed) {
        child.kill('SIGTERM')
        reject(
          new Error(`Test timeout: process did not exit within ${timeout}ms`),
        )
      }
    }, timeout)

    child.on('exit', code => {
      clearTimeout(timeoutHandle)
      resolve({
        stdout,
        stderr,
        output: stdout + stderr,
        exitCode: code || 0,
        process: child,
      })
    })
  })
}
