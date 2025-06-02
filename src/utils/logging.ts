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
  if (process.platform === 'win32') {
    process.stdout.write('\x1b[2J\x1b[3J\x1b[H')
  } else {
    process.stdout.write('\x1b[2J\x1b[3J\x1b[H')
  }
}
