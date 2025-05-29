import { PatternConfig } from '../pattern-matcher'

export const PATTERNS: PatternConfig[] = [
  {
    id: 'test-welcome',
    pattern: 'TEST_PATTERN_TRIGGER',
    action: {
      type: 'input',
      response: 'Test response\n',
    },
    cooldown: 100,
    caseSensitive: false,
  },
  {
    id: 'test-log',
    pattern: 'TEST_LOG_TRIGGER',
    action: {
      type: 'log',
      path: '/tmp/test-pattern-match.log',
    },
    cooldown: 100,
    caseSensitive: false,
  },
]

export const SETTINGS = {
  bufferSize: 2048,
  defaultCooldown: 1000,
}
