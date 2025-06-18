import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { spawn, ChildProcess, execSync } from 'child_process'
import { Transform, Readable, Writable } from 'stream'
import { expandPath } from '../utils/file-utils.js'

export class OutputFormatterError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OutputFormatterError'
  }
}

export interface OutputFormatterOptions {
  command: string
  env?: NodeJS.ProcessEnv
}

export class OutputFormatter {
  private formatterProcess: ChildProcess | null = null
  private command: string
  private env: NodeJS.ProcessEnv

  constructor(options: OutputFormatterOptions) {
    this.command = options.command
    this.env = options.env || process.env
  }

  /**
   * Validate that the formatter command can be executed
   */
  async validate(): Promise<void> {
    // For simple validation, we'll just check if we can spawn the command
    // The actual error will be caught when we try to use it
    // This avoids issues with commands that don't support --version or might exit with non-zero
    if (!this.command || this.command.trim() === '') {
      throw new OutputFormatterError('Output formatter command cannot be empty')
    }
    // No further validation - let it fail at runtime if the command doesn't exist
  }

  /**
   * Start the formatter process
   */
  start(): void {
    if (this.formatterProcess) {
      return // Already started
    }

    // Use shell to execute the command, which allows for commands with arguments
    // Set various environment variables to encourage color output
    const formatterEnv = {
      ...this.env,
      FORCE_COLOR: '1',
      CLICOLOR_FORCE: '1',
      COLORTERM: 'truecolor',
      TERM: process.env.TERM || 'xterm-256color',
      // Specific to jq
      JQ_COLORS: '0;90:0;37:0;37:0;37:0;32:1;37:1;37',
    }

    this.formatterProcess = spawn(this.command, [], {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: formatterEnv,
      shell: true,
    })

    // Handle formatter errors
    this.formatterProcess.on('error', error => {
      console.error(`Output formatter error: ${error.message}`)
    })

    // Forward stderr from formatter to our stderr
    if (this.formatterProcess.stderr) {
      this.formatterProcess.stderr.pipe(process.stderr)
    }
  }

  /**
   * Stop the formatter process
   */
  stop(): void {
    if (this.formatterProcess) {
      this.formatterProcess.kill()
      this.formatterProcess = null
    }
  }

  /**
   * Get a transform stream that pipes data through the formatter
   */
  getTransformStream(): Transform {
    const formatter = this

    return new Transform({
      transform(chunk: Buffer, encoding: string, callback: Function) {
        if (!formatter.formatterProcess || formatter.formatterProcess.killed) {
          // If formatter is not running, pass through unchanged
          callback(null, chunk)
          return
        }

        // Write to formatter stdin
        if (formatter.formatterProcess.stdin) {
          formatter.formatterProcess.stdin.write(
            chunk,
            encoding as BufferEncoding,
          )
        }

        // Don't push anything here - the formatter process will handle output
        callback()
      },

      flush(callback: Function) {
        // Close stdin when done to signal EOF to the formatter
        if (formatter.formatterProcess?.stdin) {
          formatter.formatterProcess.stdin.end()
        }
        callback()
      },
    })
  }

  /**
   * Get the stdout stream from the formatter process
   */
  getOutputStream(): NodeJS.ReadableStream | null {
    return this.formatterProcess?.stdout || null
  }

  /**
   * Get the stdin stream from the formatter process
   */
  getInputStream(): NodeJS.WritableStream | null {
    return this.formatterProcess?.stdin || null
  }

  /**
   * Check if the formatter is running
   */
  isRunning(): boolean {
    return this.formatterProcess !== null && !this.formatterProcess.killed
  }

  /**
   * Create a pass-through formatter for when no formatting is needed
   */
  static createPassThrough(): Transform {
    return new Transform({
      transform(chunk: Buffer, encoding: string, callback: Function) {
        callback(null, chunk)
      },
    })
  }
}
