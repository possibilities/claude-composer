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
  {
    id: 'edit-file-log',
    pattern: editFilePattern,
    action: {
      type: 'log',
      path: '/tmp/claude-edit-file-prompts.log',
    },
  },
  {
    id: 'create-file-log',
    pattern: createFilePattern,
    action: {
      type: 'log',
      path: '/tmp/claude-create-file-prompts.log',
    },
  },
  {
    id: 'bash-command-log',
    pattern: bashCommandPattern,
    action: {
      type: 'log',
      path: '/tmp/claude-bash-command-prompts.log',
    },
  },
]

export const SETTINGS = {
  bufferSize: 131072,
}
