import { PatternConfig } from './pattern-matcher'

export const patterns: PatternConfig[] = [
  {
    id: 'edit-file-prompt',
    response: '1',
    pattern: [
      'Edit file',
      // '{{ editDiff | multiline }}',
      'Do you want to make this edit to {{ fileName }}?',
      '❯ 1. Yes',
      "2. Yes, and don't ask again this session (shift+tab)",
      '3. No, and tell Claude what to do differently (esc)',
    ],
  },
  {
    id: 'create-file-prompt',
    response: '1',
    pattern: [
      'Create file',
      'Do you want to create {{ fileName }}?',
      '❯ 1. Yes',
      "2. Yes, and don't ask again this session (shift+tab)",
      '3. No, and tell Claude what to do differently (esc)',
    ],
  },
  {
    id: 'bash-command-prompt',
    response: '1',
    pattern: [
      'Bash command',
      // '{{ command }}',
      // '{{ description }}',
      'Do you want to proceed?',
      '❯ 1. Yes',
      "2. Yes, and don't ask again for",
      '3. No, and tell Claude what to do differently (esc)',
    ],
  },
  {
    id: 'read-files-prompt',
    response: '1',
    pattern: [
      'Read files',
      'Read({{ fileName }})',
      'Do you want to proceed?',
      '❯ 1. Yes',
      '2. No, and tell Claude what to do differently (esc)',
    ],
  },
]
