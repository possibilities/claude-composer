export function log(message: string) {
  console.info(`\x1b[36m${message}\x1b[0m`)
}

export function warn(message: string) {
  console.warn(`\x1b[33m${message}\x1b[0m`)
}
