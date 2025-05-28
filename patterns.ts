import { PatternConfig } from './pattern-matcher'

export const PATTERNS: PatternConfig[] = [
  {
    id: 'example-confirm',
    pattern: 'Do you want to continue? (y/n)',
    response: 'y\r',
    delay: 500,
    cooldown: 2000,
    caseSensitive: false,
  },
  {
    id: 'example-enter-to-continue',
    pattern: 'Press Enter to continue',
    response: '\r',
    delay: 1000,
    cooldown: 3000,
    caseSensitive: false,
  },
]

export const SETTINGS = {
  bufferSize: 2048,
  defaultCooldown: 1000,
  logMatches: false,
}
