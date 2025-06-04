import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import { isFileInProjectRoot } from '../../src/utils/file-utils'

describe('File Utils', () => {
  describe('isFileInProjectRoot', () => {
    const originalCwd = process.cwd()
    let testDir: string

    beforeEach(() => {
      // Create a temp test directory
      testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-utils-test-'))
      process.chdir(testDir)
    })

    afterEach(() => {
      process.chdir(originalCwd)
      fs.rmSync(testDir, { recursive: true, force: true })
    })

    it('should identify relative files as in project root', () => {
      expect(isFileInProjectRoot('file.txt')).toBe(true)
      expect(isFileInProjectRoot('./file.txt')).toBe(true)
      expect(isFileInProjectRoot('src/file.txt')).toBe(true)
      expect(isFileInProjectRoot('./src/file.txt')).toBe(true)
      expect(isFileInProjectRoot('deep/nested/path/file.txt')).toBe(true)
    })

    it('should identify absolute paths in project root', () => {
      const projectFile = path.join(testDir, 'file.txt')
      expect(isFileInProjectRoot(projectFile)).toBe(true)

      const nestedFile = path.join(testDir, 'src', 'nested', 'file.txt')
      expect(isFileInProjectRoot(nestedFile)).toBe(true)
    })

    it('should identify parent directory references as outside', () => {
      expect(isFileInProjectRoot('../file.txt')).toBe(false)
      expect(isFileInProjectRoot('../../file.txt')).toBe(false)
      expect(isFileInProjectRoot('../sibling/file.txt')).toBe(false)
    })

    it('should identify absolute paths outside project', () => {
      expect(isFileInProjectRoot('/etc/passwd')).toBe(false)
      expect(isFileInProjectRoot('/home/user/other-project/file.txt')).toBe(
        false,
      )
      expect(isFileInProjectRoot(path.join(originalCwd, 'file.txt'))).toBe(
        false,
      )
    })

    it('should handle edge cases', () => {
      // Current directory
      expect(isFileInProjectRoot('.')).toBe(true)
      expect(isFileInProjectRoot('./')).toBe(true)

      // Empty path defaults to current directory
      expect(isFileInProjectRoot('')).toBe(true)

      // Paths with dots
      expect(isFileInProjectRoot('./src/../file.txt')).toBe(true)
      expect(isFileInProjectRoot('./src/../../file.txt')).toBe(false)
    })

    it('should handle paths with spaces and special characters', () => {
      expect(isFileInProjectRoot('file with spaces.txt')).toBe(true)
      expect(isFileInProjectRoot('./path with spaces/file.txt')).toBe(true)
      expect(isFileInProjectRoot('special-chars_$@!#.txt')).toBe(true)
    })

    it('should normalize paths correctly', () => {
      // Multiple slashes
      expect(isFileInProjectRoot('./src//nested///file.txt')).toBe(true)

      // Backslashes (Windows style)
      expect(isFileInProjectRoot('src\\file.txt')).toBe(true)

      // Mixed separators
      expect(isFileInProjectRoot('src\\nested/file.txt')).toBe(true)
    })

    it('should handle symbolic links correctly', () => {
      // Create a file inside the project
      const insideFile = path.join(testDir, 'inside.txt')
      fs.writeFileSync(insideFile, 'test')

      // Create a file outside the project
      const outsideDir = fs.mkdtempSync(path.join(os.tmpdir(), 'outside-'))
      const outsideFile = path.join(outsideDir, 'outside.txt')
      fs.writeFileSync(outsideFile, 'test')

      try {
        // Create symlinks
        const insideLink = path.join(testDir, 'inside-link.txt')
        const outsideLink = path.join(testDir, 'outside-link.txt')

        fs.symlinkSync(insideFile, insideLink)
        fs.symlinkSync(outsideFile, outsideLink)

        // Symlink to file in project root should be considered in project root
        expect(isFileInProjectRoot(insideLink)).toBe(true)

        // Symlink to outside file (but link itself is in project root) should be considered in project root
        expect(isFileInProjectRoot(outsideLink)).toBe(true)
      } finally {
        fs.rmSync(outsideDir, { recursive: true, force: true })
      }
    })

    it('should handle root directory edge case', () => {
      // If we're somehow in root directory
      const savedCwd = process.cwd()
      try {
        if (process.platform !== 'win32') {
          process.chdir('/')
          expect(isFileInProjectRoot('etc/passwd')).toBe(true)
          expect(isFileInProjectRoot('/etc/passwd')).toBe(true)
        }
      } finally {
        process.chdir(savedCwd)
      }
    })
  })
})
