import { PatternConfig } from '../pattern-matcher'

export const patterns: PatternConfig[] = [
  {
    id: 'test-welcome',
    response: 'Test response\n',
    pattern: ['TEST_PATTERN_TRIGGER'],
  },
]
