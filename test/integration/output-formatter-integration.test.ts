import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { spawn } from 'child_process'

describe('Output Formatter Integration', () => {
  let tempDir: string
  let formatterScript: string
  let testOutput: string

  beforeEach(() => {
    // Create a temporary directory
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'formatter-integration-'))
    formatterScript = path.join(tempDir, 'test-formatter.sh')
    testOutput = path.join(tempDir, 'output.txt')

    // Create a simple formatter that uppercases input
    const formatterContent = `#!/bin/bash
# Test formatter that uppercases input
tr '[:lower:]' '[:upper:]'
`
    fs.writeFileSync(formatterScript, formatterContent, { mode: 0o755 })
  })

  afterEach(() => {
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true })
    }
  })

  it('should format output through external script', async () => {
    // Create a test message
    const testMessage = 'hello world from claude'

    // Run echo through our formatter
    const formatterProcess = spawn(formatterScript)

    let output = ''
    formatterProcess.stdout.on('data', data => {
      output += data.toString()
    })

    const exitPromise = new Promise<number>(resolve => {
      formatterProcess.on('exit', code => {
        resolve(code || 0)
      })
    })

    // Send input
    formatterProcess.stdin.write(testMessage)
    formatterProcess.stdin.end()

    // Wait for completion
    const exitCode = await exitPromise

    expect(exitCode).toBe(0)
    expect(output).toBe('HELLO WORLD FROM CLAUDE')
  })

  it('should handle multiline input', async () => {
    const multilineInput = `Line 1: hello
Line 2: world
Line 3: from claude`

    const formatterProcess = spawn(formatterScript)

    let output = ''
    formatterProcess.stdout.on('data', data => {
      output += data.toString()
    })

    const exitPromise = new Promise<number>(resolve => {
      formatterProcess.on('exit', code => {
        resolve(code || 0)
      })
    })

    formatterProcess.stdin.write(multilineInput)
    formatterProcess.stdin.end()

    const exitCode = await exitPromise

    expect(exitCode).toBe(0)
    expect(output).toBe(`LINE 1: HELLO
LINE 2: WORLD
LINE 3: FROM CLAUDE`)
  })

  it('should handle streaming input', async () => {
    const formatterProcess = spawn(formatterScript)

    let output = ''
    formatterProcess.stdout.on('data', data => {
      output += data.toString()
    })

    // Send data in chunks
    formatterProcess.stdin.write('hello ')
    await new Promise(resolve => setTimeout(resolve, 10))
    formatterProcess.stdin.write('world')
    formatterProcess.stdin.end()

    const exitPromise = new Promise<number>(resolve => {
      formatterProcess.on('exit', code => {
        resolve(code || 0)
      })
    })

    const exitCode = await exitPromise

    expect(exitCode).toBe(0)
    expect(output).toBe('HELLO WORLD')
  })
})
