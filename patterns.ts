import { PatternConfig } from './pattern-matcher'

export const PATTERNS: PatternConfig[] = [
  {
    id: 'edit-file-prompt',
    pattern: 'Do you want to make this edit to',
    action: {
      type: 'input',
      response: '1',
    },
    cooldown: 100,
    caseSensitive: false,
  },
  {
    id: 'create-file-prompt',
    pattern: 'Do you want to create',
    action: {
      type: 'input',
      response: '1',
    },
    cooldown: 100,
    caseSensitive: false,
  },
  {
    id: 'bash-command-prompt',
    pattern: 'Do you want to run this command',
    action: {
      type: 'input',
      response: '1',
    },
    cooldown: 100,
    caseSensitive: false,
  },
  {
    id: 'edit-file-log',
    pattern: 'Do you want to make this edit to',
    action: {
      type: 'log',
      path: '/tmp/claude-edit-file-prompts.log',
    },
    cooldown: 100,
    caseSensitive: false,
  },
  {
    id: 'create-file-log',
    pattern: 'Do you want to create',
    action: {
      type: 'log',
      path: '/tmp/claude-create-file-prompts.log',
    },
    cooldown: 100,
    caseSensitive: false,
  },
  {
    id: 'bash-command-log',
    pattern: 'Do you want to run this command',
    action: {
      type: 'log',
      path: '/tmp/claude-bash-command-prompts.log',
    },
    cooldown: 100,
    caseSensitive: false,
  },
]

export const SETTINGS = {
  bufferSize: 2048,
  defaultCooldown: 1000,
}
