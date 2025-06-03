import * as fs from 'fs'
import * as path from 'path'
import * as crypto from 'crypto'
import clipboardy from 'clipboardy'
import { CONFIG_PATHS } from '../config/paths'
import { showSnapshotNotification } from '../utils/notifications'
import type { AppConfig } from '../config/schemas'
import type { TerminalSnapshot } from './types'

function ensureLogsDirectory(): void {
  const logsDir = CONFIG_PATHS.getLogsDirectory()
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true })
  }
}

export async function saveTerminalSnapshot(
  terminal: any,
  serializeAddon: any,
  appConfig: AppConfig | undefined,
): Promise<void> {
  if (!appConfig?.allow_buffer_snapshots || !terminal || !serializeAddon) {
    return
  }

  try {
    ensureLogsDirectory()

    const timestamp = new Date().toISOString()
    const timestampForFilename = timestamp.replace(/[:.]/g, '-')
    const filename = `snapshot-${timestampForFilename}.json`
    const logpath = CONFIG_PATHS.getLogsDirectory()
    const filepath = path.join(logpath, filename)

    const terminalContent = serializeAddon.serialize()

    const snapshot: TerminalSnapshot = {
      patternId: 'buffer-snapshot',
      patternTitle: 'Terminal Buffer Snapshot',
      timestamp,
      terminalContent,
      strippedTerminalContent: terminalContent,
      bufferContent: terminalContent,
      strippedBufferContent: terminalContent,
      metadata: {
        cols: terminal.cols,
        rows: terminal.rows,
        scrollback: terminal.scrollback || 0,
        cwd: process.cwd(),
        projectName: path.basename(process.cwd()),
        snapshotType: 'manual-buffer-save',
      },
    }

    fs.writeFileSync(filepath, JSON.stringify(snapshot, null, 2))

    try {
      await clipboardy.write(filepath)
    } catch (clipboardError) {}

    if (appConfig.show_notifications !== false) {
      const projectName = path.basename(process.cwd())
      showSnapshotNotification(projectName, appConfig).catch(err =>
        console.error('Failed to send notification:', err),
      )
    }
  } catch (error) {}
}

export function calculateMd5(filePath: string): string {
  const content = fs.readFileSync(filePath)
  return crypto.createHash('md5').update(content).digest('hex')
}

function copyDirectory(src: string, dest: string): void {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }

  const entries = fs.readdirSync(src, { withFileTypes: true })

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name)
    const destPath = path.join(dest, entry.name)

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath)
    } else {
      fs.copyFileSync(srcPath, destPath)
    }
  }
}

export function getBackupDirectory(): string {
  return CONFIG_PATHS.getBackupsDirectory()
}

export function getBackupDirs(): { dir: string; mtime: number }[] {
  const backupDir = getBackupDirectory()
  if (!fs.existsSync(backupDir)) {
    return []
  }

  return fs
    .readdirSync(backupDir, { withFileTypes: true })
    .filter(entry => entry.isDirectory())
    .map(entry => {
      const dirPath = path.join(backupDir, entry.name)
      const stats = fs.statSync(dirPath)
      return { dir: entry.name, mtime: stats.mtimeMs }
    })
    .sort((a, b) => a.mtime - b.mtime)
}

export function ensureBackupDirectory(): void {
  const backupDir = getBackupDirectory()
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true })
  }
}

export function createBackup(md5: string): void {
  const sourceDir = path.join(process.env.HOME || '', '.claude', 'local')
  const backupDir = path.join(getBackupDirectory(), md5)

  if (fs.existsSync(backupDir)) {
    return
  }

  console.log(`※ Creating backup of current claude app`)

  const existingBackups = getBackupDirs()
  if (existingBackups.length >= 5) {
    const oldestBackup = existingBackups[0]
    const oldestBackupPath = path.join(getBackupDirectory(), oldestBackup.dir)
    console.log(`※ Removing oldest backup: ${oldestBackup.dir}`)
    fs.rmSync(oldestBackupPath, { recursive: true, force: true })
  }

  copyDirectory(sourceDir, backupDir)
  console.log(`※ Backup created successfully`)
}
