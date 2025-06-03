import * as fs from 'fs'
import * as readline from 'readline'

export async function askYesNo(
  question: string,
  defaultNo: boolean = true,
  stdin?: NodeJS.ReadableStream,
  stdout?: NodeJS.WritableStream,
): Promise<boolean> {
  const prompt = defaultNo
    ? `\x1b[33m${question} (y/N): \x1b[0m`
    : `\x1b[33m${question} (Y/n): \x1b[0m`

  const input = stdin || process.stdin
  const output = stdout || process.stdout

  output.write(prompt)

  if (!input.isTTY) {
    let ttyInput: NodeJS.ReadableStream = input
    let tty: fs.ReadStream | undefined

    try {
      if (
        !process.env.NODE_ENV?.includes('test') &&
        fs.existsSync('/dev/tty')
      ) {
        tty = fs.createReadStream('/dev/tty', { flags: 'r' })

        const openTimeout = setTimeout(() => {
          if (tty) {
            tty.destroy()
            tty = undefined
          }
        }, 1000)

        try {
          await new Promise<void>((resolve, reject) => {
            tty!.once('error', err => {
              clearTimeout(openTimeout)
              reject(err)
            })
            tty!.once('open', () => {
              clearTimeout(openTimeout)
              resolve()
            })
          })
          ttyInput = tty
        } catch (err) {
          clearTimeout(openTimeout)
          if (tty) {
            tty.destroy()
          }
          return !defaultNo
        }
      }
    } catch (error) {
      if (tty) {
        tty.destroy()
      }
      return !defaultNo
    }

    const rl = readline.createInterface({
      input: ttyInput,
      output,
      terminal: false,
    })

    return new Promise(resolve => {
      const questionTimeout = setTimeout(() => {
        rl.close()
        if (tty) {
          tty.destroy()
        }
        resolve(!defaultNo)
      }, 30000)

      rl.question('', answer => {
        clearTimeout(questionTimeout)
        rl.close()
        if (tty) {
          tty.destroy()
        }

        const normalizedAnswer = answer.trim().toLowerCase()

        if (normalizedAnswer === '') {
          resolve(!defaultNo)
        } else {
          resolve(normalizedAnswer === 'y' || normalizedAnswer === 'yes')
        }
      })

      rl.on('SIGINT', () => {
        clearTimeout(questionTimeout)
        rl.close()
        if (tty) {
          tty.destroy()
        }
        process.exit(130)
      })
    })
  } else {
    if ('setRawMode' in input && typeof input.setRawMode === 'function') {
      input.setRawMode(true)
    }

    return new Promise(resolve => {
      const onKeypress = (chunk: Buffer) => {
        const key = chunk.toString().toLowerCase()

        if (key === 'y') {
          output.write('y\n')
          cleanup()
          resolve(true)
        } else if (key === 'n') {
          output.write('n\n')
          cleanup()
          resolve(false)
        } else if (key === '\r' || key === '\n') {
          output.write(defaultNo ? 'n' : 'y')
          output.write('\n')
          cleanup()
          resolve(!defaultNo)
        } else if (key === '\u0003') {
          output.write('\n')
          cleanup()
          process.exit(130)
        }
      }

      const cleanup = () => {
        input.removeListener('data', onKeypress)
        if ('setRawMode' in input && typeof input.setRawMode === 'function') {
          input.setRawMode(false)
        }
        if (input.isPaused && 'resume' in input) {
          input.resume()
        }
      }

      input.on('data', onKeypress)
    })
  }
}
