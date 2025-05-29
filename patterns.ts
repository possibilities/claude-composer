import { PatternConfig } from './pattern-matcher'

export const PATTERNS: PatternConfig[] = [
  {
    id: 'edit-file-prompt',
    pattern: 'Do you want to make this edit to',
    action: {
      type: 'log',
      path: '/tmp/claude-edit-file-prompt.json',
    },
    cooldown: 100,
    caseSensitive: false,
  },
  {
    id: 'create-file-prompt',
    pattern: 'Do you want to create',
    action: {
      type: 'log',
      path: '/tmp/claude-create-file-prompt.json',
    },
    cooldown: 100,
    caseSensitive: false,
  },
  {
    id: 'bash-command-prompt',
    pattern: 'Do you want to run this command',
    action: {
      type: 'log',
      path: '/tmp/claude-bash-command.json',
    },
    cooldown: 100,
    caseSensitive: false,
  },
]

export const SETTINGS = {
  bufferSize: 2048,
  defaultCooldown: 1000,
}
