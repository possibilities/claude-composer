import { PatternConfig } from './src/patterns/matcher'
import { execSync } from 'child_process'

export const patterns: PatternConfig[] = [
  {
    id: 'add-tree',
    title: 'Add tree',
    response: () => {
      const treeOutput = execSync('tree --gitignore', {
        encoding: 'utf8',
      }).trim()
      return [
        '\n',
        `<ProjectTree>`,
        `\n`,
        `▶ tree --gitignore`,
        `\n`,
        treeOutput,
        `\n</ProjectTree>\n`,
      ]
    },
    pattern: ['~~tree~~ \x1b[7m \x1b[0m'],
  },
  {
    id: 'edit-file-prompt',
    title: 'Edit file',
    response: '1',
    pattern: [
      'Edit file',
      '{{ editDiff | multiline }}',
      'Do you want to make this edit to {{ fileName }}?',
      '❯ 1. Yes',
      "2. Yes, and don't ask again this session (shift+tab)",
      '3. No, and tell Claude what to do differently (esc)',
    ],
  },
  {
    id: 'create-file-prompt',
    title: 'Create file',
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
    title: 'Bash command',
    response: '1',
    pattern: [
      'Bash command',
      // '{{ command }}',
      // '{{ description }}',
      'Do you want to proceed?',
      '❯ 1. Yes',
      'No, and tell Claude what to do differently (esc)',
    ],
  },
  {
    id: 'read-files-prompt',
    title: 'Read files',
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
