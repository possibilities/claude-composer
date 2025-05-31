let quietMode = false

export function setQuietMode(quiet: boolean) {
  quietMode = quiet
}

export function log(message: string) {
  if (!quietMode) {
    console.info(`\x1b[36m${message}\x1b[0m`)
  }
}

export function warn(message: string) {
  if (!quietMode) {
    console.warn(`\x1b[33m${message}\x1b[0m`)
  }
}

export function clearScreen() {
  // Cross-platform screen clearing
  if (process.platform === 'win32') {
    // Windows: Use ANSI escape sequence if supported, otherwise fallback
    process.stdout.write('\x1b[2J\x1b[3J\x1b[H')
  } else {
    // Unix/Linux/macOS: Use ANSI escape sequences
    process.stdout.write('\x1b[2J\x1b[3J\x1b[H')
  }
}
