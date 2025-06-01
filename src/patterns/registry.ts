import { PatternConfig } from './matcher'
import { execSync } from 'child_process'

function followedByCursor(str: string): string {
  return `${str}\x1b[7m \x1b[0m`
}

const backspaceKey = '\x7f'

function pressKeyNTimes(key: string, n: number): string[] {
  return Array(n).fill(key).flat()
}

function buildTriggerPattern(
  tag: string,
  trigger: string,
  command: string,
): PatternConfig {
  return {
    response: () => [
      ...pressKeyNTimes(backspaceKey, trigger.length),
      `<${tag}>\n▶ ${command}${execSync(command, {
        encoding: 'utf8',
      }).trim()}\n<\/${tag}>\n`,
    ],
    pattern: [followedByCursor(trigger)],
    selfClearing: true,
  }
}

export const patterns: PatternConfig[] = [
  {
    id: 'add-tree-trigger',
    title: 'Add tree',
    ...buildTriggerPattern('ProjectTree', '~tree ', 'tree --gitignore'),
  },
  {
    id: 'add-changes-trigger',
    title: 'Add changes',
    ...buildTriggerPattern('ProjectChanges', '~changes ', 'git diff HEAD'),
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
