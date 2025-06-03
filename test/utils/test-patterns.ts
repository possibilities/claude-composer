import { PatternConfig } from '../../src/patterns/matcher'

export const patterns: PatternConfig[] = [
  {
    id: 'test-welcome',
    title: 'Test Welcome Pattern',
    type: 'confirmation' as const,
    response: 'Test response\n',
    pattern: ['TEST_PATTERN_TRIGGER'],
    triggerText: 'TEST_PATTERN_TRIGGER',
  },
]
