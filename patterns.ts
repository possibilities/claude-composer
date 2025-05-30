import { PatternConfig } from './pattern-matcher'

const editFilePattern = [
  'Edit file',
  'Do you want to make this edit to',
  '❯ 1. Yes',
  "2. Yes, and don't ask again this session (shift+tab)",
  '3. No, and tell Claude what to do differently (esc)',
]

const createFilePattern = [
  'Create file',
  'Do you want to create',
  '❯ 1. Yes',
  "2. Yes, and don't ask again this session (shift+tab)",
  '3. No, and tell Claude what to do differently (esc)',
]

const bashCommandPattern = [
  'Bash command',
  'Do you want to proceed?',
  '❯ 1. Yes',
  "2. Yes, and don't ask again for",
  '3. No, and tell Claude what to do differently (esc)',
]

export const PATTERNS: PatternConfig[] = [
  {
    id: 'edit-file-prompt',
    pattern: editFilePattern,
    action: {
      type: 'input',
      response: '1',
    },
  },
  {
    id: 'create-file-prompt',
    pattern: createFilePattern,
    action: {
      type: 'input',
      response: '1',
    },
  },
  {
    id: 'bash-command-prompt',
    pattern: bashCommandPattern,
    action: {
      type: 'input',
      response: '1',
    },
  },
]

export const SETTINGS = {
  bufferSize: 131072,
  duplicatePreventionWindowMs: 5000, // 5 second window to prevent duplicate responses for identical text
}
