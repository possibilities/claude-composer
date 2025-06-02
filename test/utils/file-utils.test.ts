import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import { isFileInsideProject } from '../../src/utils/file-utils'

describe('File Utils', () => {
  describe('isFileInsideProject', () => {
    const originalCwd = process.cwd()
    let testDir: string

    beforeEach(() => {
      // Create a temporary test directory
      testDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-utils-test-'))
      process.chdir(testDir)
    })

    afterEach(() => {
      process.chdir(originalCwd)
      fs.rmSync(testDir, { recursive: true, force: true })
    })

    it('should identify relative files as inside project', () => {
      expect(isFileInsideProject('file.txt')).toBe(true)
      expect(isFileInsideProject('./file.txt')).toBe(true)
      expect(isFileInsideProject('src/file.txt')).toBe(true)
      expect(isFileInsideProject('./src/file.txt')).toBe(true)
      expect(isFileInsideProject('deep/nested/path/file.txt')).toBe(true)
    })

    it('should identify absolute paths inside project', () => {
      const projectFile = path.join(testDir, 'file.txt')
      expect(isFileInsideProject(projectFile)).toBe(true)

      const nestedFile = path.join(testDir, 'src', 'nested', 'file.txt')
      expect(isFileInsideProject(nestedFile)).toBe(true)
    })

    it('should identify parent directory references as outside', () => {
      expect(isFileInsideProject('../file.txt')).toBe(false)
      expect(isFileInsideProject('../../file.txt')).toBe(false)
      expect(isFileInsideProject('../sibling/file.txt')).toBe(false)
    })

    it('should identify absolute paths outside project', () => {
      expect(isFileInsideProject('/etc/passwd')).toBe(false)
      expect(isFileInsideProject('/home/user/other-project/file.txt')).toBe(
        false,
      )
      expect(isFileInsideProject(path.join(originalCwd, 'file.txt'))).toBe(
        false,
      )
    })

    it('should handle edge cases', () => {
      // Current directory
      expect(isFileInsideProject('.')).toBe(true)
      expect(isFileInsideProject('./')).toBe(true)

      // Empty path defaults to current directory
      expect(isFileInsideProject('')).toBe(true)

      // Paths with dots
      expect(isFileInsideProject('./src/../file.txt')).toBe(true)
      expect(isFileInsideProject('./src/../../file.txt')).toBe(false)
    })

    it('should handle paths with spaces and special characters', () => {
      expect(isFileInsideProject('file with spaces.txt')).toBe(true)
      expect(isFileInsideProject('./path with spaces/file.txt')).toBe(true)
      expect(isFileInsideProject('special-chars_$@!#.txt')).toBe(true)
    })

    it('should normalize paths correctly', () => {
      // Multiple slashes
      expect(isFileInsideProject('./src//nested///file.txt')).toBe(true)

      // Backslashes (Windows style)
      expect(isFileInsideProject('src\\file.txt')).toBe(true)

      // Mixed separators
      expect(isFileInsideProject('src\\nested/file.txt')).toBe(true)
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

        // Symlink to inside file should be considered inside
        expect(isFileInsideProject(insideLink)).toBe(true)

        // Symlink to outside file (but link itself is inside) should be considered inside
        expect(isFileInsideProject(outsideLink)).toBe(true)
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
          expect(isFileInsideProject('etc/passwd')).toBe(true)
          expect(isFileInsideProject('/etc/passwd')).toBe(true)
        }
      } finally {
        process.chdir(savedCwd)
      }
    })
  })
})
