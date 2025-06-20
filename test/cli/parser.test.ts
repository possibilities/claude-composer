import { describe, it, expect } from 'vitest'
import { createClaudeComposerCommand } from '../../src/cli/parser'

describe('CLI Parser', () => {
  describe('--mode flag', () => {
    it('should parse --mode act', () => {
      const program = createClaudeComposerCommand()
      program.parse(['node', 'claude-composer', '--mode', 'act'], {
        from: 'user',
      })
      const opts = program.opts()
      expect(opts.mode).toBe('act')
    })

    it('should parse --mode plan', () => {
      const program = createClaudeComposerCommand()
      program.parse(['node', 'claude-composer', '--mode', 'plan'], {
        from: 'user',
      })
      const opts = program.opts()
      expect(opts.mode).toBe('plan')
    })

    it('should parse mode flag with other options', () => {
      const program = createClaudeComposerCommand()
      program.parse(
        [
          'node',
          'claude-composer',
          '--quiet',
          '--mode',
          'plan',
          '--ignore-global-config',
        ],
        { from: 'user' },
      )
      const opts = program.opts()
      expect(opts.mode).toBe('plan')
      expect(opts.quiet).toBe(true)
      expect(opts.ignoreGlobalConfig).toBe(true)
    })

    it('should handle mode flag with equals syntax', () => {
      const program = createClaudeComposerCommand()
      program.parse(['node', 'claude-composer', '--mode=plan'], {
        from: 'user',
      })
      const opts = program.opts()
      expect(opts.mode).toBe('plan')
    })

    it('should leave mode undefined when not specified', () => {
      const program = createClaudeComposerCommand()
      program.parse(['node', 'claude-composer', '--quiet'], { from: 'user' })
      const opts = program.opts()
      expect(opts.mode).toBeUndefined()
    })

    it('should parse mode with child command', () => {
      const program = createClaudeComposerCommand()
      program.parse(['node', 'claude-composer', '--mode', 'plan', 'chat'], {
        from: 'user',
      })
      const opts = program.opts()
      expect(opts.mode).toBe('plan')
      expect(program.args).toEqual(['node', 'claude-composer', 'chat'])
    })
  })

  describe('other CLI options', () => {
    it('should parse all notification-related flags', () => {
      const program = createClaudeComposerCommand()
      program.parse(
        [
          'node',
          'claude-composer',
          '--show-notifications',
          '--sticky-notifications',
        ],
        { from: 'user' },
      )
      const opts = program.opts()
      expect(opts.showNotifications).toBe(true)
      expect(opts.stickyNotifications).toBe(true)
    })

    it('should parse safety-related flags', () => {
      const program = createClaudeComposerCommand()
      program.parse(
        [
          'node',
          'claude-composer',
          '--dangerously-allow-in-dirty-directory',
          '--dangerously-allow-without-version-control',
        ],
        { from: 'user' },
      )
      const opts = program.opts()
      expect(opts.dangerouslyAllowInDirtyDirectory).toBe(true)
      expect(opts.dangerouslyAllowWithoutVersionControl).toBe(true)
    })

    it('should parse toolset and yolo flags', () => {
      const program = createClaudeComposerCommand()
      program.parse(
        ['node', 'claude-composer', '--toolset', 'custom-tools', '--yolo'],
        { from: 'user' },
      )
      const opts = program.opts()
      expect(opts.toolset).toEqual(['custom-tools'])
      expect(opts.yolo).toBe(true)
    })

    it('should parse --output-formatter flag', () => {
      const program = createClaudeComposerCommand()
      program.parse(['node', 'claude-composer', '--output-formatter', 'jq'], {
        from: 'user',
      })
      const opts = program.opts()
      expect(opts.outputFormatter).toBe('jq')
    })

    it('should parse --no-output-formatter', () => {
      const program = createClaudeComposerCommand()
      program.parse(['node', 'claude-composer', '--no-output-formatter'], {
        from: 'user',
      })
      const opts = program.opts()
      expect(opts.outputFormatter).toBe(false)
    })
  })
})
