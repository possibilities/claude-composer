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
        tty = fs.createReadStream('/dev/tty')
        await new Promise((resolve, reject) => {
          tty!.once('error', reject)
          tty!.once('open', resolve)
        })
        ttyInput = tty
      }
    } catch (error) {
      if (tty) {
        tty.close()
      }
    }

    const rl = readline.createInterface({
      input: ttyInput,
      output,
    })

    return new Promise(resolve => {
      rl.question('', answer => {
        rl.close()
        if (tty) {
          tty.close()
        }

        const normalizedAnswer = answer.trim().toLowerCase()

        if (normalizedAnswer === '') {
          resolve(!defaultNo)
        } else {
          resolve(normalizedAnswer === 'y' || normalizedAnswer === 'yes')
        }
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
