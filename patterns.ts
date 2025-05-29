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
]

export const SETTINGS = {
  bufferSize: 2048,
  defaultCooldown: 1000,
}
