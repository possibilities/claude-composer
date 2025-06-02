import * as path from 'path'

export function isFileInProjectRoot(filePath: string): boolean {
  const projectRoot = process.cwd()
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(projectRoot, filePath)
  const relative = path.relative(projectRoot, absolutePath)
  return !relative.startsWith('..') && !path.isAbsolute(relative)
}
