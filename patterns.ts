import { PatternConfig } from './pattern-matcher'

export const PATTERNS: PatternConfig[] = [
  {
    id: 'welcome-log',
    pattern: 'Welcome to',
    action: {
      type: 'log',
      path: '/tmp/claude-welcome-to.json',
    },
    cooldown: 100,
    caseSensitive: false,
  },
]

export const SETTINGS = {
  bufferSize: 2048,
  defaultCooldown: 1000,
}
