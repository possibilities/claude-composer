import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import * as fs from 'fs'
import * as path from 'path'
import * as os from 'os'
import { execSync } from 'child_process'
import {
  OutputFormatter,
  OutputFormatterError,
} from '../../src/core/output-formatter'

vi.mock('child_process', () => ({
  ...vi.importActual('child_process'),
  execSync: vi.fn(),
}))

describe('OutputFormatter', () => {
  let tempDir: string
  let formatterScript: string

  beforeEach(() => {
    // Create a temporary directory for test files
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'output-formatter-test-'))
    formatterScript = path.join(tempDir, 'formatter.sh')
  })

  afterEach(() => {
    // Clean up temp files
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true })
    }
  })

  describe('validate', () => {
    it('should throw error if script does not exist', async () => {
      const formatter = new OutputFormatter({
        scriptPath: '/non/existent/path/formatter.sh',
      })

      await expect(formatter.validate()).rejects.toThrow(OutputFormatterError)
      await expect(formatter.validate()).rejects.toThrow(
        'Output formatter script not found',
      )
    })

    it('should throw error if script is not executable', async () => {
      // Create a non-executable file
      fs.writeFileSync(formatterScript, '#!/bin/bash\ncat', { mode: 0o644 })

      const formatter = new OutputFormatter({
        scriptPath: formatterScript,
      })

      await expect(formatter.validate()).rejects.toThrow(OutputFormatterError)
      await expect(formatter.validate()).rejects.toThrow(
        'Output formatter script is not executable',
      )
    })

    it('should pass validation for executable script', async () => {
      // Create an executable file
      fs.writeFileSync(formatterScript, '#!/bin/bash\ncat', { mode: 0o755 })

      const formatter = new OutputFormatter({
        scriptPath: formatterScript,
      })

      await expect(formatter.validate()).resolves.not.toThrow()
    })

    it('should expand ~ in script path', async () => {
      // Mock home directory expansion
      const mockScript = '~/test-formatter.sh'
      const expandedPath = path.join(os.homedir(), 'test-formatter.sh')

      // Create the file
      fs.writeFileSync(expandedPath, '#!/bin/bash\ncat', { mode: 0o755 })

      const formatter = new OutputFormatter({
        scriptPath: mockScript,
      })

      await expect(formatter.validate()).resolves.not.toThrow()

      // Clean up
      fs.unlinkSync(expandedPath)
    })
  })

  describe('process lifecycle', () => {
    it('should start and stop formatter process', () => {
      // Create a simple executable script
      fs.writeFileSync(formatterScript, '#!/bin/bash\ncat', { mode: 0o755 })

      const formatter = new OutputFormatter({
        scriptPath: formatterScript,
      })

      expect(formatter.isRunning()).toBe(false)

      formatter.start()
      expect(formatter.isRunning()).toBe(true)

      formatter.stop()
      expect(formatter.isRunning()).toBe(false)
    })

    it('should handle multiple start calls gracefully', () => {
      fs.writeFileSync(formatterScript, '#!/bin/bash\ncat', { mode: 0o755 })

      const formatter = new OutputFormatter({
        scriptPath: formatterScript,
      })

      formatter.start()
      const firstRunning = formatter.isRunning()

      formatter.start() // Should not create another process
      const secondRunning = formatter.isRunning()

      expect(firstRunning).toBe(true)
      expect(secondRunning).toBe(true)

      formatter.stop()
    })
  })

  describe('createPassThrough', () => {
    it('should create a pass-through transform stream', async () => {
      const passThrough = OutputFormatter.createPassThrough()
      const testData = 'Hello, World!'

      const dataPromise = new Promise<string>(resolve => {
        passThrough.on('data', (chunk: Buffer) => {
          resolve(chunk.toString())
        })
      })

      passThrough.write(testData)

      const result = await dataPromise
      expect(result).toBe(testData)
    })
  })
})
