import { describe, it, expect } from 'vitest'
import picomatch from 'picomatch'

describe('Glob Pattern Matching with picomatch', () => {
  function matchesGlobPattern(filePath: string, pattern: string): boolean {
    const isMatch = picomatch(pattern)
    return isMatch(filePath)
  }

  describe('Single asterisk patterns', () => {
    it('should match files with any name in a directory', () => {
      const pattern = 'src/*.js'

      expect(matchesGlobPattern('src/index.js', pattern)).toBe(true)
      expect(matchesGlobPattern('src/utils.js', pattern)).toBe(true)
      expect(matchesGlobPattern('src/test.js', pattern)).toBe(true)

      // Should not match subdirectories
      expect(matchesGlobPattern('src/utils/helper.js', pattern)).toBe(false)
      expect(matchesGlobPattern('src/components/button.js', pattern)).toBe(
        false,
      )

      // Should not match different extensions
      expect(matchesGlobPattern('src/index.ts', pattern)).toBe(false)
      expect(matchesGlobPattern('src/style.css', pattern)).toBe(false)
    })

    it('should match any extension', () => {
      const pattern = 'src/index.*'

      expect(matchesGlobPattern('src/index.js', pattern)).toBe(true)
      expect(matchesGlobPattern('src/index.ts', pattern)).toBe(true)
      expect(matchesGlobPattern('src/index.jsx', pattern)).toBe(true)
      expect(matchesGlobPattern('src/index.test.js', pattern)).toBe(true)
    })

    it('should match patterns with multiple asterisks', () => {
      const pattern = '*.test.*'

      expect(matchesGlobPattern('example.test.js', pattern)).toBe(true)
      expect(matchesGlobPattern('utils.test.ts', pattern)).toBe(true)
      expect(matchesGlobPattern('component.test.tsx', pattern)).toBe(true)

      expect(matchesGlobPattern('src/example.test.js', pattern)).toBe(false)
      expect(matchesGlobPattern('example.js', pattern)).toBe(false)
    })
  })

  describe('Double asterisk (globstar) patterns', () => {
    it('should match any number of directories', () => {
      const pattern = '**/test.js'

      expect(matchesGlobPattern('test.js', pattern)).toBe(true)
      expect(matchesGlobPattern('src/test.js', pattern)).toBe(true)
      expect(matchesGlobPattern('src/utils/test.js', pattern)).toBe(true)
      expect(matchesGlobPattern('src/components/button/test.js', pattern)).toBe(
        true,
      )

      expect(matchesGlobPattern('test.ts', pattern)).toBe(false)
      expect(matchesGlobPattern('src/test-file.js', pattern)).toBe(false)
    })

    it('should match patterns with globstar in the middle', () => {
      const pattern = 'src/**/test.js'

      expect(matchesGlobPattern('src/test.js', pattern)).toBe(true)
      expect(matchesGlobPattern('src/utils/test.js', pattern)).toBe(true)
      expect(matchesGlobPattern('src/a/b/c/test.js', pattern)).toBe(true)

      expect(matchesGlobPattern('test.js', pattern)).toBe(false)
      expect(matchesGlobPattern('lib/test.js', pattern)).toBe(false)
    })

    it('should match patterns with globstar at the end', () => {
      const pattern = 'src/**'

      expect(matchesGlobPattern('src/index.js', pattern)).toBe(true)
      expect(matchesGlobPattern('src/utils/helper.ts', pattern)).toBe(true)
      expect(matchesGlobPattern('src/a/b/c/d.txt', pattern)).toBe(true)

      expect(matchesGlobPattern('src', pattern)).toBe(true)
      expect(matchesGlobPattern('lib/index.js', pattern)).toBe(false)
    })

    it('should handle multiple globstars', () => {
      const pattern = '**/node_modules/**'

      expect(matchesGlobPattern('node_modules/package/index.js', pattern)).toBe(
        true,
      )
      expect(matchesGlobPattern('src/node_modules/lib/test.js', pattern)).toBe(
        true,
      )
      expect(matchesGlobPattern('a/b/node_modules/c/d/e.js', pattern)).toBe(
        true,
      )

      expect(matchesGlobPattern('src/index.js', pattern)).toBe(false)
      expect(matchesGlobPattern('node_module/test.js', pattern)).toBe(false)
    })
  })

  describe('Complex patterns', () => {
    it('should match TypeScript test files', () => {
      const pattern = '**/*.test.ts'

      expect(matchesGlobPattern('example.test.ts', pattern)).toBe(true)
      expect(matchesGlobPattern('src/utils.test.ts', pattern)).toBe(true)
      expect(matchesGlobPattern('test/unit/component.test.ts', pattern)).toBe(
        true,
      )

      expect(matchesGlobPattern('example.test.js', pattern)).toBe(false)
      expect(matchesGlobPattern('example.spec.ts', pattern)).toBe(false)
      expect(matchesGlobPattern('src/utils.ts', pattern)).toBe(false)
    })

    it('should match multiple extension patterns with brace expansion', () => {
      const pattern = '**/*.{ts,tsx}'

      expect(matchesGlobPattern('src/index.ts', pattern)).toBe(true)
      expect(matchesGlobPattern('src/component.tsx', pattern)).toBe(true)
      expect(matchesGlobPattern('test/example.ts', pattern)).toBe(true)
      expect(matchesGlobPattern('lib/util.tsx', pattern)).toBe(true)

      expect(matchesGlobPattern('src/index.js', pattern)).toBe(false)
      expect(matchesGlobPattern('src/index.jsx', pattern)).toBe(false)
    })
  })

  describe('Absolute path patterns', () => {
    it('should match absolute paths', () => {
      const pattern = '/tmp/**'

      expect(matchesGlobPattern('/tmp/file.txt', pattern)).toBe(true)
      expect(matchesGlobPattern('/tmp/dir/file.txt', pattern)).toBe(true)
      expect(matchesGlobPattern('/tmp/a/b/c/file.txt', pattern)).toBe(true)

      expect(matchesGlobPattern('/var/tmp/file.txt', pattern)).toBe(false)
      expect(matchesGlobPattern('tmp/file.txt', pattern)).toBe(false)
    })

    it('should match specific absolute paths', () => {
      const pattern = '/home/user/projects/*.js'

      expect(matchesGlobPattern('/home/user/projects/index.js', pattern)).toBe(
        true,
      )
      expect(matchesGlobPattern('/home/user/projects/app.js', pattern)).toBe(
        true,
      )

      expect(
        matchesGlobPattern('/home/user/projects/src/index.js', pattern),
      ).toBe(false)
      expect(matchesGlobPattern('/home/user/index.js', pattern)).toBe(false)
    })
  })

  describe('Edge cases', () => {
    it('should handle dots in filenames', () => {
      const pattern = '**/.*.js'

      expect(matchesGlobPattern('.eslintrc.js', pattern)).toBe(true)
      expect(matchesGlobPattern('src/.babelrc.js', pattern)).toBe(true)
      expect(matchesGlobPattern('config/.prettierrc.js', pattern)).toBe(true)

      expect(matchesGlobPattern('eslintrc.js', pattern)).toBe(false)
      expect(matchesGlobPattern('src/index.js', pattern)).toBe(false)
    })

    it('should handle special characters in patterns', () => {
      const pattern = 'src/[test]/*.js'

      expect(matchesGlobPattern('src/t/file.js', pattern)).toBe(true)
      expect(matchesGlobPattern('src/e/file.js', pattern)).toBe(true)
      expect(matchesGlobPattern('src/s/file.js', pattern)).toBe(true)
      expect(matchesGlobPattern('src/test/file.js', pattern)).toBe(false)
      expect(matchesGlobPattern('src/[test]/file.js', pattern)).toBe(true)
    })

    it('should handle empty paths', () => {
      const pattern = '**/*.js'

      expect(matchesGlobPattern('', pattern)).toBe(false)
    })
  })
})
