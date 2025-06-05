import * as path from 'path'
import * as os from 'os'

export function isFileInProjectRoot(filePath: string): boolean {
  const projectRoot = process.cwd()
  const absolutePath = path.isAbsolute(filePath)
    ? filePath
    : path.resolve(projectRoot, filePath)
  const relative = path.relative(projectRoot, absolutePath)
  return !relative.startsWith('..') && !path.isAbsolute(relative)
}

export function expandPath(p: string): string {
  // Handle tilde expansion for home directory
  if (p.startsWith('~/')) {
    p = path.join(os.homedir(), p.slice(2))
  } else if (p === '~') {
    p = os.homedir()
  } else if (p.startsWith('~')) {
    // Handle cases like ~username (though not typically supported in Node.js)
    p = path.join(os.homedir(), p.slice(1))
  }

  // Expand environment variables
  p = p.replace(/\$([A-Z_][A-Z0-9_]*)/gi, (match, envVar) => {
    return process.env[envVar] || match
  })

  // Resolve to absolute path
  return path.resolve(p)
}
