import { PatternConfig } from './pattern-matcher'

export const PATTERNS: PatternConfig[] = [
  {
    id: 'example-welcome-to',
    pattern: 'Welcome to',
    action: {
      type: 'input',
      response: 'Claude Composer is ready!\r',
    },
    cooldown: 3000,
    caseSensitive: false,
  },
  {
    id: 'error-logger',
    pattern: /ERROR|FATAL|Failed/i,
    action: {
      type: 'log',
      logFile: '/tmp/claude-composer-errors.json',
    },
    cooldown: 100,
    caseSensitive: false,
  },
]

export const SETTINGS = {
  bufferSize: 2048,
  defaultCooldown: 1000,
}
