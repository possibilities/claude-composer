import { PatternConfig } from './pattern-matcher'

export const PATTERNS: PatternConfig[] = [
  {
    id: 'example-welcome-to',
    pattern: 'Welcome to',
    response: 'Claude Composer is ready!\r',
    cooldown: 3000,
    caseSensitive: false,
  },
]

export const SETTINGS = {
  bufferSize: 2048,
  defaultCooldown: 1000,
  logMatches: true,
}
